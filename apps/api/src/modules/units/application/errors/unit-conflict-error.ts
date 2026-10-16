import { ApplicationError } from "@/shared/application/application-error.js";

export class UnitConflictError extends ApplicationError {
  constructor() {
    super("conflict", "UNIT_CONFLICT", "A unit with this name or symbol already exists");
  }
}
