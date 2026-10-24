import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { branches } from "../branches/branches.schema.js";
import {
  replenishmentRequestItems,
  replenishmentRequests,
} from "../replenishments/replenishments.schema.js";
import { supplies } from "../supplies/supplies.schema.js";
import { usagePurposes } from "../usage-purposes/usage-purposes.schema.js";
import { users } from "../users/users.schema.js";

export const shipmentStatus = pgEnum("shipment_status", [
  "preparing",
  "dispatched",
  "delivered",
  "cancelled",
]);

export const shipments = pgTable(
  "shipments",
  {
    id: uuid().primaryKey().defaultRandom(),
    shipmentNumber: text("shipment_number").notNull(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    replenishmentRequestId: uuid("replenishment_request_id")
      .notNull()
      .references(() => replenishmentRequests.id),
    usagePurposeId: uuid("usage_purpose_id")
      .notNull()
      .references(() => usagePurposes.id),
    status: shipmentStatus().notNull().default("preparing"),
    preparedBy: uuid("prepared_by")
      .notNull()
      .references(() => users.id),
    dispatchedBy: uuid("dispatched_by").references(() => users.id),
    preparedAt: timestamp("prepared_at", { withTimezone: true }).notNull().defaultNow(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("shipments_shipment_number_unique").on(table.shipmentNumber),
    index("shipments_branch_id_idx").on(table.branchId),
    index("shipments_replenishment_request_id_idx").on(table.replenishmentRequestId),
    index("shipments_status_idx").on(table.status),
  ],
);

export const shipmentItems = pgTable(
  "shipment_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id),
    replenishmentRequestItemId: uuid("replenishment_request_item_id")
      .notNull()
      .references(() => replenishmentRequestItems.id),
    plannedQuantity: bigint("planned_quantity", { mode: "number" }).notNull(),
    shippedQuantity: bigint("shipped_quantity", { mode: "number" }).notNull().default(0),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("shipment_items_shipment_request_item_unique").on(
      table.shipmentId,
      table.replenishmentRequestItemId,
    ),
    index("shipment_items_request_item_id_idx").on(table.replenishmentRequestItemId),
    check(
      "shipment_items_quantities_check",
      sql`${table.plannedQuantity} > 0 and ${table.shippedQuantity} >= 0`,
    ),
  ],
);
