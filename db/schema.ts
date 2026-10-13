import { pgTable, serial, text, timestamp, integer, index, numeric } from "drizzle-orm/pg-core";

// Cada nodo del almacén (centro de distribución) con su propio inventario, pedidos y repartidores.
export const warehouses = pgTable("warehouses", {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  name: text().notNull(),
  city: text().notNull(),
  address: text().notNull(),
  capacity: integer().notNull().default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// role: "warehouse" (operador del nodo) | "courier" (repartidor)
export const users = pgTable("users", {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  name: text().notNull(),
  role: text().notNull(),
  passwordHash: text("password_hash").notNull(),
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
  phone: text(),
  vehicle: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventory = pgTable(
  "inventory",
  {
    id: serial().primaryKey(),
    warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
    sku: text().notNull(),
    name: text().notNull(),
    quantity: integer().notNull().default(0),
    minStock: integer("min_stock").notNull().default(10),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("inventory_warehouse_idx").on(t.warehouseId)],
);

// status: pending | assigned | in_transit | delivered | failed
export const orders = pgTable(
  "orders",
  {
    id: serial().primaryKey(),
    code: text().notNull().unique(),
    warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
    courierId: integer("courier_id").references(() => users.id),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    address: text().notNull(),
    items: text().notNull(),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull().default("1"),
    priority: text().notNull().default("normal"),
    status: text().notNull().default("pending"),
    notes: text(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    assignedAt: timestamp("assigned_at"),
    deliveredAt: timestamp("delivered_at"),
  },
  (t) => [index("orders_warehouse_idx").on(t.warehouseId), index("orders_courier_idx").on(t.courierId)],
);

// thread: "w1-w2" (nodo con nodo) o "w1-c5" (nodo con repartidor)
export const messages = pgTable(
  "messages",
  {
    id: serial().primaryKey(),
    thread: text().notNull(),
    senderId: integer("sender_id").notNull().references(() => users.id),
    body: text().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("messages_thread_idx").on(t.thread, t.createdAt)],
);
