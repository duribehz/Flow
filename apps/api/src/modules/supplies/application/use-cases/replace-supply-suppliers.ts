import type {
  ReplaceSupplySuppliersInput,
  ReplaceSupplySuppliersOutput,
} from "../dto/replace-supply-suppliers.dto.js";
import { supplyErrors } from "../errors/supply.errors.js";
import type { SupplyRepository } from "../ports/supply.repository.js";
import type { UnitOfWork } from "../ports/unit-of-work.js";

export class ReplaceSupplySuppliers {
  constructor(
    private readonly supplies: SupplyRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(input: ReplaceSupplySuppliersInput): Promise<ReplaceSupplySuppliersOutput> {
    return this.unitOfWork.execute(async (executor) => {
      validateSupplierIds(input.supplierIds);

      const [supplyExists, suppliersExist] = await Promise.all([
        this.supplies.supplyExists(executor, input.supplyId),
        this.supplies.suppliersExist(executor, input.supplierIds),
      ]);

      if (!supplyExists) throw supplyErrors.supplyNotFound();
      if (!suppliersExist) throw supplyErrors.supplierNotFound();

      await this.supplies.replaceSuppliers(executor, input.supplyId, input.supplierIds);
      const supply = await this.supplies.findById(executor, input.supplyId);
      if (!supply) throw supplyErrors.supplyNotFound();

      return supply;
    });
  }
}

function validateSupplierIds(supplierIds: string[]) {
  if (supplierIds.length === 0) throw supplyErrors.supplierRequired();
  if (new Set(supplierIds).size !== supplierIds.length) throw supplyErrors.duplicateSupplierIds();
}
