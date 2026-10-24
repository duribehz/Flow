ALTER TABLE "replenishment_request_items" DROP CONSTRAINT "replenishment_request_items_quantities_check";--> statement-breakpoint
DROP INDEX "replenishment_request_items_request_supply_unique";--> statement-breakpoint
DROP INDEX "shipment_items_shipment_supply_unique";--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ALTER COLUMN "suggested_quantity" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ALTER COLUMN "suggested_quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ADD COLUMN "usage_purpose_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ADD COLUMN "unit_cost" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ADD COLUMN "line_total" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ADD CONSTRAINT "replenishment_request_items_usage_purpose_id_usage_purposes_id_fk" FOREIGN KEY ("usage_purpose_id") REFERENCES "public"."usage_purposes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "replenishment_request_items_request_id_idx" ON "replenishment_request_items" USING btree ("replenishment_request_id");--> statement-breakpoint
CREATE INDEX "replenishment_request_items_usage_purpose_id_idx" ON "replenishment_request_items" USING btree ("usage_purpose_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_items_shipment_request_item_unique" ON "shipment_items" USING btree ("shipment_id","replenishment_request_item_id");--> statement-breakpoint
ALTER TABLE "replenishment_request_items" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ADD CONSTRAINT "replenishment_request_items_quantities_check" CHECK (("replenishment_request_items"."suggested_quantity" is null or "replenishment_request_items"."suggested_quantity" >= 0) and "replenishment_request_items"."requested_quantity" >= 0 and ("replenishment_request_items"."approved_quantity" is null or "replenishment_request_items"."approved_quantity" >= 0) and "replenishment_request_items"."fulfilled_quantity" >= 0 and "replenishment_request_items"."unit_cost" >= 0 and "replenishment_request_items"."line_total" >= 0);