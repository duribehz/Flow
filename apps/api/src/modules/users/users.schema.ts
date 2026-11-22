import { sql } from "drizzle-orm";
import {
  boolean,
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

export const userRole = pgEnum("user_role", ["manager", "admin", "super_admin"]);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    userName: text("user_name").notNull(),
    passwordHash: text("password").notNull(),
    role: userRole().notNull().default("admin"),
    branchId: uuid("branch_id").references(() => branches.id),
    active: boolean().notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_user_name_unique").on(table.userName),
    index("users_branch_id_idx").on(table.branchId),
    check(
      "users_role_branch_check",
      sql`(${table.role} = 'manager' and ${table.branchId} is not null) or (${table.role} <> 'manager' and ${table.branchId} is null)`,
    ),
  ],
);
