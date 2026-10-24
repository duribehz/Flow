import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { branches } from "../branches/branches.schema.js";
import { suppliers } from "../suppliers/suppliers.schema.js";
import { usagePurposes } from "../usage-purposes/usage-purposes.schema.js";

export const branchSupplySettingMode = pgEnum("branch_supply_setting_mode", ["fixed", "on_demand"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
  },
  (table) => [uniqueIndex("categories_name_unique").on(table.name)],
);

export const units = pgTable(
  "units",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    symbol: text().notNull(),
    active: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("units_name_unique").on(table.name),
    uniqueIndex("units_symbol_unique").on(table.symbol),
  ],
);

export const supplies = pgTable(
  "supplies",
  {
    id: uuid().primaryKey().defaultRandom(),
    sku: text().notNull(),
    name: text().notNull(),
    description: text(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id),
    unitCost: bigint("unit_cost", { mode: "number" }).notNull().default(0),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    active: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("supplies_sku_unique").on(table.sku),
    index("supplies_unit_id_idx").on(table.unitId),
    index("supplies_category_id_idx").on(table.categoryId),
    check("supplies_unit_cost_check", sql`${table.unitCost} >= 0`),
  ],
);

export const supplySuppliers = pgTable(
  "supply_suppliers",
  {
    id: uuid().primaryKey().defaultRandom(),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("supply_suppliers_supply_supplier_unique").on(table.supplyId, table.supplierId),
    index("supply_suppliers_supplier_id_idx").on(table.supplierId),
  ],
);

export const branchSupplySettings = pgTable(
  "branch_supply_settings",
  {
    id: uuid().primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id, { onDelete: "cascade" }),
    mode: branchSupplySettingMode().notNull(),
    defaultUsagePurposeId: uuid("default_usage_purpose_id")
      .notNull()
      .references(() => usagePurposes.id),
    active: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("branch_supply_settings_branch_supply_unique").on(table.branchId, table.supplyId),
    index("branch_supply_settings_default_usage_purpose_id_idx").on(table.defaultUsagePurposeId),
  ],
);

export const branchSupplyWeeklyTargets = pgTable(
  "branch_supply_weekly_targets",
  {
    branchSupplySettingId: uuid("branch_supply_setting_id")
      .notNull()
      .references(() => branchSupplySettings.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
    targetQuantity: bigint("target_quantity", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.branchSupplySettingId, table.weekday] }),
    check("branch_supply_weekly_targets_weekday_check", sql`${table.weekday} between 1 and 7`),
    check("branch_supply_weekly_targets_target_quantity_check", sql`${table.targetQuantity} >= 0`),
  ],
);
