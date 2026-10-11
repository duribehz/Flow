import { sql } from 'drizzle-orm'
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
} from 'drizzle-orm/pg-core'

import { branches } from '../branches/branches.schema.js'
import { shipmentItems, shipments } from '../shipments/shipments.schema.js'
import { supplies } from '../supplies/supplies.schema.js'
import { users } from '../users/users.schema.js'

export const receiptStatus = pgEnum('receipt_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
])
export const receiptItemCondition = pgEnum('receipt_item_condition', [
  'good',
  'damaged',
  'expired',
  'incorrect',
])
export const incidentType = pgEnum('incident_type', [
  'missing',
  'damaged',
  'excess',
  'expired',
  'incorrect',
  'other',
])
export const incidentStatus = pgEnum('incident_status', [
  'open',
  'investigating',
  'resolved',
  'closed',
])

export const receipts = pgTable('receipts', {
  id: uuid().primaryKey().defaultRandom(),
  receiptNumber: text('receipt_number').notNull(),
  shipmentId: uuid('shipment_id').notNull().references(() => shipments.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  status: receiptStatus().notNull().default('pending'),
  receivedBy: uuid('received_by').references(() => users.id),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('receipts_receipt_number_unique').on(table.receiptNumber),
  uniqueIndex('receipts_shipment_unique').on(table.shipmentId),
  index('receipts_branch_id_idx').on(table.branchId),
  index('receipts_status_idx').on(table.status),
])

export const receiptItems = pgTable('receipt_items', {
  id: uuid().primaryKey().defaultRandom(),
  receiptId: uuid('receipt_id').notNull().references(() => receipts.id, { onDelete: 'cascade' }),
  shipmentItemId: uuid('shipment_item_id').notNull().references(() => shipmentItems.id),
  supplyId: uuid('supply_id').notNull().references(() => supplies.id),
  expectedQuantity: bigint('expected_quantity', { mode: 'number' }).notNull(),
  receivedQuantity: bigint('received_quantity', { mode: 'number' }).notNull(),
  acceptedQuantity: bigint('accepted_quantity', { mode: 'number' }).notNull(),
  rejectedQuantity: bigint('rejected_quantity', { mode: 'number' }).notNull().default(0),
  condition: receiptItemCondition(),
  checkedAt: timestamp('checked_at', { withTimezone: true }),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('receipt_items_receipt_shipment_item_unique').on(table.receiptId, table.shipmentItemId),
  check('receipt_items_quantities_check', sql`${table.expectedQuantity} >= 0 and ${table.receivedQuantity} >= 0 and ${table.acceptedQuantity} >= 0 and ${table.rejectedQuantity} >= 0 and ${table.acceptedQuantity} + ${table.rejectedQuantity} <= ${table.receivedQuantity}`),
])

export const incidents = pgTable('incidents', {
  id: uuid().primaryKey().defaultRandom(),
  incidentNumber: text('incident_number').notNull(),
  receiptId: uuid('receipt_id').notNull().references(() => receipts.id),
  receiptItemId: uuid('receipt_item_id').references(() => receiptItems.id),
  type: incidentType().notNull(),
  status: incidentStatus().notNull().default('open'),
  description: text().notNull(),
  reportedBy: uuid('reported_by').notNull().references(() => users.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  resolution: text(),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('incidents_incident_number_unique').on(table.incidentNumber),
  index('incidents_receipt_id_idx').on(table.receiptId),
  index('incidents_status_idx').on(table.status),
])
