import type { CreateSupplierCommand } from "../dto/create-supplier-command.js";
import type { SupplierOutput } from "../dto/supplier-output.js";
import { SupplierNameConflictError } from "../errors/supplier-name-conflict-error.js";
import type { SuppliersRepository } from "../ports/suppliers-repository.js";

export class CreateSupplier {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  async execute(command: CreateSupplierCommand): Promise<SupplierOutput> {
    const supplier = await this.suppliersRepository.create(command);

    if (!supplier) {
      throw new SupplierNameConflictError();
    }

    return supplier;
  }
}
