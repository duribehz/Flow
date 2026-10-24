import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { IncidentsRepo } from "../incidents.repo.js";

export function listIncidentsUseCase(
  filters: { receiptId?: string; status?: "open" | "investigating" | "resolved" | "closed" },
  db: Executor = DB,
) {
  return new IncidentsRepo(db).list(filters);
}
