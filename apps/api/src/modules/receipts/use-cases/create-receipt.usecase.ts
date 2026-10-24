import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateReceiptInput } from "../receipts.dto.js";
import { ReceiptsRepo } from "../receipts.repo.js";

export function createReceiptUseCase(
  shipmentId: string,
  actorId: string,
  input: CreateReceiptInput,
  db: Executor = DB,
) {
  return new ReceiptsRepo(db).createFromShipment(shipmentId, actorId, input);
}
