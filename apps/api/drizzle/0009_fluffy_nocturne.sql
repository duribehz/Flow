ALTER TABLE "shipments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "status" SET DEFAULT 'dispatched'::text;--> statement-breakpoint
UPDATE "shipment_items"
SET "shipped_quantity" = "planned_quantity"
WHERE "shipment_id" IN (SELECT "id" FROM "shipments" WHERE "status" = 'preparing');--> statement-breakpoint
UPDATE "shipments"
SET
	"status" = 'dispatched',
	"dispatched_by" = COALESCE("dispatched_by", "prepared_by"),
	"dispatched_at" = COALESCE("dispatched_at", "prepared_at"),
	"updated_at" = now()
WHERE "status" = 'preparing';--> statement-breakpoint
DROP TYPE "public"."shipment_status";--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('dispatched', 'delivered', 'cancelled');--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "status" SET DEFAULT 'dispatched'::"public"."shipment_status";--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "status" SET DATA TYPE "public"."shipment_status" USING "status"::"public"."shipment_status";--> statement-breakpoint
INSERT INTO "inventory_days" ("branch_id", "business_date", "opened_by")
SELECT DISTINCT "branch_id", CURRENT_DATE, COALESCE("dispatched_by", "prepared_by")
FROM "shipments" s
WHERE s."status" = 'dispatched'
	AND NOT EXISTS (SELECT 1 FROM "receipts" r WHERE r."shipment_id" = s."id")
ON CONFLICT ("branch_id", "business_date") DO NOTHING;--> statement-breakpoint
INSERT INTO "receipts" (
	"receipt_number",
	"shipment_id",
	"inventory_day_id",
	"branch_id",
	"status",
	"received_by",
	"started_at"
)
SELECT
	'REC-MIG-' || upper(substr(replace(s."id"::text, '-', ''), 1, 12)),
	s."id",
	d."id",
	s."branch_id",
	'in_progress',
	COALESCE(s."dispatched_by", s."prepared_by"),
	COALESCE(s."dispatched_at", now())
FROM "shipments" s
INNER JOIN "inventory_days" d
	ON d."branch_id" = s."branch_id" AND d."business_date" = CURRENT_DATE
WHERE s."status" = 'dispatched'
	AND NOT EXISTS (SELECT 1 FROM "receipts" r WHERE r."shipment_id" = s."id")
ON CONFLICT ("shipment_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "receipt_items" (
	"receipt_id",
	"shipment_item_id",
	"supply_id",
	"expected_quantity",
	"received_quantity",
	"accepted_quantity",
	"rejected_quantity"
)
SELECT r."id", si."id", si."supply_id", si."shipped_quantity", 0, 0, 0
FROM "receipts" r
INNER JOIN "shipment_items" si ON si."shipment_id" = r."shipment_id"
WHERE NOT EXISTS (
	SELECT 1 FROM "receipt_items" ri
	WHERE ri."receipt_id" = r."id" AND ri."shipment_item_id" = si."id"
)
ON CONFLICT ("receipt_id", "shipment_item_id") DO NOTHING;
