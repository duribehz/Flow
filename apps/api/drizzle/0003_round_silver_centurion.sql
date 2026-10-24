CREATE TYPE "public"."branch_supply_setting_mode" AS ENUM('fixed', 'on_demand');--> statement-breakpoint
CREATE TABLE "branch_supply_weekly_targets" (
	"branch_supply_setting_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"target_quantity" bigint NOT NULL,
	CONSTRAINT "branch_supply_weekly_targets_branch_supply_setting_id_weekday_pk" PRIMARY KEY("branch_supply_setting_id","weekday"),
	CONSTRAINT "branch_supply_weekly_targets_weekday_check" CHECK ("branch_supply_weekly_targets"."weekday" between 1 and 7),
	CONSTRAINT "branch_supply_weekly_targets_target_quantity_check" CHECK ("branch_supply_weekly_targets"."target_quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "package_purpose" RENAME TO "usage_purposes";--> statement-breakpoint
ALTER TABLE "shipments" RENAME COLUMN "package_purpose_id" TO "usage_purpose_id";--> statement-breakpoint
ALTER TABLE "branch_supply_settings" DROP CONSTRAINT "branch_supply_settings_quantities_check";--> statement-breakpoint
ALTER TABLE "usage_purposes" DROP CONSTRAINT "package_purpose_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_package_purpose_id_package_purpose_id_fk";
--> statement-breakpoint
DROP INDEX "package_purpose_code_unique";--> statement-breakpoint
ALTER TABLE "branch_supply_settings" ADD COLUMN "mode" "branch_supply_setting_mode" NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_supply_settings" ADD COLUMN "default_usage_purpose_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "branch_supply_weekly_targets" ADD CONSTRAINT "branch_supply_weekly_targets_branch_supply_setting_id_branch_supply_settings_id_fk" FOREIGN KEY ("branch_supply_setting_id") REFERENCES "public"."branch_supply_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_usage_purpose_id_usage_purposes_id_fk" FOREIGN KEY ("usage_purpose_id") REFERENCES "public"."usage_purposes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_supply_settings" ADD CONSTRAINT "branch_supply_settings_default_usage_purpose_id_usage_purposes_id_fk" FOREIGN KEY ("default_usage_purpose_id") REFERENCES "public"."usage_purposes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_purposes_name_lower_unique" ON "usage_purposes" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "branch_supply_settings_default_usage_purpose_id_idx" ON "branch_supply_settings" USING btree ("default_usage_purpose_id");--> statement-breakpoint
ALTER TABLE "usage_purposes" DROP COLUMN "code";--> statement-breakpoint
ALTER TABLE "usage_purposes" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "usage_purposes" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "branch_supply_settings" DROP COLUMN "minimum_quantity";--> statement-breakpoint
ALTER TABLE "branch_supply_settings" DROP COLUMN "target_quantity";
