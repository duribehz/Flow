ALTER TABLE "shipment_items" DROP CONSTRAINT "shipment_items_quantities_check";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_usage_purpose_id_usage_purposes_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_replenishment_request_unique" ON "shipments" USING btree ("replenishment_request_id");--> statement-breakpoint
ALTER TABLE "shipments" DROP COLUMN "usage_purpose_id";--> statement-breakpoint
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_quantities_check" CHECK ("shipment_items"."planned_quantity" > 0 and "shipment_items"."shipped_quantity" >= 0 and "shipment_items"."shipped_quantity" <= "shipment_items"."planned_quantity");