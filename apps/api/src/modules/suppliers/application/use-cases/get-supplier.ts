import type { SupplierOutput } from "../dto/supplier-output.js";
import { SupplierNotFoundError } from "../errors/supplier-not-found-error.js";
import type { SuppliersRepository } from "../ports/suppliers-repository.js";

export class GetSupplier {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  async execute(supplierId: string): Promise<SupplierOutput> {
    const supplier = await this.suppliersRepository.findById(supplierId);

    if (!supplier) {
      throw new SupplierNotFoundError();
    }

    return supplier;
  }
}
