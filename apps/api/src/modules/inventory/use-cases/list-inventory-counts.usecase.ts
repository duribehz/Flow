import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { ListInventoryCountsFilters } from "../inventory.repo.js";
import { InventoryRepo } from "../inventory.repo.js";

export function listInventoryCountsUseCase(filters: ListInventoryCountsFilters, db: Executor = DB) {
  return new InventoryRepo(db).listInventoryCounts(filters);
}
