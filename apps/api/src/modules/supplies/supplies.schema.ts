import { sql } from 'drizzle-orm'
import {
  boolean,
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

export const supplyUnit = pgEnum('supply_unit', [
  'unit',
  'box',
  'package',
  'kilogram',
  'gram',
  'liter',
  'milliliter',
])

export const categories = pgTable('categories', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
}, (table) => [uniqueIndex('categories_name_unique').on(table.name)])

export const supplies = pgTable('supplies', {
  id: uuid().primaryKey().defaultRandom(),
  sku: text().notNull(),
  name: text().notNull(),
  description: text(),
  unit: supplyUnit().notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  active: boolean().notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('supplies_sku_unique').on(table.sku),
  index('supplies_category_id_idx').on(table.categoryId),
])

export const branchSupplySettings = pgTable('branch_supply_settings', {
  id: uuid().primaryKey().defaultRandom(),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  supplyId: uuid('supply_id').notNull().references(() => supplies.id, { onDelete: 'cascade' }),
  minimumQuantity: bigint('minimum_quantity', { mode: 'number' }).notNull().default(0),
  targetQuantity: bigint('target_quantity', { mode: 'number' }).notNull().default(0),
  active: boolean().notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('branch_supply_settings_branch_supply_unique').on(table.branchId, table.supplyId),
  check('branch_supply_settings_quantities_check', sql`${table.minimumQuantity} >= 0 and ${table.targetQuantity} >= ${table.minimumQuantity}`),
])
