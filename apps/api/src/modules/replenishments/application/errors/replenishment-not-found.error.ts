import { ApplicationError } from "@/shared/application/application-error.js";

export class ReplenishmentNotFoundError extends ApplicationError {
  constructor() {
    super("not_found", "REPLENISHMENT_NOT_FOUND", "Replenishment request not found");
  }
}
