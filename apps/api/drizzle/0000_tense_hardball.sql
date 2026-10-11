CREATE TYPE "public"."incident_status" AS ENUM('open', 'investigating', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."incident_type" AS ENUM('missing', 'damaged', 'excess', 'expired', 'incorrect', 'other');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('receipt', 'consumption', 'waste', 'positive_adjustment', 'negative_adjustment');--> statement-breakpoint
CREATE TYPE "public"."inventory_shift_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'ordered', 'partially_received', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."receipt_item_condition" AS ENUM('good', 'damaged', 'expired', 'incorrect');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."replenishment_request_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'partially_fulfilled', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shift_name" AS ENUM('morning', 'afternoon', 'night');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('preparing', 'dispatched', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."supply_unit" AS ENUM('unit', 'box', 'package', 'kilogram', 'gram', 'liter', 'milliliter');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"ip_address" "inet",
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "branch_supply_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"minimum_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"target_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_supply_settings_quantities_check" CHECK ("branch_supply_settings"."minimum_quantity" >= 0 and "branch_supply_settings"."target_quantity" >= "branch_supply_settings"."minimum_quantity")
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_number" text NOT NULL,
	"receipt_id" uuid NOT NULL,
	"receipt_item_id" uuid,
	"type" "incident_type" NOT NULL,
	"status" "incident_status" DEFAULT 'open' NOT NULL,
	"description" text NOT NULL,
	"reported_by" uuid NOT NULL,
	"assigned_to" uuid,
	"resolution" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_closure_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_closure_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"opening_quantity" numeric(14, 3) NOT NULL,
	"received_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"consumed_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"wasted_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"positive_adjustments" numeric(14, 3) DEFAULT '0' NOT NULL,
	"negative_adjustments" numeric(14, 3) DEFAULT '0' NOT NULL,
	"theoretical_quantity" numeric(14, 3) NOT NULL,
	"physical_quantity" numeric(14, 3) NOT NULL,
	"variance_quantity" numeric(14, 3) NOT NULL,
	"surplus_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"shortage_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"target_quantity" numeric(14, 3) NOT NULL,
	"suggested_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_shift_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"closed_by" uuid NOT NULL,
	"closed_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"inventory_shift_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"type" "inventory_movement_type" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"receipt_item_id" uuid,
	"reference_type" text,
	"reference_id" uuid,
	CONSTRAINT "inventory_movements_quantity_check" CHECK ("inventory_movements"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"shift_name" "shift_name" NOT NULL,
	"status" "inventory_shift_status" DEFAULT 'open' NOT NULL,
	"opened_by" uuid NOT NULL,
	"closed_by" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_purpose" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"ordered_quantity" numeric(14, 3) NOT NULL,
	"received_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_order_items_quantities_check" CHECK ("purchase_order_items"."ordered_quantity" > 0 and "purchase_order_items"."received_quantity" >= 0 and "purchase_order_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" "purchase_order_status" DEFAULT 'draft' NOT NULL,
	"expected_delivery_date" date,
	"ordered_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"shipment_item_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"expected_quantity" numeric(14, 3) NOT NULL,
	"received_quantity" numeric(14, 3) NOT NULL,
	"accepted_quantity" numeric(14, 3) NOT NULL,
	"rejected_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"condition" "receipt_item_condition",
	"checked_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_items_quantities_check" CHECK ("receipt_items"."expected_quantity" >= 0 and "receipt_items"."received_quantity" >= 0 and "receipt_items"."accepted_quantity" >= 0 and "receipt_items"."rejected_quantity" >= 0 and "receipt_items"."accepted_quantity" + "receipt_items"."rejected_quantity" <= "receipt_items"."received_quantity")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_number" text NOT NULL,
	"shipment_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"status" "receipt_status" DEFAULT 'pending' NOT NULL,
	"received_by" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replenishment_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"replenishment_request_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"suggested_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"requested_quantity" numeric(14, 3) NOT NULL,
	"approved_quantity" numeric(14, 3),
	"fulfilled_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "replenishment_request_items_quantities_check" CHECK ("replenishment_request_items"."suggested_quantity" >= 0 and "replenishment_request_items"."requested_quantity" > 0 and ("replenishment_request_items"."approved_quantity" is null or "replenishment_request_items"."approved_quantity" >= 0) and "replenishment_request_items"."fulfilled_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "replenishment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_number" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"inventory_closure_id" uuid,
	"status" "replenishment_request_status" DEFAULT 'draft' NOT NULL,
	"request_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"supply_id" uuid NOT NULL,
	"replenishment_request_item_id" uuid,
	"planned_quantity" numeric(14, 3) NOT NULL,
	"shipped_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_items_quantities_check" CHECK ("shipment_items"."planned_quantity" > 0 and "shipment_items"."shipped_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_number" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"replenishment_request_id" uuid,
	"package_purpose_id" uuid NOT NULL,
	"status" "shipment_status" DEFAULT 'preparing' NOT NULL,
	"prepared_by" uuid NOT NULL,
	"dispatched_by" uuid,
	"prepared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone_number" text,
	"email" text
);
--> statement-breakpoint
CREATE TABLE "supplies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" "supply_unit" NOT NULL,
	"category_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_name" text NOT NULL,
	"password" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_supply_settings" ADD CONSTRAINT "branch_supply_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_supply_settings" ADD CONSTRAINT "branch_supply_settings_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_receipt_item_id_receipt_items_id_fk" FOREIGN KEY ("receipt_item_id") REFERENCES "public"."receipt_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_closure_items" ADD CONSTRAINT "inventory_closure_items_inventory_closure_id_inventory_closures_id_fk" FOREIGN KEY ("inventory_closure_id") REFERENCES "public"."inventory_closures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_closure_items" ADD CONSTRAINT "inventory_closure_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_closures" ADD CONSTRAINT "inventory_closures_inventory_shift_id_inventory_shifts_id_fk" FOREIGN KEY ("inventory_shift_id") REFERENCES "public"."inventory_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_closures" ADD CONSTRAINT "inventory_closures_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_closures" ADD CONSTRAINT "inventory_closures_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_shift_id_inventory_shifts_id_fk" FOREIGN KEY ("inventory_shift_id") REFERENCES "public"."inventory_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_receipt_item_id_receipt_items_id_fk" FOREIGN KEY ("receipt_item_id") REFERENCES "public"."receipt_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_shifts" ADD CONSTRAINT "inventory_shifts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_shifts" ADD CONSTRAINT "inventory_shifts_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_shifts" ADD CONSTRAINT "inventory_shifts_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_purpose" ADD CONSTRAINT "package_purpose_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_shipment_item_id_shipment_items_id_fk" FOREIGN KEY ("shipment_item_id") REFERENCES "public"."shipment_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ADD CONSTRAINT "replenishment_request_items_replenishment_request_id_replenishment_requests_id_fk" FOREIGN KEY ("replenishment_request_id") REFERENCES "public"."replenishment_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ADD CONSTRAINT "replenishment_request_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_inventory_closure_id_inventory_closures_id_fk" FOREIGN KEY ("inventory_closure_id") REFERENCES "public"."inventory_closures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_request_by_users_id_fk" FOREIGN KEY ("request_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ADD CONSTRAINT "replenishment_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_replenishment_request_item_id_replenishment_request_items_id_fk" FOREIGN KEY ("replenishment_request_item_id") REFERENCES "public"."replenishment_request_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_replenishment_request_id_replenishment_requests_id_fk" FOREIGN KEY ("replenishment_request_id") REFERENCES "public"."replenishment_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_package_purpose_id_package_purpose_id_fk" FOREIGN KEY ("package_purpose_id") REFERENCES "public"."package_purpose"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_dispatched_by_users_id_fk" FOREIGN KEY ("dispatched_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_unique" ON "auth_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_supply_settings_branch_supply_unique" ON "branch_supply_settings" USING btree ("branch_id","supply_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_name_unique" ON "branches" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_incident_number_unique" ON "incidents" USING btree ("incident_number");--> statement-breakpoint
CREATE INDEX "incidents_receipt_id_idx" ON "incidents" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "incidents_status_idx" ON "incidents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_closure_items_closure_supply_unique" ON "inventory_closure_items" USING btree ("inventory_closure_id","supply_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_closures_shift_unique" ON "inventory_closures" USING btree ("inventory_shift_id");--> statement-breakpoint
CREATE INDEX "inventory_closures_branch_id_idx" ON "inventory_closures" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_branch_supply_idx" ON "inventory_movements" USING btree ("branch_id","supply_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_shift_id_idx" ON "inventory_movements" USING btree ("inventory_shift_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_receipt_item_id_idx" ON "inventory_movements" USING btree ("receipt_item_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_reference_idx" ON "inventory_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_shifts_branch_date_name_unique" ON "inventory_shifts" USING btree ("branch_id","business_date","shift_name");--> statement-breakpoint
CREATE INDEX "inventory_shifts_status_idx" ON "inventory_shifts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "package_purpose_code_unique" ON "package_purpose" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_order_items_order_supply_unique" ON "purchase_order_items" USING btree ("purchase_order_id","supply_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_order_number_unique" ON "purchase_orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_items_receipt_shipment_item_unique" ON "receipt_items" USING btree ("receipt_id","shipment_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_receipt_number_unique" ON "receipts" USING btree ("receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_shipment_unique" ON "receipts" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "receipts_branch_id_idx" ON "receipts" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "receipts_status_idx" ON "receipts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "replenishment_request_items_request_supply_unique" ON "replenishment_request_items" USING btree ("replenishment_request_id","supply_id");--> statement-breakpoint
CREATE UNIQUE INDEX "replenishment_requests_request_number_unique" ON "replenishment_requests" USING btree ("request_number");--> statement-breakpoint
CREATE UNIQUE INDEX "replenishment_requests_inventory_closure_unique" ON "replenishment_requests" USING btree ("inventory_closure_id");--> statement-breakpoint
CREATE INDEX "replenishment_requests_branch_id_idx" ON "replenishment_requests" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "replenishment_requests_status_idx" ON "replenishment_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_items_shipment_supply_unique" ON "shipment_items" USING btree ("shipment_id","supply_id");--> statement-breakpoint
CREATE INDEX "shipment_items_request_item_id_idx" ON "shipment_items" USING btree ("replenishment_request_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_shipment_number_unique" ON "shipments" USING btree ("shipment_number");--> statement-breakpoint
CREATE INDEX "shipments_branch_id_idx" ON "shipments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "shipments_replenishment_request_id_idx" ON "shipments" USING btree ("replenishment_request_id");--> statement-breakpoint
CREATE INDEX "shipments_status_idx" ON "shipments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_name_unique" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "supplies_sku_unique" ON "supplies" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "supplies_category_id_idx" ON "supplies" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_user_name_unique" ON "users" USING btree ("user_name");