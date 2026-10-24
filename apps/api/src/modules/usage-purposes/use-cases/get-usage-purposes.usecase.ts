import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { ListUsagePurposesQuery } from "../usage-purposes.dto.js";
import { UsagePurposesRepo } from "../usage-purposes.repo.js";

export function getUsagePurposesUseCase(filters: ListUsagePurposesQuery, db: Executor = DB) {
  return new UsagePurposesRepo(db).getUsagePurposes(filters);
}
