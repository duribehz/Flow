import type { Category } from "../../../domain/category.js";
import type { categories } from "./categories.table.js";

type CategoryRow = typeof categories.$inferSelect;

export function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name };
}
