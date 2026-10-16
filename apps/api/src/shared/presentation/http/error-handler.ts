import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { ApplicationError } from "@/shared/application/application-error.js";

const statusByErrorKind: Record<ApplicationError["kind"], ContentfulStatusCode> = {
  invalid_input: 400,
  not_found: 404,
  conflict: 409,
};

export const errorHandler: ErrorHandler = (error, context) => {
  if (error instanceof ApplicationError) {
    return context.json(
      { error: { code: error.code, message: error.message } },
      statusByErrorKind[error.kind],
    );
  }

  console.error(error);

  return context.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } },
    500,
  );
};
