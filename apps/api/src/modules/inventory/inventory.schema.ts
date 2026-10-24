import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
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

import { branches } from "../branches/branches.schema.js";
import { supplies } from "../supplies/supplies.schema.js";
import { users } from "../users/users.schema.js";

export const inventoryDayStatus = pgEnum("inventory_day_status", ["open", "closed"]);
export const inventoryCountStatus = pgEnum("inventory_count_status", [
  "draft",
  "submitted",
  "reviewed",
]);

export const inventoryDays = pgTable(
  "inventory_days",
  {
    id: uuid().primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    businessDate: date("business_date").notNull(),
    status: inventoryDayStatus().notNull().default("open"),
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
    uniqueIndex("inventory_days_branch_date_unique").on(table.branchId, table.businessDate),
    index("inventory_days_status_idx").on(table.status),
    check(
      "inventory_days_status_check",
      sql`(${table.status} = 'open' and ${table.closedBy} is null and ${table.closedAt} is null) or (${table.status} = 'closed' and ${table.closedBy} is not null and ${table.closedAt} is not null)`,
    ),
  ],
);

export const inventoryCounts = pgTable(
  "inventory_counts",
  {
    id: uuid().primaryKey().defaultRandom(),
    inventoryDayId: uuid("inventory_day_id")
      .notNull()
      .references(() => inventoryDays.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    status: inventoryCountStatus().notNull().default("draft"),
    notes: text(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    submittedBy: uuid("submitted_by").references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inventory_counts_day_unique").on(table.inventoryDayId),
    index("inventory_counts_branch_id_idx").on(table.branchId),
    index("inventory_counts_status_idx").on(table.status),
    check(
      "inventory_counts_status_check",
      sql`(${table.status} = 'draft' and ${table.submittedBy} is null and ${table.submittedAt} is null and ${table.reviewedBy} is null and ${table.reviewedAt} is null) or (${table.status} = 'submitted' and ${table.submittedBy} is not null and ${table.submittedAt} is not null and ${table.reviewedBy} is null and ${table.reviewedAt} is null) or (${table.status} = 'reviewed' and ${table.submittedBy} is not null and ${table.submittedAt} is not null and ${table.reviewedBy} is not null and ${table.reviewedAt} is not null)`,
    ),
  ],
);

export const inventoryCountItems = pgTable(
  "inventory_count_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    inventoryCountId: uuid("inventory_count_id")
      .notNull()
      .references(() => inventoryCounts.id, { onDelete: "cascade" }),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id),
    counted: boolean().notNull().default(false),
    openingQuantity: bigint("opening_quantity", { mode: "number" }).notNull().default(0),
    receivedQuantity: bigint("received_quantity", { mode: "number" }).notNull().default(0),
    closingQuantity: bigint("closing_quantity", { mode: "number" }),
    lastCountedAt: timestamp("last_counted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("inventory_count_items_count_supply_unique").on(
      table.inventoryCountId,
      table.supplyId,
    ),
    index("inventory_count_items_supply_id_idx").on(table.supplyId),
    check(
      "inventory_count_items_quantities_check",
      sql`${table.openingQuantity} >= 0 and ${table.receivedQuantity} >= 0 and (${table.closingQuantity} is null or ${table.closingQuantity} >= 0)`,
    ),
    check(
      "inventory_count_items_counted_check",
      sql`(${table.counted} and ${table.closingQuantity} is not null) or (not ${table.counted} and ${table.closingQuantity} is null)`,
    ),
  ],
);
