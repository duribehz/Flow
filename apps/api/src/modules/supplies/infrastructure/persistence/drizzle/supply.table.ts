import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { branches } from "../../../../branches/infrastructure/persistence/drizzle/branches.table.js";
import { categories } from "../../../../categories/infrastructure/persistence/drizzle/categories.table.js";
import { suppliers } from "../../../../suppliers/infrastructure/persistence/drizzle/suppliers.table.js";
import { units } from "../../../../units/infrastructure/persistence/drizzle/units.table.js";

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
    minimumQuantity: bigint("minimum_quantity", { mode: "number" }).notNull().default(0),
    targetQuantity: bigint("target_quantity", { mode: "number" }).notNull().default(0),
    active: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("branch_supply_settings_branch_supply_unique").on(table.branchId, table.supplyId),
    check(
      "branch_supply_settings_quantities_check",
      sql`${table.minimumQuantity} >= 0 and ${table.targetQuantity} >= ${table.minimumQuantity}`,
    ),
  ],
);
