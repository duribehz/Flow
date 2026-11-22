CREATE TYPE "public"."branch_transfer_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
CREATE TABLE "branch_transfer_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"quantity" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_transfer_items_quantity_check" CHECK ("branch_transfer_items"."quantity" between 1 and 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE "branch_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_number" text NOT NULL,
	"from_branch_id" uuid NOT NULL,
	"to_branch_id" uuid NOT NULL,
	"sent_business_date" date NOT NULL,
	"status" "branch_transfer_status" DEFAULT 'pending' NOT NULL,
	"sent_by" uuid NOT NULL,
	"accepted_by" uuid,
	"accepted_inventory_day_id" uuid,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_transfers_distinct_branches_check" CHECK ("branch_transfers"."from_branch_id" <> "branch_transfers"."to_branch_id"),
	CONSTRAINT "branch_transfers_acceptance_state_check" CHECK (("branch_transfers"."status" = 'pending' and "branch_transfers"."accepted_by" is null and "branch_transfers"."accepted_inventory_day_id" is null and "branch_transfers"."accepted_at" is null) or ("branch_transfers"."status" = 'accepted' and "branch_transfers"."accepted_by" is not null and "branch_transfers"."accepted_inventory_day_id" is not null and "branch_transfers"."accepted_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "branch_transfer_items" ADD CONSTRAINT "branch_transfer_items_transfer_id_branch_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."branch_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_transfer_items" ADD CONSTRAINT "branch_transfer_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD CONSTRAINT "branch_transfers_from_branch_id_branches_id_fk" FOREIGN KEY ("from_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD CONSTRAINT "branch_transfers_to_branch_id_branches_id_fk" FOREIGN KEY ("to_branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD CONSTRAINT "branch_transfers_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD CONSTRAINT "branch_transfers_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_transfers" ADD CONSTRAINT "branch_transfers_accepted_inventory_day_id_inventory_days_id_fk" FOREIGN KEY ("accepted_inventory_day_id") REFERENCES "public"."inventory_days"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_transfer_items_transfer_supply_unique" ON "branch_transfer_items" USING btree ("transfer_id","supply_id");--> statement-breakpoint
CREATE INDEX "branch_transfer_items_supply_idx" ON "branch_transfer_items" USING btree ("supply_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_transfers_number_unique" ON "branch_transfers" USING btree ("transfer_number");--> statement-breakpoint
CREATE INDEX "branch_transfers_from_branch_idx" ON "branch_transfers" USING btree ("from_branch_id","sent_at");--> statement-breakpoint
CREATE INDEX "branch_transfers_to_branch_status_idx" ON "branch_transfers" USING btree ("to_branch_id","status");--> statement-breakpoint
CREATE INDEX "branch_transfers_inventory_day_idx" ON "branch_transfers" USING btree ("accepted_inventory_day_id");