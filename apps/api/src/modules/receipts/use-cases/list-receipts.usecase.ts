import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ReceiptsRepo } from "../receipts.repo.js";

export function listReceiptsUseCase(
  filters: { status?: "pending" | "in_progress" | "completed" | "cancelled"; branchId?: string },
  db: Executor = DB,
) {
  return new ReceiptsRepo(db).list(filters);
}
