import type { Config } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { inventory, orders, users, warehouses } from "../../db/schema.js";
import { forbidden, getSessionUser, json, unauthorized } from "../../server/auth.js";

const minutes = sql<number>`ROUND(AVG(EXTRACT(EPOCH FROM (${orders.deliveredAt} - ${orders.assignedAt})) / 60) FILTER (WHERE ${orders.status} = 'delivered'))`.mapWith(Number);
const count = (status: string) => sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = ${status})`.mapWith(Number);

async function computeMetrics(warehouseId: number) {
  const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, warehouseId));

  const [totals] = await db
    .select({
      total: sql<number>`COUNT(*)`.mapWith(Number),
      pending: count("pending"),
      assigned: count("assigned"),
      inTransit: count("in_transit"),
      delivered: count("delivered"),
      failed: count("failed"),
      urgentOpen: sql<number>`COUNT(*) FILTER (WHERE ${orders.priority} = 'urgente' AND ${orders.status} IN ('pending','assigned','in_transit'))`.mapWith(Number),
      avgDeliveryMinutes: minutes,
      totalKg: sql<number>`COALESCE(SUM(${orders.weightKg}), 0)`.mapWith(Number),
    })
    .from(orders)
    .where(eq(orders.warehouseId, warehouseId));

  const daily = await db
    .select({
      day: sql<string>`TO_CHAR(DATE_TRUNC('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      created: sql<number>`COUNT(*)`.mapWith(Number),
      delivered: count("delivered"),
    })
    .from(orders)
    .where(and(eq(orders.warehouseId, warehouseId), sql`${orders.createdAt} > NOW() - INTERVAL '7 days'`))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const couriers = await db
    .select({
      name: users.name,
      vehicle: users.vehicle,
      delivered: count("delivered"),
      failed: count("failed"),
      active: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} IN ('assigned','in_transit'))`.mapWith(Number),
      avgDeliveryMinutes: minutes,
    })
    .from(users)
    .leftJoin(orders, eq(orders.courierId, users.id))
    .where(and(eq(users.warehouseId, warehouseId), eq(users.role, "courier")))
    .groupBy(users.id, users.name, users.vehicle)
    .orderBy(users.name);

  const lowStock = await db
    .select({ sku: inventory.sku, name: inventory.name, quantity: inventory.quantity, minStock: inventory.minStock })
    .from(inventory)
    .where(and(eq(inventory.warehouseId, warehouseId), lt(inventory.quantity, inventory.minStock)));

  const network = await db
    .select({
      code: warehouses.code,
      name: warehouses.name,
      open: sql<number>`COUNT(${orders.id}) FILTER (WHERE ${orders.status} IN ('pending','assigned','in_transit'))`.mapWith(Number),
      delivered: count("delivered"),
      failed: count("failed"),
      avgDeliveryMinutes: minutes,
    })
    .from(warehouses)
    .leftJoin(orders, eq(orders.warehouseId, warehouses.id))
    .groupBy(warehouses.id, warehouses.code, warehouses.name)
    .orderBy(warehouses.id);

  const closed = totals.delivered + totals.failed;
  return {
    warehouse: { code: warehouse.code, name: warehouse.name, city: warehouse.city, capacity: warehouse.capacity },
    totals: { ...totals, successRate: closed ? Math.round((totals.delivered / closed) * 100) : null },
    daily,
    couriers,
    lowStock,
    network,
  };
}

export default async (req: Request) => {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  if (user.role !== "warehouse") return forbidden();

  const metrics = await computeMetrics(user.warehouseId);
  if (req.method === "GET") return json(metrics);

  if (req.method === "POST") {
    const { question } = await req.json().catch(() => ({}));
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 1200,
      system:
        "Eres un analista de operaciones logísticas de última milla para la red RutaClara en Colombia. " +
        "Analiza las métricas JSON del nodo de almacén y responde en español, de forma concreta y accionable. " +
        "Usa formato Markdown simple: un titular breve, 3-5 hallazgos con cifras, riesgos y 3 recomendaciones priorizadas. " +
        "No inventes datos que no estén en las métricas.",
      messages: [
        {
          role: "user",
          content:
            `Métricas del nodo (JSON):\n${JSON.stringify(metrics)}\n\n` +
            (typeof question === "string" && question.trim()
              ? `Pregunta del operador: ${question.trim().slice(0, 500)}`
              : "Genera el resumen ejecutivo del desempeño del nodo."),
        },
      ],
    });
    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return json({ insight: text });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/metrics", "/api/metrics/insights"],
};
