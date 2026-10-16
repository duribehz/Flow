import type { UnitOutput } from "../dto/unit-output.js";
import type { UnitsRepository } from "../ports/units-repository.js";

export class ListUnits {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  execute(): Promise<UnitOutput[]> {
    return this.unitsRepository.findAll();
  }
}
