CREATE TABLE "supply_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supply_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supply_suppliers" ADD CONSTRAINT "supply_suppliers_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_suppliers" ADD CONSTRAINT "supply_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supply_suppliers_supply_supplier_unique" ON "supply_suppliers" USING btree ("supply_id","supplier_id");--> statement-breakpoint
CREATE INDEX "supply_suppliers_supplier_id_idx" ON "supply_suppliers" USING btree ("supplier_id");