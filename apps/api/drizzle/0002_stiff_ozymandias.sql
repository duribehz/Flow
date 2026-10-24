CREATE TYPE "public"."inventory_receipt_incident" AS ENUM('none', 'shortage', 'surplus', 'damaged');--> statement-breakpoint
CREATE TABLE "inventory_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_shift_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"purchase_id" uuid,
	"expected_quantity" bigint,
	"received_quantity" bigint NOT NULL,
	"incident_type" "inventory_receipt_incident" DEFAULT 'none' NOT NULL,
	"notes" text,
	"received_by" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_receipts_quantities_check" CHECK ("inventory_receipts"."received_quantity" >= 0 and ("inventory_receipts"."expected_quantity" is null or "inventory_receipts"."expected_quantity" >= 0))
);
--> statement-breakpoint
ALTER TABLE "inventory_receipts" ADD CONSTRAINT "inventory_receipts_inventory_shift_id_inventory_shifts_id_fk" FOREIGN KEY ("inventory_shift_id") REFERENCES "public"."inventory_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_receipts" ADD CONSTRAINT "inventory_receipts_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_receipts" ADD CONSTRAINT "inventory_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_receipts_shift_id_idx" ON "inventory_receipts" USING btree ("inventory_shift_id");--> statement-breakpoint
CREATE INDEX "inventory_receipts_supply_id_idx" ON "inventory_receipts" USING btree ("supply_id");