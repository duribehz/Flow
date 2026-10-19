import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { SuppliersRepo, type CreateSupplierInput } from "../suppliers.repo.js";

export async function createSupplierUseCase(input: CreateSupplierInput, db: Executor = DB) {
  const suppliersRepo = new SuppliersRepo(db);
  const supplier = await suppliersRepo.createSupplier(input);

  if (!supplier) {
    throw new AppError(409, "SUPPLIER_NAME_CONFLICT", "A supplier with this name already exists");
  }

  return supplier;
}
