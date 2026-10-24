import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { InventoryRepo } from "../inventory.repo.js";

export async function getInventoryDayUseCase(dayId: string, db: Executor = DB) {
  const day = await new InventoryRepo(db).getInventoryDay(dayId);
  if (!day) throw new AppError(404, "INVENTORY_DAY_NOT_FOUND", "Inventory day not found");
  return day;
}
