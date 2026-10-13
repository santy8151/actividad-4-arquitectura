CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY,
	"warehouse_id" integer NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 10 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY,
	"thread" text NOT NULL,
	"sender_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"warehouse_id" integer NOT NULL,
	"courier_id" integer,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"address" text NOT NULL,
	"items" text NOT NULL,
	"weight_kg" numeric(6,2) DEFAULT '1' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"assigned_at" timestamp,
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"password_hash" text NOT NULL,
	"warehouse_id" integer NOT NULL,
	"phone" text,
	"vehicle" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"address" text NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "inventory_warehouse_idx" ON "inventory" ("warehouse_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" ("thread","created_at");--> statement-breakpoint
CREATE INDEX "orders_warehouse_idx" ON "orders" ("warehouse_id");--> statement-breakpoint
CREATE INDEX "orders_courier_idx" ON "orders" ("courier_id");--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_warehouses_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_warehouse_id_warehouses_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_courier_id_users_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_warehouse_id_warehouses_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id");