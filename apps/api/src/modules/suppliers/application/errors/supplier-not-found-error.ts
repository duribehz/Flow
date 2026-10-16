import { ApplicationError } from "@/shared/application/application-error.js";

export class SupplierNotFoundError extends ApplicationError {
  constructor() {
    super("not_found", "SUPPLIER_NOT_FOUND", "Supplier not found");
  }
}
