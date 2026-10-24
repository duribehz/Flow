import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import {
  type ListInventoryClosuresFilters,
  InventoryRepo,
} from "../inventory.repo.js";

export async function listInventoryClosuresUseCase(
  filters: ListInventoryClosuresFilters,
  db: Executor = DB,
) {
  const repo = new InventoryRepo(db);
  return repo.listClosures(filters);
}

export async function getInventoryClosureUseCase(closureId: string, db: Executor = DB) {
  const repo = new InventoryRepo(db);

  const closure = await repo.getClosure(closureId);
  if (!closure) {
    throw new AppError(404, "INVENTORY_CLOSURE_NOT_FOUND", "Inventory closure not found");
  }

  const items = await repo.getClosureItems(closureId);
  return { closure, items };
}
