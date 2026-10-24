import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { InventoryRepo } from "../inventory.repo.js";

export async function getInventoryCountUseCase(countId: string, db: Executor = DB) {
  const count = await new InventoryRepo(db).getInventoryCount(countId);
  if (!count) throw new AppError(404, "INVENTORY_COUNT_NOT_FOUND", "Inventory count not found");
  return count;
}
