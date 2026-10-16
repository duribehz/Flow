import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { branches } from "@/modules/branches/infrastructure/persistence/drizzle/branches.table.js";
import { supplies } from "@/modules/supplies/infrastructure/persistence/drizzle/supply.table.js";
import { users } from "@/modules/users/infrastructure/persistence/drizzle/users.table.js";

export const inventoryShiftStatus = pgEnum("inventory_shift_status", ["open", "closed"]);
export const shiftName = pgEnum("shift_name", ["morning", "afternoon", "night"]);

export const inventoryShifts = pgTable(
  "inventory_shifts",
  {
    id: uuid().primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    businessDate: date("business_date").notNull(),
    shiftName: shiftName("shift_name").notNull(),
    status: inventoryShiftStatus().notNull().default("open"),
    openedBy: uuid("opened_by")
      .notNull()
      .references(() => users.id),
    closedBy: uuid("closed_by").references(() => users.id),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inventory_shifts_branch_date_name_unique").on(
      table.branchId,
      table.businessDate,
      table.shiftName,
    ),
    index("inventory_shifts_status_idx").on(table.status),
  ],
);

export const inventoryClosures = pgTable(
  "inventory_closures",
  {
    id: uuid().primaryKey().defaultRandom(),
    inventoryShiftId: uuid("inventory_shift_id")
      .notNull()
      .references(() => inventoryShifts.id),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    closedBy: uuid("closed_by")
      .notNull()
      .references(() => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }).notNull(),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inventory_closures_shift_unique").on(table.inventoryShiftId),
    index("inventory_closures_branch_id_idx").on(table.branchId),
  ],
);

export const inventoryClosureItems = pgTable(
  "inventory_closure_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    inventoryClosureId: uuid("inventory_closure_id")
      .notNull()
      .references(() => inventoryClosures.id, { onDelete: "cascade" }),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id),
    openingQuantity: bigint("opening_quantity", { mode: "number" }).notNull(),
    closingQuantity: bigint("closing_quantity", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inventory_closure_items_closure_supply_unique").on(
      table.inventoryClosureId,
      table.supplyId,
    ),
    check(
      "inventory_closure_items_quantities_check",
      sql`${table.openingQuantity} >= 0 and ${table.closingQuantity} >= 0`,
    ),
  ],
);
