import type { UnitOutput } from "../dto/unit-output.js";
import { UnitNotFoundError } from "../errors/unit-not-found-error.js";
import type { UnitsRepository } from "../ports/units-repository.js";

export class GetUnit {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  async execute(unitId: string): Promise<UnitOutput> {
    const unit = await this.unitsRepository.findById(unitId);

    if (!unit) {
      throw new UnitNotFoundError();
    }

    return unit;
  }
}
