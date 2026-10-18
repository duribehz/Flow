import { AppError } from "@/shared/errors/app-error.js";
import type { CreateUnitInput, UnitsRepository } from "./units.repo.js";

export class UnitsUseCase {
  constructor(private readonly unitsRepo: UnitsRepository) {}

  getUnits() {
    return this.unitsRepo.getUnits();
  }

  async getUnitById(unitId: string) {
    const unit = await this.unitsRepo.getUnitById(unitId);

    if (!unit) {
      throw new AppError(404, "UNIT_NOT_FOUND", "Unit not found");
    }

    return unit;
  }

  async createUnit(input: CreateUnitInput) {
    const unit = await this.unitsRepo.createUnit(input);

    if (!unit) {
      throw new AppError(409, "UNIT_CONFLICT", "A unit with this name or symbol already exists");
    }

    return unit;
  }
}
