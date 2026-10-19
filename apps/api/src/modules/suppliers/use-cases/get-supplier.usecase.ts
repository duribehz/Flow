import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { SuppliersRepo } from "../suppliers.repo.js";

export async function getSupplierUseCase(supplierId: string, db: Executor = DB) {
  const suppliersRepo = new SuppliersRepo(db);
  const supplier = await suppliersRepo.getSupplierById(supplierId);

  if (!supplier) {
    throw new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier not found");
  }

  return supplier;
}
