import { ApplicationError } from "@/shared/application/application-error.js";

export class UnitNotFoundError extends ApplicationError {
  constructor() {
    super("not_found", "UNIT_NOT_FOUND", "Unit not found");
  }
}
