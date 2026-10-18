import { AppError } from "@/shared/errors/app-error.js";
import type { CreateSupplyInput, SuppliesRepository } from "./supplies.repo.js";

export class SuppliesUseCase {
  constructor(private readonly suppliesRepo: SuppliesRepository) {}

  getSupplies() {
    return this.suppliesRepo.getSupplies();
  }

  async createSupply(input: CreateSupplyInput) {
    this.validateSupplierIds(input.supplierIds);

    const [categoryExists, activeUnitExists, suppliersExist] = await Promise.all([
      this.suppliesRepo.categoryExists(input.categoryId),
      this.suppliesRepo.activeUnitExists(input.unitId),
      this.suppliesRepo.suppliersExist(input.supplierIds),
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

    const supply = await this.suppliesRepo.createSupply(input);

    if (!supply) {
      throw new AppError(409, "SUPPLY_SKU_CONFLICT", "A supply with this SKU already exists");
    }

    return supply;
  }

  async replaceSupplySuppliers(supplyId: string, supplierIds: string[]) {
    this.validateSupplierIds(supplierIds);

    const [supplyExists, suppliersExist] = await Promise.all([
      this.suppliesRepo.supplyExists(supplyId),
      this.suppliesRepo.suppliersExist(supplierIds),
    ]);

    if (!supplyExists) {
      throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");
    }

    if (!suppliersExist) {
      throw new AppError(404, "SUPPLIER_NOT_FOUND", "One or more suppliers were not found");
    }

    const supply = await this.suppliesRepo.replaceSupplySuppliers(supplyId, supplierIds);

    if (!supply) {
      throw new AppError(404, "SUPPLY_NOT_FOUND", "Supply not found");
    }

    return supply;
  }

  private validateSupplierIds(supplierIds: string[]) {
    if (supplierIds.length === 0) {
      throw new AppError(400, "SUPPLIER_REQUIRED", "At least one supplier is required");
    }

    if (new Set(supplierIds).size !== supplierIds.length) {
      throw new AppError(400, "DUPLICATE_SUPPLIER_IDS", "Supplier IDs must be unique");
    }
  }
}
