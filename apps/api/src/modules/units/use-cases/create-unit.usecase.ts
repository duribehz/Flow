import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { UnitsRepo, type CreateUnitInput } from "../units.repo.js";

export async function createUnitUseCase(input: CreateUnitInput, db: Executor = DB) {
  const unitsRepo = new UnitsRepo(db);
  const unit = await unitsRepo.createUnit(input);

  if (!unit) {
    throw new AppError(409, "UNIT_CONFLICT", "A unit with this name or symbol already exists");
  }

  return unit;
}
