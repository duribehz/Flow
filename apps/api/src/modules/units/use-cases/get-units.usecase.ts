import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { UnitsRepo } from "../units.repo.js";

export function getUnitsUseCase(db: Executor = DB) {
  const unitsRepo = new UnitsRepo(db);
  return unitsRepo.getUnits();
}
