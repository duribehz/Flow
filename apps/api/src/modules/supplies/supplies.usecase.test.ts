import { describe, expect, test } from "bun:test";

import { AppError } from "@/shared/errors/app-error.js";
import type { CreateSupplyInput, SuppliesRepository, Supply } from "./supplies.repo.js";
import { SuppliesUseCase } from "./supplies.usecase.js";

export const createSupplyInput: CreateSupplyInput = {
  sku: "COC-001",
  name: "Aceite vegetal",
  description: "Aceite para cocina",
  unitId: "10000000-0000-4000-8000-000000000001",
  unitCost: 4200,
  categoryId: "20000000-0000-4000-8000-000000000001",
  active: true,
};

export const supply: Supply = {
  id: "30000000-0000-4000-8000-000000000001",
  sku: createSupplyInput.sku,
  name: createSupplyInput.name,
  description: createSupplyInput.description ?? null,
  unitCost: createSupplyInput.unitCost ?? 0,
  active: createSupplyInput.active ?? true,
  category: {
    id: createSupplyInput.categoryId,
    name: "Aceites",
  },
  unit: {
    id: createSupplyInput.unitId,
    name: "Litro",
    symbol: "L",
  },
  createdAt: new Date("2026-10-13T10:00:00.000Z"),
  updatedAt: new Date("2026-10-13T10:00:00.000Z"),
};

function createRepo({
  categoryExists = true,
  activeUnitExists = true,
  duplicateSku = false,
} = {}): SuppliesRepository {
  return {
    async getSupplies() {
      return [supply];
    },
    async createSupply() {
      return duplicateSku ? undefined : supply;
    },
    async categoryExists() {
      return categoryExists;
    },
    async activeUnitExists() {
      return activeUnitExists;
    },
  };
}

describe("SuppliesUseCase", () => {
  test("lists supplies", async () => {
    const useCase = new SuppliesUseCase(createRepo());
    await expect(useCase.getSupplies()).resolves.toEqual([supply]);
  });

  test("creates a supply", async () => {
    const useCase = new SuppliesUseCase(createRepo());
    await expect(useCase.createSupply(createSupplyInput)).resolves.toEqual(supply);
  });

  test("rejects a missing category", async () => {
    const useCase = new SuppliesUseCase(createRepo({ categoryExists: false }));
    await expect(useCase.createSupply(createSupplyInput)).rejects.toMatchObject({
      status: 404,
      code: "CATEGORY_NOT_FOUND",
    } satisfies Partial<AppError>);
  });

  test("rejects a missing or inactive unit", async () => {
    const useCase = new SuppliesUseCase(createRepo({ activeUnitExists: false }));
    await expect(useCase.createSupply(createSupplyInput)).rejects.toMatchObject({
      status: 404,
      code: "UNIT_NOT_FOUND",
    } satisfies Partial<AppError>);
  });

  test("rejects a duplicated SKU", async () => {
    const useCase = new SuppliesUseCase(createRepo({ duplicateSku: true }));
    await expect(useCase.createSupply(createSupplyInput)).rejects.toMatchObject({
      status: 409,
      code: "SUPPLY_SKU_CONFLICT",
    } satisfies Partial<AppError>);
  });
});
