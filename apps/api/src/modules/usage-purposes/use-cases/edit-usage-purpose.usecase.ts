import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { EditUsagePurposeInput } from "../usage-purposes.dto.js";
import { UsagePurposesRepo } from "../usage-purposes.repo.js";

export async function editUsagePurposeUseCase(
  usagePurposeId: string,
  input: EditUsagePurposeInput,
  db: Executor = DB,
) {
  try {
    const usagePurpose = await new UsagePurposesRepo(db).editUsagePurpose(usagePurposeId, input);

    if (!usagePurpose) {
      throw new AppError(404, "USAGE_PURPOSE_NOT_FOUND", "Usage purpose not found");
    }

    return usagePurpose;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        409,
        "USAGE_PURPOSE_NAME_CONFLICT",
        "A usage purpose with this name already exists",
      );
    }

    throw error;
  }
}

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
