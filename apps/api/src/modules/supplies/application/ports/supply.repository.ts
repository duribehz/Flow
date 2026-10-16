import type { Supply } from "../../domain/supply.js";
import type { CreateSupplyInput } from "../dto/create-supply.dto.js";
import type { Executor } from "./unit-of-work.js";

export interface SupplyRepository {
  list(): Promise<Supply[]>;
  findById(executor: Executor, supplyId: string): Promise<Supply | undefined>;
  create(executor: Executor, input: CreateSupplyInput): Promise<string | undefined>;
  replaceSuppliers(executor: Executor, supplyId: string, supplierIds: string[]): Promise<void>;
  categoryExists(executor: Executor, categoryId: string): Promise<boolean>;
  activeUnitExists(executor: Executor, unitId: string): Promise<boolean>;
  suppliersExist(executor: Executor, supplierIds: string[]): Promise<boolean>;
  supplyExists(executor: Executor, supplyId: string): Promise<boolean>;
}
