import type { Config } from "@netlify/functions";
import { and, asc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messages, users, warehouses } from "../../db/schema.js";
import { getSessionUser, json, threadKey, unauthorized, type SessionUser } from "../../server/auth.js";

type Contact = { key: string; name: string; subtitle: string; kind: "warehouse" | "courier" };

async function contactsFor(user: SessionUser): Promise<Contact[]> {
  if (user.role === "courier") {
    return [{ key: `w${user.warehouseId}`, name: user.warehouseName, subtitle: "Mi nodo de almacén", kind: "warehouse" }];
  }
  const nodes = await db.select().from(warehouses).where(ne(warehouses.id, user.warehouseId)).orderBy(warehouses.id);
  const couriers = await db
    .select()
    .from(users)
    .where(and(eq(users.warehouseId, user.warehouseId), eq(users.role, "courier")))
    .orderBy(users.name);
  return [
    ...nodes.map((n) => ({ key: `w${n.id}`, name: n.name, subtitle: `${n.code} · ${n.city}`, kind: "warehouse" as const })),
    ...couriers.map((c) => ({ key: `c${c.id}`, name: c.name, subtitle: `Repartidor · ${c.vehicle ?? ""}`, kind: "courier" as const })),
  ];
}

const selfKey = (user: SessionUser) => (user.role === "courier" ? `c${user.id}` : `w${user.warehouseId}`);

export default async (req: Request) => {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  const url = new URL(req.url);
  const contacts = await contactsFor(user);

  if (req.method === "GET" && url.pathname.endsWith("/contacts")) {
    const threads = contacts.map((c) => threadKey(selfKey(user), c.key));
    const last = threads.length
      ? await db
          .select({
            thread: messages.thread,
            body: sql<string>`(array_agg(${messages.body} ORDER BY ${messages.createdAt} DESC))[1]`,
            at: sql<string>`MAX(${messages.createdAt})`,
          })
          .from(messages)
          .where(inArray(messages.thread, threads))
          .groupBy(messages.thread)
      : [];
    return json({
      contacts: contacts.map((c, i) => {
        const l = last.find((m) => m.thread === threads[i]);
        return { ...c, lastMessage: l?.body ?? null, lastAt: l?.at ?? null };
      }),
    });
  }

  const withKey = url.searchParams.get("with") ?? "";
  if (!contacts.some((c) => c.key === withKey)) return json({ error: "Contacto no disponible" }, 403);
  const thread = threadKey(selfKey(user), withKey);

  if (req.method === "GET") {
    const after = Number(url.searchParams.get("after") ?? 0);
    const rows = await db
      .select({
        id: messages.id,
        body: messages.body,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderName: users.name,
        senderRole: users.role,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .where(and(eq(messages.thread, thread), gt(messages.id, after)))
      .orderBy(asc(messages.createdAt))
      .limit(200);
    return json({ messages: rows });
  }

  if (req.method === "POST") {
    const { body } = await req.json().catch(() => ({}));
    const text = String(body ?? "").trim().slice(0, 2000);
    if (!text) return json({ error: "El mensaje está vacío" }, 400);
    const [msg] = await db.insert(messages).values({ thread, senderId: user.id, body: text }).returning();
    return json({ message: { ...msg, senderName: user.name, senderRole: user.role } }, 201);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/chat/contacts", "/api/chat/messages"],
};
