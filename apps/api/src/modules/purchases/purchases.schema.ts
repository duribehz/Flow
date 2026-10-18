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

import { suppliers } from "../suppliers/suppliers.schema.js";
import { supplies } from "../supplies/supplies.schema.js";
import { users } from "../users/users.schema.js";

export const purchaseOrderStatus = pgEnum("purchase_order_status", [
  "draft",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
]);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    status: purchaseOrderStatus().notNull().default("draft"),
    expectedDeliveryDate: date("expected_delivery_date"),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    notes: text(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("purchase_orders_order_number_unique").on(table.orderNumber),
    index("purchase_orders_supplier_id_idx").on(table.supplierId),
    index("purchase_orders_status_idx").on(table.status),
  ],
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    supplyId: uuid("supply_id")
      .notNull()
      .references(() => supplies.id),
    orderedQuantity: bigint("ordered_quantity", { mode: "number" }).notNull(),
    receivedQuantity: bigint("received_quantity", { mode: "number" }).notNull().default(0),
    unitPrice: bigint("unit_price", { mode: "number" }).notNull(),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("purchase_order_items_order_supply_unique").on(
      table.purchaseOrderId,
      table.supplyId,
    ),
    check(
      "purchase_order_items_quantities_check",
      sql`${table.orderedQuantity} > 0 and ${table.receivedQuantity} >= 0 and ${table.unitPrice} >= 0`,
    ),
  ],
);
