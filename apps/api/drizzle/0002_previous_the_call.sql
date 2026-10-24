CREATE TYPE "public"."inventory_count_status" AS ENUM('draft', 'submitted', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."inventory_day_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "inventory_count_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_count_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"counted" boolean DEFAULT false NOT NULL,
	"opening_quantity" bigint DEFAULT 0 NOT NULL,
	"received_quantity" bigint DEFAULT 0 NOT NULL,
	"closing_quantity" bigint,
	"last_counted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_count_items_quantities_check" CHECK ("inventory_count_items"."opening_quantity" >= 0 and "inventory_count_items"."received_quantity" >= 0 and ("inventory_count_items"."closing_quantity" is null or "inventory_count_items"."closing_quantity" >= 0)),
	CONSTRAINT "inventory_count_items_counted_check" CHECK (("inventory_count_items"."counted" and "inventory_count_items"."closing_quantity" is not null) or (not "inventory_count_items"."counted" and "inventory_count_items"."closing_quantity" is null))
);
--> statement-breakpoint
CREATE TABLE "inventory_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_day_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"status" "inventory_count_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"submitted_by" uuid,
	"reviewed_by" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_counts_status_check" CHECK (("inventory_counts"."status" = 'draft' and "inventory_counts"."submitted_by" is null and "inventory_counts"."submitted_at" is null and "inventory_counts"."reviewed_by" is null and "inventory_counts"."reviewed_at" is null) or ("inventory_counts"."status" = 'submitted' and "inventory_counts"."submitted_by" is not null and "inventory_counts"."submitted_at" is not null and "inventory_counts"."reviewed_by" is null and "inventory_counts"."reviewed_at" is null) or ("inventory_counts"."status" = 'reviewed' and "inventory_counts"."submitted_by" is not null and "inventory_counts"."submitted_at" is not null and "inventory_counts"."reviewed_by" is not null and "inventory_counts"."reviewed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "inventory_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"status" "inventory_day_status" DEFAULT 'open' NOT NULL,
	"opened_by" uuid NOT NULL,
	"closed_by" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_days_status_check" CHECK (("inventory_days"."status" = 'open' and "inventory_days"."closed_by" is null and "inventory_days"."closed_at" is null) or ("inventory_days"."status" = 'closed' and "inventory_days"."closed_by" is not null and "inventory_days"."closed_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "replenishment_request_counters" (
	"branch_id_prefix" text PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_inventory_shift_id_inventory_shifts_id_fk";
--> statement-breakpoint
ALTER TABLE "replenishment_requests" DROP CONSTRAINT "replenishment_requests_inventory_closure_id_inventory_closures_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_closure_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_closures" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_shifts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "inventory_closure_items" CASCADE;--> statement-breakpoint
DROP TABLE "inventory_closures" CASCADE;--> statement-breakpoint
DROP TABLE "inventory_shifts" CASCADE;--> statement-breakpoint
DROP INDEX "receipts_inventory_shift_id_idx";--> statement-breakpoint
DROP INDEX "replenishment_requests_inventory_closure_unique";--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "inventory_day_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD COLUMN "inventory_count_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_inventory_count_id_inventory_counts_id_fk" FOREIGN KEY ("inventory_count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_inventory_day_id_inventory_days_id_fk" FOREIGN KEY ("inventory_day_id") REFERENCES "public"."inventory_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_days" ADD CONSTRAINT "inventory_days_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_days" ADD CONSTRAINT "inventory_days_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_days" ADD CONSTRAINT "inventory_days_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_count_items_count_supply_unique" ON "inventory_count_items" USING btree ("inventory_count_id","supply_id");--> statement-breakpoint
CREATE INDEX "inventory_count_items_supply_id_idx" ON "inventory_count_items" USING btree ("supply_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_counts_day_unique" ON "inventory_counts" USING btree ("inventory_day_id");--> statement-breakpoint
CREATE INDEX "inventory_counts_branch_id_idx" ON "inventory_counts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "inventory_counts_status_idx" ON "inventory_counts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_days_branch_date_unique" ON "inventory_days" USING btree ("branch_id","business_date");--> statement-breakpoint
CREATE INDEX "inventory_days_status_idx" ON "inventory_days" USING btree ("status");--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_inventory_day_id_inventory_days_id_fk" FOREIGN KEY ("inventory_day_id") REFERENCES "public"."inventory_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_inventory_count_id_inventory_counts_id_fk" FOREIGN KEY ("inventory_count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipts_inventory_day_id_idx" ON "receipts" USING btree ("inventory_day_id");--> statement-breakpoint
CREATE UNIQUE INDEX "replenishment_requests_inventory_count_unique" ON "replenishment_requests" USING btree ("inventory_count_id");--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "inventory_shift_id";--> statement-breakpoint
ALTER TABLE "replenishment_requests" DROP COLUMN "inventory_closure_id";--> statement-breakpoint
DROP TYPE "public"."inventory_shift_status";--> statement-breakpoint
DROP TYPE "public"."shift_name";--> statement-breakpoint
INSERT INTO "users" ("id", "user_name", "password") VALUES ('00000000-0000-4000-8000-000000000001', 'dev', 'dev') ON CONFLICT ("id") DO NOTHING;
