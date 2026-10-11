import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  userName: text('user_name').notNull(),
  password: text().notNull(),
}, (table) => [uniqueIndex('users_user_name_unique').on(table.userName)])
