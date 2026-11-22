ALTER TABLE "inventory_count_items" DROP CONSTRAINT "inventory_count_items_quantities_check";--> statement-breakpoint
ALTER TABLE "receipt_items" DROP CONSTRAINT "receipt_items_quantities_check";--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "opening_quantity" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "opening_quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "received_quantity" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ALTER COLUMN "received_quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD COLUMN "unit_price_at_receipt" bigint;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD COLUMN "received_amount" bigint;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "track_inventory" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "supplies" AS supply SET "track_inventory" = true WHERE supply."active" = true AND EXISTS (SELECT 1 FROM "branch_supply_settings" AS setting WHERE setting."supply_id" = supply."id" AND setting."active" = true);--> statement-breakpoint
UPDATE "inventory_count_items" SET "opening_quantity" = NULL WHERE "last_counted_at" IS NULL;--> statement-breakpoint
UPDATE "inventory_count_items" AS count_item SET "received_quantity" = (SELECT SUM(receipt_item."received_quantity") FROM "inventory_counts" AS inv_count JOIN "receipts" AS receipt ON receipt."inventory_day_id" = inv_count."inventory_day_id" JOIN "receipt_items" AS receipt_item ON receipt_item."receipt_id" = receipt."id" WHERE inv_count."id" = count_item."inventory_count_id" AND receipt."status" = 'completed' AND receipt_item."supply_id" = count_item."supply_id");--> statement-breakpoint
UPDATE "receipt_items" AS receipt_item SET "unit_price_at_receipt" = request_item."unit_cost" FROM "shipment_items" AS shipment_item JOIN "replenishment_request_items" AS request_item ON request_item."id" = shipment_item."replenishment_request_item_id" WHERE receipt_item."shipment_item_id" = shipment_item."id";--> statement-breakpoint
UPDATE "receipt_items" SET "received_amount" = ("received_quantity" * "unit_price_at_receipt" + 50) / 100;--> statement-breakpoint
ALTER TABLE "receipt_items" ALTER COLUMN "unit_price_at_receipt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_items" ALTER COLUMN "received_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_quantities_check" CHECK (("inventory_count_items"."opening_quantity" is null or "inventory_count_items"."opening_quantity" between 0 and 9007199254740991) and ("inventory_count_items"."received_quantity" is null or "inventory_count_items"."received_quantity" between 0 and 9007199254740991) and ("inventory_count_items"."closing_quantity" is null or "inventory_count_items"."closing_quantity" between 0 and 9007199254740991));--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_quantities_check" CHECK ("receipt_items"."expected_quantity" between 0 and 9007199254740991 and "receipt_items"."received_quantity" between 0 and 9007199254740991 and "receipt_items"."unit_price_at_receipt" between 0 and 9007199254740991 and "receipt_items"."received_amount" between 0 and 9007199254740991 and ("receipt_items"."condition" <> 'not_arrived' or "receipt_items"."received_quantity" = 0));
