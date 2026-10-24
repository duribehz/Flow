import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import {
  type ListInventoryShiftsFilters,
  InventoryRepo,
} from "../inventory.repo.js";

export async function listShiftsUseCase(filters: ListInventoryShiftsFilters, db: Executor = DB) {
  const repo = new InventoryRepo(db);
  return repo.listShifts(filters);
}

export async function getShiftUseCase(shiftId: string, db: Executor = DB) {
  const repo = new InventoryRepo(db);
  const shift = await repo.getShift(shiftId);
  if (!shift) {
    throw new AppError(404, "INVENTORY_SHIFT_NOT_FOUND", "Inventory shift not found");
  }
  return shift;
}
