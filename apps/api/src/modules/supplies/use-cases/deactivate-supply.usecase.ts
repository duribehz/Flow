import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { SuppliesRepo } from "../supplies.repo.js";

export async function deactivateSupplyUseCase(supplyId: string, db: Executor = DB) {
  const supply = await new SuppliesRepo(db).updateSupply(supplyId, { active: false });
  if (!supply) throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");
  return supply;
}
