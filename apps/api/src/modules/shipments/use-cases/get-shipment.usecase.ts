import { AppError } from "@/shared/errors/app-error.js";
import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ShipmentsRepo } from "../shipments.repo.js";

export async function getShipmentUseCase(shipmentId: string, db: Executor = DB) {
  const shipment = await new ShipmentsRepo(db).getById(shipmentId);
  if (!shipment) throw new AppError(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
  return shipment;
}
