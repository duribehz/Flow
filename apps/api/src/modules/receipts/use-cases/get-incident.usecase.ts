import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { IncidentsRepo } from "../incidents.repo.js";

export async function getIncidentUseCase(incidentId: string, db: Executor = DB) {
  const incident = await new IncidentsRepo(db).getById(incidentId);
  if (!incident) throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found");
  return incident;
}
