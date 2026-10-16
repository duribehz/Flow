import type { CreateSupplyInput, CreateSupplyOutput } from "../dto/create-supply.dto.js";
import { supplyErrors } from "../errors/supply.errors.js";
import type { SupplyRepository } from "../ports/supply.repository.js";
import type { UnitOfWork } from "../ports/unit-of-work.js";

export class CreateSupply {
  constructor(
    private readonly supplies: SupplyRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(input: CreateSupplyInput): Promise<CreateSupplyOutput> {
    return this.unitOfWork.execute(async (executor) => {
      validateSupplierIds(input.supplierIds);

      const [categoryExists, activeUnitExists, suppliersExist] = await Promise.all([
        this.supplies.categoryExists(executor, input.categoryId),
        this.supplies.activeUnitExists(executor, input.unitId),
        this.supplies.suppliersExist(executor, input.supplierIds),
      ]);

      if (!categoryExists) throw supplyErrors.categoryNotFound();
      if (!activeUnitExists) throw supplyErrors.unitNotFound();
      if (!suppliersExist) throw supplyErrors.supplierNotFound();

      const supplyId = await this.supplies.create(executor, input);
      if (!supplyId) throw supplyErrors.skuConflict();

      const supply = await this.supplies.findById(executor, supplyId);
      if (!supply) throw supplyErrors.supplyNotFound();

      return supply;
    });
  }
}

function validateSupplierIds(supplierIds: string[]) {
  if (supplierIds.length === 0) throw supplyErrors.supplierRequired();
  if (new Set(supplierIds).size !== supplierIds.length) throw supplyErrors.duplicateSupplierIds();
}
