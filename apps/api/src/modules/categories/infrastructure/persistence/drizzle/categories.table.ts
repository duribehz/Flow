import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
  },
  (table) => [uniqueIndex("categories_name_unique").on(table.name)],
);
