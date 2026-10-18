import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    phoneNumber: text("phone_number"),
    email: text(),
  },
  (table) => [uniqueIndex("suppliers_name_unique").on(table.name)],
);
