import { AppError } from "@/shared/errors/app-error.js";

export function validateSupplierIds(supplierIds: string[]) {
  if (supplierIds.length === 0) {
    throw new AppError(400, "SUPPLIER_REQUIRED", "At least one supplier is required");
  }

  if (new Set(supplierIds).size !== supplierIds.length) {
    throw new AppError(400, "DUPLICATE_SUPPLIER_IDS", "Supplier IDs must be unique");
  }
}
