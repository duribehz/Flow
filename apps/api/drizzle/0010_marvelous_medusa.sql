ALTER TABLE "receipt_items" DROP CONSTRAINT "receipt_items_quantities_check";--> statement-breakpoint
ALTER TABLE "receipt_items" ALTER COLUMN "condition" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."receipt_item_condition";--> statement-breakpoint
CREATE TYPE "public"."receipt_item_condition" AS ENUM('good', 'damaged', 'expired', 'incorrect', 'not_arrived');--> statement-breakpoint
UPDATE "receipt_items" SET "condition" = 'good' WHERE "condition" IS NULL;--> statement-breakpoint
ALTER TABLE "receipt_items" ALTER COLUMN "condition" SET DATA TYPE "public"."receipt_item_condition" USING "condition"::"public"."receipt_item_condition";--> statement-breakpoint
ALTER TABLE "receipt_items" ALTER COLUMN "condition" SET DEFAULT 'good';--> statement-breakpoint
ALTER TABLE "receipt_items" ALTER COLUMN "condition" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receipt_items" DROP COLUMN "accepted_quantity";--> statement-breakpoint
ALTER TABLE "receipt_items" DROP COLUMN "rejected_quantity";--> statement-breakpoint
ALTER TABLE "receipt_items" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_quantities_check" CHECK ("receipt_items"."expected_quantity" between 0 and 9007199254740991 and "receipt_items"."received_quantity" between 0 and 9007199254740991 and ("receipt_items"."condition" <> 'not_arrived' or "receipt_items"."received_quantity" = 0));
