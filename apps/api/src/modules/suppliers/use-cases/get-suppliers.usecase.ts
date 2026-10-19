import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { SuppliersRepo } from "../suppliers.repo.js";

export function getSuppliersUseCase(db: Executor = DB) {
  const suppliersRepo = new SuppliersRepo(db);

  return suppliersRepo.getSuppliers();
}
