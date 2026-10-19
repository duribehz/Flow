import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateSupplyInput } from "../supplies.dto.js";
import { SuppliesRepo } from "../supplies.repo.js";
import { validateSupplierIds } from "../validate-supplier-ids.js";

export async function createSupplyUseCase(input: CreateSupplyInput, db: Executor = DB) {
  validateSupplierIds(input.supplierIds);

  const suppliesRepo = new SuppliesRepo(db);
  const [categoryExists, activeUnitExists, suppliersExist] = await Promise.all([
    suppliesRepo.categoryExists(input.categoryId),
    suppliesRepo.activeUnitExists(input.unitId),
    suppliesRepo.suppliersExist(input.supplierIds),
  ]);

  if (!categoryExists) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");
  }

  if (!activeUnitExists) {
    throw new AppError(404, "UNIT_NOT_FOUND", "Active unit not found");
  }

  if (!suppliersExist) {
    throw new AppError(404, "SUPPLIER_NOT_FOUND", "One or more suppliers were not found");
  }

  const supply = await suppliesRepo.createSupply(input);

  if (!supply) {
    throw new AppError(409, "SUPPLY_SKU_CONFLICT", "A supply with this SKU already exists");
  }

  return supply;
}
