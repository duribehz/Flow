import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const units = pgTable(
  "units",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    symbol: text().notNull(),
    active: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("units_name_unique").on(table.name),
    uniqueIndex("units_symbol_unique").on(table.symbol),
  ],
);
