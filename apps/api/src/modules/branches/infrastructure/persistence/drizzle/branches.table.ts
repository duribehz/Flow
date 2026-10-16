import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const branches = pgTable(
  "branches",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
  },
  (table) => [uniqueIndex("branches_name_unique").on(table.name)],
);
