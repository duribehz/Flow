import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { branches } from "../branches/branches.schema.js";
import { inventoryCounts } from "../inventory/inventory.schema.js";
import { supplies } from "../supplies/supplies.schema.js";
import { users } from "../users/users.schema.js";

export const replenishmentRequestStatus = pgEnum("replenishment_request_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "partially_fulfilled",
  "fulfilled",
  "cancelled",
]);

export const replenishmentRequests = pgTable(
  "replenishment_requests",
  {
    id: uuid().primaryKey().defaultRandom(),
    requestNumber: text("request_number").notNull(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    inventoryCountId: uuid("inventory_count_id")
      .notNull()
      .references(() => inventoryCounts.id),
    status: replenishmentRequestStatus().notNull().default("draft"),
    requestedBy: uuid("request_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("replenishment_requests_request_number_unique").on(table.requestNumber),
    uniqueIndex("replenishment_requests_inventory_count_unique").on(table.inventoryCountId),
    index("replenishment_requests_branch_id_idx").on(table.branchId),
    index("replenishment_requests_status_idx").on(table.status),
  ],
);

export const replenishmentRequestItems = pgTable(
  "replenishment_request_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    replenishmentRequestId: uuid("replenishment_request_id")
      .notNull()
      .references(() => replenishmentRequests.id, { onDelete: "cascade" }),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id),
    suggestedQuantity: bigint("suggested_quantity", { mode: "number" }).notNull().default(0),
    requestedQuantity: bigint("requested_quantity", { mode: "number" }).notNull(),
    approvedQuantity: bigint("approved_quantity", { mode: "number" }),
    fulfilledQuantity: bigint("fulfilled_quantity", { mode: "number" }).notNull().default(0),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("replenishment_request_items_request_supply_unique").on(
      table.replenishmentRequestId,
      table.supplyId,
    ),
    check(
      "replenishment_request_items_quantities_check",
      sql`${table.suggestedQuantity} >= 0 and ${table.requestedQuantity} > 0 and (${table.approvedQuantity} is null or ${table.approvedQuantity} >= 0) and ${table.fulfilledQuantity} >= 0`,
    ),
  ],
);

export const replenishmentRequestCounters = pgTable("replenishment_request_counters", {
  branchIdPrefix: text("branch_id_prefix").primaryKey(),
  lastSeq: integer("last_seq").notNull().default(0),
});
