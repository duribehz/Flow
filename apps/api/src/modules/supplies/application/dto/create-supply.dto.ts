import type { Supply } from "../../domain/supply.js";

export interface CreateSupplyInput {
  sku: string;
  name: string;
  description?: string | null;
  unitId: string;
  unitCost?: number;
  categoryId: string;
  supplierIds: string[];
  active?: boolean;
}

export type CreateSupplyOutput = Supply;
