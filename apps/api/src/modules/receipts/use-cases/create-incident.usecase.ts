import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateIncidentInput } from "../incidents.dto.js";
import { IncidentsRepo } from "../incidents.repo.js";

export function createIncidentUseCase(
  actorId: string,
  input: CreateIncidentInput,
  db: Executor = DB,
) {
  return new IncidentsRepo(db).create(actorId, input);
}
