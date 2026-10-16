import type { UnitOutput } from "../../application/dto/unit-output.js";

export function toUnitResponse(unit: UnitOutput) {
  return {
    ...unit,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  };
}
