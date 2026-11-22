import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { UpdateSupplyInput } from "../supplies.dto.js";
import { SuppliesRepo } from "../supplies.repo.js";
import { validateSupplierIds } from "../validate-supplier-ids.js";

export async function updateSupplyUseCase(
  supplyId: string,
  input: UpdateSupplyInput,
  db: Executor = DB,
) {
  if (input.supplierIds) validateSupplierIds(input.supplierIds);

  const suppliesRepo = new SuppliesRepo(db);
  if (!(await suppliesRepo.supplyExists(supplyId))) {
    throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");
  }
  if (input.categoryId && !(await suppliesRepo.categoryExists(input.categoryId))) {
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");
  }
  if (input.unitId && !(await suppliesRepo.activeUnitExists(input.unitId))) {
    throw new AppError(404, "UNIT_NOT_FOUND", "Active unit not found");
  }
  if (input.supplierIds && !(await suppliesRepo.suppliersExist(input.supplierIds))) {
    throw new AppError(404, "SUPPLIER_NOT_FOUND", "One or more suppliers were not found");
  }

  try {
    const supply = await suppliesRepo.updateSupply(supplyId, input);
    if (!supply) throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");
    return supply;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(409, "SUPPLY_SKU_CONFLICT", "A supply with this SKU already exists");
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
