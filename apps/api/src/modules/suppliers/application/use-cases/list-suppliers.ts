import type { SupplierOutput } from "../dto/supplier-output.js";
import type { SuppliersRepository } from "../ports/suppliers-repository.js";

export class ListSuppliers {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  execute(): Promise<SupplierOutput[]> {
    return this.suppliersRepository.findAll();
  }
}
