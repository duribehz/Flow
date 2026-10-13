import { describe, expect, test } from "bun:test";

import { AppError } from "@/shared/errors/app-error.js";
import type { Unit, UnitsRepository } from "./units.repo.js";
import { UnitsUseCase } from "./units.usecase.js";

export const unit: Unit = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Kilogramo",
  symbol: "kg",
  active: true,
  createdAt: new Date("2026-10-13T10:00:00.000Z"),
  updatedAt: new Date("2026-10-13T10:00:00.000Z"),
};

function createRepo({ unitExists = true, conflict = false } = {}): UnitsRepository {
  return {
    async getUnits() {
      return [unit];
    },
    async getUnitById() {
      return unitExists ? unit : undefined;
    },
    async createUnit() {
      return conflict ? undefined : unit;
    },
  };
}

describe("UnitsUseCase", () => {
  test("lists units", async () => {
    const useCase = new UnitsUseCase(createRepo());
    await expect(useCase.getUnits()).resolves.toEqual([unit]);
  });

  test("gets a unit by ID", async () => {
    const useCase = new UnitsUseCase(createRepo());
    await expect(useCase.getUnitById(unit.id)).resolves.toEqual(unit);
  });

  test("rejects a missing unit", async () => {
    const useCase = new UnitsUseCase(createRepo({ unitExists: false }));
    await expect(useCase.getUnitById(unit.id)).rejects.toMatchObject({
      status: 404,
      code: "UNIT_NOT_FOUND",
    } satisfies Partial<AppError>);
  });

  test("creates a unit", async () => {
    const useCase = new UnitsUseCase(createRepo());
    await expect(
      useCase.createUnit({ name: unit.name, symbol: unit.symbol, active: true }),
    ).resolves.toEqual(unit);
  });

  test("rejects a duplicated name or symbol", async () => {
    const useCase = new UnitsUseCase(createRepo({ conflict: true }));
    await expect(
      useCase.createUnit({ name: unit.name, symbol: unit.symbol, active: true }),
    ).rejects.toMatchObject({
      status: 409,
      code: "UNIT_CONFLICT",
    } satisfies Partial<AppError>);
  });
});
