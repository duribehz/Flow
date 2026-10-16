import { ApplicationError } from "@/shared/application/application-error.js";

export class SupplierNameConflictError extends ApplicationError {
  constructor() {
    super("conflict", "SUPPLIER_NAME_CONFLICT", "A supplier with this name already exists");
  }
}
