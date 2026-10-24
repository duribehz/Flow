import { DB, type Executor } from "@/shared/infrastructure/database/client.js";
import { ShipmentsRepo } from "../shipments.repo.js";

export function listShipmentsUseCase(
  status?: "preparing" | "dispatched" | "delivered" | "cancelled",
  db: Executor = DB,
) {
  return new ShipmentsRepo(db).list(status);
}
