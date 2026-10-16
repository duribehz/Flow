import type { Supply } from "../../domain/supply.js";

export interface ReplaceSupplySuppliersInput {
  supplyId: string;
  supplierIds: string[];
}

export type ReplaceSupplySuppliersOutput = Supply;
