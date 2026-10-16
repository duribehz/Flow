export type ApplicationErrorKind = "invalid_input" | "not_found" | "conflict";

export class ApplicationError extends Error {
  constructor(
    readonly kind: ApplicationErrorKind,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
