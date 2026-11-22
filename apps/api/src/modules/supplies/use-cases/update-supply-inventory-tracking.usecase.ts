import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { SuppliesRepo } from "../supplies.repo.js";

export async function updateSupplyInventoryTrackingUseCase(
  supplyId: string,
  trackInventory: boolean,
  db: Executor = DB,
) {
  const supply = await new SuppliesRepo(db).updateInventoryTracking(supplyId, trackInventory);
  if (!supply) throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");
  return supply;
}
