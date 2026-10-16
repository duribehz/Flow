import type { Unit } from "../../domain/unit.js";
import type { CreateUnitCommand } from "../dto/create-unit-command.js";

export interface UnitsRepository {
  findAll(): Promise<Unit[]>;
  findById(unitId: string): Promise<Unit | undefined>;
  create(command: CreateUnitCommand): Promise<Unit | undefined>;
}
