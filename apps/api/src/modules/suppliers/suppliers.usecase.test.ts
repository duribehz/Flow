import { describe, expect, test } from "bun:test";

import { AppError } from "@/shared/errors/app-error.js";
import type { Supplier, SuppliersRepository } from "./suppliers.repo.js";
import { SuppliersUseCase } from "./suppliers.usecase.js";

export const supplier: Supplier = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Central de Abastos MX",
  phoneNumber: "+52 55 1234 5678",
  email: "ventas@central.example",
};

function createRepo({ supplierExists = true, conflict = false } = {}): SuppliersRepository {
  return {
    async getSuppliers() {
      return [supplier];
    },
    async getSupplierById() {
      return supplierExists ? supplier : undefined;
    },
    async createSupplier() {
      return conflict ? undefined : supplier;
    },
  };
}

describe("SuppliersUseCase", () => {
  test("lists suppliers", async () => {
    const useCase = new SuppliersUseCase(createRepo());
    await expect(useCase.getSuppliers()).resolves.toEqual([supplier]);
  });

  test("gets a supplier by ID", async () => {
    const useCase = new SuppliersUseCase(createRepo());
    await expect(useCase.getSupplierById(supplier.id)).resolves.toEqual(supplier);
  });

  test("rejects a missing supplier", async () => {
    const useCase = new SuppliersUseCase(createRepo({ supplierExists: false }));
    await expect(useCase.getSupplierById(supplier.id)).rejects.toMatchObject({
      status: 404,
      code: "SUPPLIER_NOT_FOUND",
    } satisfies Partial<AppError>);
  });

  test("creates a supplier", async () => {
    const useCase = new SuppliersUseCase(createRepo());
    await expect(
      useCase.createSupplier({
        name: supplier.name,
        phoneNumber: supplier.phoneNumber,
        email: supplier.email,
      }),
    ).resolves.toEqual(supplier);
  });

  test("rejects a duplicated name", async () => {
    const useCase = new SuppliersUseCase(createRepo({ conflict: true }));
    await expect(useCase.createSupplier({ name: supplier.name })).rejects.toMatchObject({
      status: 409,
      code: "SUPPLIER_NAME_CONFLICT",
    } satisfies Partial<AppError>);
  });
});
