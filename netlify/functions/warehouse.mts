import type { Config, Context } from "@netlify/functions";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { inventory, orders, users, warehouses } from "../../db/schema.js";
import { forbidden, getSessionUser, json, unauthorized } from "../../server/auth.js";

export default async (req: Request, context: Context) => {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  if (user.role !== "warehouse") return forbidden();
  const path = new URL(req.url).pathname;
  const wid = user.warehouseId;

  if (req.method === "GET" && path.endsWith("/overview")) {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, wid));
    const orderRows = await db
      .select({
        id: orders.id,
        code: orders.code,
        customerName: orders.customerName,
        address: orders.address,
        items: orders.items,
        weightKg: orders.weightKg,
        priority: orders.priority,
        status: orders.status,
        notes: orders.notes,
        createdAt: orders.createdAt,
        deliveredAt: orders.deliveredAt,
        courierId: orders.courierId,
        courierName: users.name,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.courierId))
      .where(eq(orders.warehouseId, wid))
      .orderBy(desc(orders.createdAt));
    const couriers = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        vehicle: users.vehicle,
        active: sql<number>`(SELECT COUNT(*) FROM orders o WHERE o.courier_id = ${users.id} AND o.status IN ('assigned','in_transit'))`.mapWith(Number),
      })
      .from(users)
      .where(and(eq(users.warehouseId, wid), eq(users.role, "courier")));
    const stock = await db.select().from(inventory).where(eq(inventory.warehouseId, wid)).orderBy(inventory.sku);
    return json({ warehouse, orders: orderRows, couriers, inventory: stock });
  }

  if (req.method === "POST" && path.endsWith("/orders")) {
    const b = await req.json().catch(() => ({}));
    const customerName = String(b.customerName ?? "").trim();
    const address = String(b.address ?? "").trim();
    const items = String(b.items ?? "").trim();
    if (!customerName || !address || !items) return json({ error: "Cliente, dirección y productos son obligatorios" }, 400);
    const [{ next }] = await db.select({ next: sql<number>`COALESCE(MAX(id), 0) + 1001`.mapWith(Number) }).from(orders);
    const [created] = await db
      .insert(orders)
      .values({
        code: `${user.warehouseCode}-${next}`,
        warehouseId: wid,
        customerName,
        customerPhone: String(b.customerPhone ?? "").trim() || null,
        address,
        items,
        weightKg: String(Math.max(0.1, Number(b.weightKg) || 1)),
        priority: ["normal", "alta", "urgente"].includes(b.priority) ? b.priority : "normal",
        notes: String(b.notes ?? "").trim() || null,
      })
      .returning();
    return json({ order: created }, 201);
  }

  // Asignación: solo un pedido pendiente puede recibir repartidor, y solo uno del mismo nodo.
  if (req.method === "POST" && path.endsWith("/assign") && context.params.id) {
    const id = Number(context.params.id);
    const { courierId } = await req.json().catch(() => ({}));
    const [courier] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, Number(courierId)), eq(users.role, "courier"), eq(users.warehouseId, wid)));
    if (!courier) return json({ error: "Repartidor no válido para este nodo" }, 400);
    const [updated] = await db
      .update(orders)
      .set({ courierId: courier.id, status: "assigned", assignedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.warehouseId, wid), eq(orders.status, "pending")))
      .returning();
    if (!updated) return json({ error: "El pedido ya tiene repartidor o no existe" }, 409);
    return json({ order: updated });
  }

  if (req.method === "PATCH" && context.params.id && path.includes("/inventory/")) {
    const { quantity } = await req.json().catch(() => ({}));
    const q = Math.floor(Number(quantity));
    if (!Number.isFinite(q) || q < 0) return json({ error: "Cantidad inválida" }, 400);
    const [updated] = await db
      .update(inventory)
      .set({ quantity: q, updatedAt: new Date() })
      .where(and(eq(inventory.id, Number(context.params.id)), eq(inventory.warehouseId, wid)))
      .returning();
    return updated ? json({ item: updated }) : json({ error: "Producto no encontrado" }, 404);
  }

  if (req.method === "GET" && path.endsWith("/network")) {
    const nodes = await db.select().from(warehouses).orderBy(warehouses.id);
    const stats = await db
      .select({
        warehouseId: orders.warehouseId,
        open: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} IN ('pending','assigned','in_transit'))`.mapWith(Number),
      })
      .from(orders)
      .where(inArray(orders.warehouseId, nodes.map((n) => n.id)))
      .groupBy(orders.warehouseId);
    return json({ nodes: nodes.map((n) => ({ ...n, open: stats.find((s) => s.warehouseId === n.id)?.open ?? 0 })) });
  }

  return json({ error: "Ruta no encontrada" }, 404);
};

export const config: Config = {
  path: [
    "/api/warehouse/overview",
    "/api/warehouse/network",
    "/api/warehouse/orders",
    "/api/warehouse/orders/:id/assign",
    "/api/warehouse/inventory/:id",
  ],
};
