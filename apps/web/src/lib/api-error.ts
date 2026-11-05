import { ApiError } from "@/api/http-client";

type ErrorPayload = { error: { code: string; message: string } };

export function getApiErrorMessage(
  error: unknown,
  messages: Record<string, string>,
  fallback: string,
) {
  if (error instanceof ApiError && isErrorPayload(error.data)) {
    return messages[error.data.error.code] ?? error.data.error.message;
  }
  return fallback;
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = value.error;
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string",
  );
}
