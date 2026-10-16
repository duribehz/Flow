import type { Supplier } from "../../domain/supplier.js";
import type { CreateSupplierCommand } from "../dto/create-supplier-command.js";

export interface SuppliersRepository {
  findAll(): Promise<Supplier[]>;
  findById(supplierId: string): Promise<Supplier | undefined>;
  create(command: CreateSupplierCommand): Promise<Supplier | undefined>;
}
