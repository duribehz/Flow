import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { UpdateIncidentInput } from "../incidents.dto.js";
import { IncidentsRepo } from "../incidents.repo.js";

export function updateIncidentUseCase(
  incidentId: string,
  actorId: string,
  input: UpdateIncidentInput,
  db: Executor = DB,
) {
  return new IncidentsRepo(db).update(incidentId, actorId, input);
}
