import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { UnitsRepo } from "../units.repo.js";

export async function getUnitUseCase(unitId: string, db: Executor = DB) {
  const unitsRepo = new UnitsRepo(db);
  const unit = await unitsRepo.getUnitById(unitId);

  if (!unit) {
    throw new AppError(404, "UNIT_NOT_FOUND", "Unit not found");
  }

  return unit;
}
