import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateReceiptInput } from "../../receipts/receipts.dto.js";
import { ReceiptsRepo } from "../../receipts/receipts.repo.js";
import { ShipmentsRepo } from "../../shipments/shipments.repo.js";
import { ReplenishmentsRepo } from "../replenishments.repo.js";

export function submitReplenishmentUseCase(
  replenishmentId: string,
  actorId: string,
  input: CreateReceiptInput,
  db: Executor = DB,
) {
  const submit = async (conn: Executor) => {
    const replenishment = await new ReplenishmentsRepo(conn).submit(replenishmentId);
    const shipment = await new ShipmentsRepo(conn).createFromReplenishmentRequest(
      replenishmentId,
      actorId,
    );
    await new ReceiptsRepo(conn).createFromShipment(shipment.id, actorId, input);
    return replenishment;
  };

  if ("transaction" in db) return db.transaction(submit);
  return submit(db);
}
