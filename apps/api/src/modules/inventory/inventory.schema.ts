import { sql } from 'drizzle-orm'
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
} from 'drizzle-orm/pg-core'

import { branches } from '../branches/branches.schema.js'
import { receiptItems } from '../receipts/receipts.schema.js'
import { supplies } from '../supplies/supplies.schema.js'
import { users } from '../users/users.schema.js'

export const inventoryShiftStatus = pgEnum('inventory_shift_status', ['open', 'closed'])
export const shiftName = pgEnum('shift_name', ['morning', 'afternoon', 'night'])
export const inventoryMovementType = pgEnum('inventory_movement_type', [
  'receipt',
  'consumption',
  'waste',
  'positive_adjustment',
  'negative_adjustment',
])

export const inventoryShifts = pgTable('inventory_shifts', {
  id: uuid().primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  businessDate: date('business_date').notNull(),
  shiftName: shiftName('shift_name').notNull(),
  status: inventoryShiftStatus().notNull().default('open'),
  openedBy: uuid('opened_by').notNull().references(() => users.id),
  closedBy: uuid('closed_by').references(() => users.id),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('inventory_shifts_branch_date_name_unique').on(table.branchId, table.businessDate, table.shiftName),
  index('inventory_shifts_status_idx').on(table.status),
])

export const inventoryClosures = pgTable('inventory_closures', {
  id: uuid().primaryKey().defaultRandom(),
  inventoryShiftId: uuid('inventory_shift_id').notNull().references(() => inventoryShifts.id),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  closedBy: uuid('closed_by').notNull().references(() => users.id),
  closedAt: timestamp('closed_at', { withTimezone: true }).notNull(),
  notes: text(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('inventory_closures_shift_unique').on(table.inventoryShiftId),
  index('inventory_closures_branch_id_idx').on(table.branchId),
])

export const inventoryClosureItems = pgTable('inventory_closure_items', {
  id: uuid().primaryKey().defaultRandom(),
  inventoryClosureId: uuid('inventory_closure_id').notNull().references(() => inventoryClosures.id, { onDelete: 'cascade' }),
  supplyId: uuid('supply_id').notNull().references(() => supplies.id),
  openingQuantity: bigint('opening_quantity', { mode: 'number' }).notNull(),
  receivedQuantity: bigint('received_quantity', { mode: 'number' }).notNull().default(0),
  consumedQuantity: bigint('consumed_quantity', { mode: 'number' }).notNull().default(0),
  wastedQuantity: bigint('wasted_quantity', { mode: 'number' }).notNull().default(0),
  positiveAdjustments: bigint('positive_adjustments', { mode: 'number' }).notNull().default(0),
  negativeAdjustments: bigint('negative_adjustments', { mode: 'number' }).notNull().default(0),
  theoreticalQuantity: bigint('theoretical_quantity', { mode: 'number' }).notNull(),
  physicalQuantity: bigint('physical_quantity', { mode: 'number' }).notNull(),
  varianceQuantity: bigint('variance_quantity', { mode: 'number' }).notNull(),
  surplusQuantity: bigint('surplus_quantity', { mode: 'number' }).notNull().default(0),
  shortageQuantity: bigint('shortage_quantity', { mode: 'number' }).notNull().default(0),
  targetQuantity: bigint('target_quantity', { mode: 'number' }).notNull(),
  suggestedQuantity: bigint('suggested_quantity', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('inventory_closure_items_closure_supply_unique').on(table.inventoryClosureId, table.supplyId),
])

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid().primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id),
  inventoryShiftId: uuid('inventory_shift_id').notNull().references(() => inventoryShifts.id),
  supplyId: uuid('supply_id').notNull().references(() => supplies.id),
  type: inventoryMovementType().notNull(),
  quantity: bigint('quantity', { mode: 'number' }).notNull(),
  receiptItemId: uuid('receipt_item_id').references(() => receiptItems.id),
  referenceType: text('reference_type'),
  referenceId: uuid('reference_id'),
}, (table) => [
  index('inventory_movements_branch_supply_idx').on(table.branchId, table.supplyId),
  index('inventory_movements_shift_id_idx').on(table.inventoryShiftId),
  index('inventory_movements_receipt_item_id_idx').on(table.receiptItemId),
  index('inventory_movements_reference_idx').on(table.referenceType, table.referenceId),
  check('inventory_movements_quantity_check', sql`${table.quantity} > 0`),
])
