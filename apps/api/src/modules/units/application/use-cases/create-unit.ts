import type { CreateUnitCommand } from "../dto/create-unit-command.js";
import type { UnitOutput } from "../dto/unit-output.js";
import { UnitConflictError } from "../errors/unit-conflict-error.js";
import type { UnitsRepository } from "../ports/units-repository.js";

export class CreateUnit {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  async execute(command: CreateUnitCommand): Promise<UnitOutput> {
    const unit = await this.unitsRepository.create(command);

    if (!unit) {
      throw new UnitConflictError();
    }

    return unit;
  }
}
