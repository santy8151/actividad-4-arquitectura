import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { sessions, users } from "../../db/schema.js";
import { createSession, getSessionUser, json, readToken, sessionCookie, unauthorized, verifyPassword } from "../../server/auth.js";

export default async (req: Request) => {
  const action = new URL(req.url).pathname.split("/").pop();

  if (action === "login" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return json({ error: "Correo y contraseña son obligatorios" }, 400);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return json({ error: "Credenciales inválidas" }, 401);
    }
    const token = await createSession(user.id);
    return json({ ok: true, role: user.role }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  if (action === "logout" && req.method === "POST") {
    const token = readToken(req);
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
  }

  if (action === "me" && req.method === "GET") {
    const user = await getSessionUser(req);
    return user ? json({ user }) : unauthorized();
  }

  return json({ error: "Ruta no encontrada" }, 404);
};

export const config: Config = {
  path: ["/api/auth/login", "/api/auth/logout", "/api/auth/me"],
};
