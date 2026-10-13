import { AppError } from "@/shared/errors/app-error.js";
import type { CreateSupplyInput, SuppliesRepository } from "./supplies.repo.js";

export class SuppliesUseCase {
  constructor(private readonly suppliesRepo: SuppliesRepository) {}

  getSupplies() {
    return this.suppliesRepo.getSupplies();
  }

  async createSupply(input: CreateSupplyInput) {
    const [categoryExists, activeUnitExists] = await Promise.all([
      this.suppliesRepo.categoryExists(input.categoryId),
      this.suppliesRepo.activeUnitExists(input.unitId),
    ]);

    if (!categoryExists) {
      throw new AppError(404, "CATEGORY_NOT_FOUND", "Category not found");
    }

    if (!activeUnitExists) {
      throw new AppError(404, "UNIT_NOT_FOUND", "Active unit not found");
    }

    const supply = await this.suppliesRepo.createSupply(input);

    if (!supply) {
      throw new AppError(409, "SUPPLY_SKU_CONFLICT", "A supply with this SKU already exists");
    }

    return supply;
  }
}
