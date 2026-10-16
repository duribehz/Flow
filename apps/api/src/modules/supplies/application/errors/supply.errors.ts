import { ApplicationError } from "@/shared/application/application-error.js";

export const supplyErrors = {
  categoryNotFound: () =>
    new ApplicationError("not_found", "CATEGORY_NOT_FOUND", "Category not found"),
  unitNotFound: () => new ApplicationError("not_found", "UNIT_NOT_FOUND", "Active unit not found"),
  supplierNotFound: () =>
    new ApplicationError("not_found", "SUPPLIER_NOT_FOUND", "One or more suppliers were not found"),
  supplyNotFound: () => new ApplicationError("not_found", "SUPPLY_NOT_FOUND", "Supply not found"),
  skuConflict: () =>
    new ApplicationError(
      "conflict",
      "SUPPLY_SKU_CONFLICT",
      "A supply with this SKU already exists",
    ),
  supplierRequired: () =>
    new ApplicationError("invalid_input", "SUPPLIER_REQUIRED", "At least one supplier is required"),
  duplicateSupplierIds: () =>
    new ApplicationError("invalid_input", "DUPLICATE_SUPPLIER_IDS", "Supplier IDs must be unique"),
};
