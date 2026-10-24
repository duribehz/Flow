import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ShipmentsRepo } from "../shipments.repo.js";

export function createShipmentUseCase(
  replenishmentRequestId: string,
  actorId: string,
  db: Executor = DB,
) {
  return new ShipmentsRepo(db).createFromReplenishmentRequest(replenishmentRequestId, actorId);
}
