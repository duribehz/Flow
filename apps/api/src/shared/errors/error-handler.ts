import type { ErrorHandler } from "hono";

import { AppError } from "./app-error.js";

export const errorHandler: ErrorHandler = (error, context) => {
  if (error instanceof AppError) {
    return context.json({ error: { code: error.code, message: error.message } }, error.status);
  }

  console.error(error);

  return context.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } },
    500,
  );
};
