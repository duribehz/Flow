import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { SuppliesRepo } from "../supplies.repo.js";
import { validateSupplierIds } from "../validate-supplier-ids.js";

export async function replaceSupplySuppliersUseCase(
  supplyId: string,
  supplierIds: string[],
  db: Executor = DB,
) {
  validateSupplierIds(supplierIds);

  const suppliesRepo = new SuppliesRepo(db);
  const [supplyExists, suppliersExist] = await Promise.all([
    suppliesRepo.supplyExists(supplyId),
    suppliesRepo.suppliersExist(supplierIds),
  ]);

  if (!supplyExists) {
    throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");
  }

  if (!suppliersExist) {
    throw new AppError(404, "SUPPLIER_NOT_FOUND", "One or more suppliers were not found");
  }

  const supply = await suppliesRepo.replaceSupplySuppliers(supplyId, supplierIds);

  if (!supply) {
    throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");
  }

  return supply;
}
