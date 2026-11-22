CREATE TYPE "public"."inventory_movement_kind" AS ENUM('transfer_out', 'transfer_in', 'transfer_cancel', 'receipt_in');--> statement-breakpoint
ALTER TYPE "public"."branch_transfer_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"kind" "inventory_movement_kind" NOT NULL,
	"quantity" bigint NOT NULL,
	"reference_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_transfers" DROP CONSTRAINT "branch_transfers_acceptance_state_check";--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD COLUMN "reported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD COLUMN "cancelled_by" uuid;--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movements_branch_supply_created_idx" ON "inventory_movements" USING btree ("branch_id","supply_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_reference_idx" ON "inventory_movements" USING btree ("reference_id");--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD CONSTRAINT "branch_transfers_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD CONSTRAINT "branch_transfers_acceptance_state_check" CHECK (("branch_transfers"."status" = 'pending' and "branch_transfers"."accepted_by" is null and "branch_transfers"."accepted_inventory_day_id" is null and "branch_transfers"."accepted_at" is null and "branch_transfers"."cancelled_by" is null and "branch_transfers"."cancelled_at" is null) or ("branch_transfers"."status" = 'accepted' and "branch_transfers"."accepted_by" is not null and "branch_transfers"."accepted_inventory_day_id" is not null and "branch_transfers"."accepted_at" is not null and "branch_transfers"."cancelled_by" is null and "branch_transfers"."cancelled_at" is null) or ("branch_transfers"."status"::text = 'cancelled' and "branch_transfers"."accepted_by" is null and "branch_transfers"."accepted_inventory_day_id" is null and "branch_transfers"."accepted_at" is null and "branch_transfers"."cancelled_by" is not null and "branch_transfers"."cancelled_at" is not null));