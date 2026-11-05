ALTER TABLE "comments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "comments" CASCADE;--> statement-breakpoint
ALTER TABLE "replenishment_request_items" DROP CONSTRAINT "replenishment_request_items_quantities_check";--> statement-breakpoint
ALTER TABLE "replenishment_requests" DROP CONSTRAINT "replenishment_requests_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "replenishment_requests" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "replenishment_requests" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
UPDATE "replenishment_requests" SET "status" = CASE "status" WHEN 'approved' THEN 'submitted' WHEN 'partially_fulfilled' THEN 'fulfilled' ELSE "status" END;--> statement-breakpoint
DROP TYPE "public"."replenishment_request_status";--> statement-breakpoint
CREATE TYPE "public"."replenishment_request_status" AS ENUM('draft', 'submitted', 'rejected', 'fulfilled', 'cancelled');--> statement-breakpoint
ALTER TABLE "replenishment_requests" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."replenishment_request_status";--> statement-breakpoint
ALTER TABLE "replenishment_requests" ALTER COLUMN "status" SET DATA TYPE "public"."replenishment_request_status" USING "status"::"public"."replenishment_request_status";--> statement-breakpoint
ALTER TABLE "replenishment_request_items" DROP COLUMN "approved_quantity";--> statement-breakpoint
ALTER TABLE "replenishment_requests" DROP COLUMN "reviewed_by";--> statement-breakpoint
ALTER TABLE "replenishment_requests" DROP COLUMN "reviewed_at";--> statement-breakpoint
ALTER TABLE "replenishment_request_items" ADD CONSTRAINT "replenishment_request_items_quantities_check" CHECK (("replenishment_request_items"."suggested_quantity" is null or "replenishment_request_items"."suggested_quantity" between 0 and 9007199254740991) and "replenishment_request_items"."requested_quantity" between 0 and 9007199254740991 and "replenishment_request_items"."fulfilled_quantity" between 0 and 9007199254740991 and "replenishment_request_items"."unit_cost" between 0 and 9007199254740991 and "replenishment_request_items"."line_total" between 0 and 9007199254740991);
