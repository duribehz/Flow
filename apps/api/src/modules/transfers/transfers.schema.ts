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
import { inventoryDays } from "../inventory/inventory.schema.js";
import { supplies } from "../supplies/supplies.schema.js";
import { users } from "../users/users.schema.js";

export const branchTransferStatus = pgEnum("branch_transfer_status", [
  "pending",
  "accepted",
  "cancelled",
]);

export const branchTransfers = pgTable(
  "branch_transfers",
  {
    id: uuid().primaryKey().defaultRandom(),
    transferNumber: text("transfer_number").notNull(),
    fromBranchId: uuid("from_branch_id")
      .notNull()
      .references(() => branches.id),
    toBranchId: uuid("to_branch_id")
      .notNull()
      .references(() => branches.id),
    sentBusinessDate: date("sent_business_date").notNull(),
    status: branchTransferStatus().notNull().default("pending"),
    sentBy: uuid("sent_by")
      .notNull()
      .references(() => users.id),
    acceptedBy: uuid("accepted_by").references(() => users.id),
    acceptedInventoryDayId: uuid("accepted_inventory_day_id").references(() => inventoryDays.id),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("branch_transfers_number_unique").on(table.transferNumber),
    index("branch_transfers_from_branch_idx").on(table.fromBranchId, table.sentAt),
    index("branch_transfers_to_branch_status_idx").on(table.toBranchId, table.status),
    index("branch_transfers_inventory_day_idx").on(table.acceptedInventoryDayId),
    check(
      "branch_transfers_distinct_branches_check",
      sql`${table.fromBranchId} <> ${table.toBranchId}`,
    ),
    check(
      "branch_transfers_acceptance_state_check",
      sql`(${table.status} = 'pending' and ${table.acceptedBy} is null and ${table.acceptedInventoryDayId} is null and ${table.acceptedAt} is null and ${table.cancelledBy} is null and ${table.cancelledAt} is null) or (${table.status} = 'accepted' and ${table.acceptedBy} is not null and ${table.acceptedInventoryDayId} is not null and ${table.acceptedAt} is not null and ${table.cancelledBy} is null and ${table.cancelledAt} is null) or (${table.status} = 'cancelled' and ${table.acceptedBy} is null and ${table.acceptedInventoryDayId} is null and ${table.acceptedAt} is null and ${table.cancelledBy} is not null and ${table.cancelledAt} is not null)`,
    ),
  ],
);

export const branchTransferItems = pgTable(
  "branch_transfer_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => branchTransfers.id, { onDelete: "cascade" }),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id),
    quantity: bigint({ mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("branch_transfer_items_transfer_supply_unique").on(
      table.transferId,
      table.supplyId,
    ),
    index("branch_transfer_items_supply_idx").on(table.supplyId),
    check(
      "branch_transfer_items_quantity_check",
      sql`${table.quantity} between 1 and 9007199254740991`,
    ),
  ],
);
