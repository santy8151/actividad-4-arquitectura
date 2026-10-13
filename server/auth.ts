import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions, users, warehouses } from "../db/schema.js";

const COOKIE = "rc_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "warehouse" | "courier";
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string;
};

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  return token;
}

export function sessionCookie(token: string, maxAgeSeconds = SESSION_DAYS * 86_400): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function readToken(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  return match ? match[1] : null;
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = readToken(req);
  if (!token) return null;
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      warehouseId: users.warehouseId,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(warehouses, eq(warehouses.id, users.warehouseId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
  return (row as SessionUser) ?? null;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers });
}

export const unauthorized = () => json({ error: "No autenticado" }, 401);
export const forbidden = () => json({ error: "No autorizado para esta acción" }, 403);

// Hilo de chat: "w1-w2" entre nodos (ordenado) o "w1-c5" entre un nodo y su repartidor.
export function threadKey(a: string, b: string): string {
  if (a.startsWith("w") && b.startsWith("w")) {
    return [a, b].sort((x, y) => Number(x.slice(1)) - Number(y.slice(1))).join("-");
  }
  return a.startsWith("w") ? `${a}-${b}` : `${b}-${a}`;
}
