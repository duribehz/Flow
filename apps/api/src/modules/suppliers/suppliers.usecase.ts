import { AppError } from "@/shared/errors/app-error.js";
import type { CreateSupplierInput, SuppliersRepository } from "./suppliers.repo.js";

export class SuppliersUseCase {
  constructor(private readonly suppliersRepo: SuppliersRepository) {}

  getSuppliers() {
    return this.suppliersRepo.getSuppliers();
  }

  async getSupplierById(supplierId: string) {
    const supplier = await this.suppliersRepo.getSupplierById(supplierId);

    if (!supplier) {
      throw new AppError(404, "SUPPLIER_NOT_FOUND", "Supplier not found");
    }

    return supplier;
  }

  async createSupplier(input: CreateSupplierInput) {
    const supplier = await this.suppliersRepo.createSupplier(input);

    if (!supplier) {
      throw new AppError(409, "SUPPLIER_NAME_CONFLICT", "A supplier with this name already exists");
    }

    return supplier;
  }
}
