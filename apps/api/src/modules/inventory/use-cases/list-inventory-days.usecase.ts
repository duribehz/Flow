import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { ListInventoryDaysFilters } from "../inventory.repo.js";
import { InventoryRepo } from "../inventory.repo.js";

export function listInventoryDaysUseCase(filters: ListInventoryDaysFilters, db: Executor = DB) {
  return new InventoryRepo(db).listInventoryDays(filters);
}
