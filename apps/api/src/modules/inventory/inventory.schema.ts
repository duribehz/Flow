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

import { branches } from "../branches/branches.schema.js";
import { supplies } from "../supplies/supplies.schema.js";
import { users } from "../users/users.schema.js";

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

export const inventoryReceiptIncident = pgEnum("inventory_receipt_incident", [
  "none",
  "shortage",
  "surplus",
  "damaged",
]);

export const inventoryReceipts = pgTable(
  "inventory_receipts",
  {
    id: uuid().primaryKey().defaultRandom(),
    inventoryShiftId: uuid("inventory_shift_id")
      .notNull()
      .references(() => inventoryShifts.id),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id),
    purchaseId: uuid("purchase_id"),
    expectedQuantity: bigint("expected_quantity", { mode: "number" }),
    receivedQuantity: bigint("received_quantity", { mode: "number" }).notNull(),
    incidentType: inventoryReceiptIncident("incident_type").notNull().default("none"),
    notes: text(),
    receivedBy: uuid("received_by")
      .notNull()
      .references(() => users.id),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("inventory_receipts_shift_id_idx").on(table.inventoryShiftId),
    index("inventory_receipts_supply_id_idx").on(table.supplyId),
    check(
      "inventory_receipts_quantities_check",
      sql`${table.receivedQuantity} >= 0 and (${table.expectedQuantity} is null or ${table.expectedQuantity} >= 0)`,
    ),
  ],
);
