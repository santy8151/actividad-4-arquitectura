import type { Config, Context } from "@netlify/functions";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders } from "../../db/schema.js";
import { forbidden, getSessionUser, json, unauthorized } from "../../server/auth.js";

const TRANSITIONS: Record<string, string[]> = {
  assigned: ["in_transit"],
  in_transit: ["delivered", "failed"],
};

export default async (req: Request, context: Context) => {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  if (user.role !== "courier") return forbidden();

  if (req.method === "GET") {
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.courierId, user.id))
      .orderBy(sql`CASE ${orders.status} WHEN 'in_transit' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END`, desc(orders.createdAt));
    return json({ orders: rows });
  }

  if (req.method === "PATCH" && context.params.id) {
    const id = Number(context.params.id);
    const { status, notes } = await req.json().catch(() => ({}));
    const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.courierId, user.id)));
    if (!order) return json({ error: "Pedido no encontrado" }, 404);
    if (!TRANSITIONS[order.status]?.includes(status)) {
      return json({ error: `No se puede pasar de "${order.status}" a "${status}"` }, 409);
    }
    const [updated] = await db
      .update(orders)
      .set({
        status,
        deliveredAt: status === "delivered" ? new Date() : order.deliveredAt,
        notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : order.notes,
      })
      .where(and(eq(orders.id, id), eq(orders.status, order.status)))
      .returning();
    if (!updated) return json({ error: "El pedido cambió mientras se actualizaba" }, 409);
    return json({ order: updated });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/courier/orders", "/api/courier/orders/:id"],
};
