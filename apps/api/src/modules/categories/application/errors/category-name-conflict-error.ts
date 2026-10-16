import { ApplicationError } from "@/shared/application/application-error.js";

export class CategoryNameConflictError extends ApplicationError {
  constructor() {
    super("conflict", "CATEGORY_NAME_CONFLICT", "A category with this name already exists");
  }
}
