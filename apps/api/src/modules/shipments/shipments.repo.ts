import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { AppError } from "@/shared/errors/app-error.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { branches } from "../branches/branches.schema.js";
import {
  replenishmentRequestItems,
  replenishmentRequests,
} from "../replenishments/replenishments.schema.js";
import { supplies } from "../supplies/supplies.schema.js";
import { usagePurposes } from "../usage-purposes/usage-purposes.schema.js";
import { users } from "../users/users.schema.js";
import { shipmentItems, shipments } from "./shipments.schema.js";

const dispatchers = alias(users, "dispatchers");

export class ShipmentsRepo {
  constructor(private readonly conn: Executor) {}

  async createFromReplenishmentRequest(replenishmentRequestId: string, actorId: string) {
    return this.runInTransaction(async (conn) => {
      const [request] = await conn
        .select({
          id: replenishmentRequests.id,
          branchId: replenishmentRequests.branchId,
          status: replenishmentRequests.status,
        })
        .from(replenishmentRequests)
        .where(eq(replenishmentRequests.id, replenishmentRequestId))
        .for("update");
      if (!request) {
        throw new AppError(404, "REPLENISHMENT_NOT_FOUND", "Replenishment request not found");
      }
      if (request.status !== "submitted") {
        throw new AppError(
          409,
          "REPLENISHMENT_NOT_SUBMITTED",
          "Only submitted requests can be shipped",
        );
      }

      const requestItems = await conn
        .select({
          id: replenishmentRequestItems.id,
          supplyId: replenishmentRequestItems.supplyId,
          requestedQuantity: replenishmentRequestItems.requestedQuantity,
        })
        .from(replenishmentRequestItems)
        .where(eq(replenishmentRequestItems.replenishmentRequestId, replenishmentRequestId));
      if (requestItems.length === 0) {
        throw new AppError(
          409,
          "REPLENISHMENT_HAS_NO_ITEMS",
          "A request without items cannot be shipped",
        );
      }

      const [shipment] = await conn
        .insert(shipments)
        .values({
          shipmentNumber: `SHP-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
          branchId: request.branchId,
          replenishmentRequestId,
          preparedBy: actorId,
        })
        .onConflictDoNothing({ target: shipments.replenishmentRequestId })
        .returning();
      if (!shipment) {
        throw new AppError(
          409,
          "SHIPMENT_ALREADY_EXISTS",
          "A shipment already exists for this request",
        );
      }

      await conn.insert(shipmentItems).values(
        requestItems.map((item) => ({
          shipmentId: shipment.id,
          supplyId: item.supplyId,
          replenishmentRequestItemId: item.id,
          plannedQuantity: item.requestedQuantity,
          shippedQuantity: 0,
        })),
      );
      return (await this.getById(shipment.id, conn))!;
    });
  }

  async list(status?: "preparing" | "dispatched" | "delivered" | "cancelled") {
    const rows = await this.conn
      .select({ id: shipments.id })
      .from(shipments)
      .where(status ? eq(shipments.status, status) : undefined)
      .orderBy(asc(shipments.createdAt));
    const details = await Promise.all(rows.map((row) => this.getById(row.id)));
    return details.filter((item) => item !== undefined);
  }

  async getById(shipmentId: string, conn: Executor = this.conn) {
    const [shipment] = await conn
      .select({
        id: shipments.id,
        shipmentNumber: shipments.shipmentNumber,
        branch: { id: branches.id, name: branches.name },
        replenishmentRequestId: shipments.replenishmentRequestId,
        status: shipments.status,
        preparedBy: { id: users.id, userName: users.userName },
        dispatchedBy: { id: dispatchers.id, userName: dispatchers.userName },
        preparedAt: shipments.preparedAt,
        dispatchedAt: shipments.dispatchedAt,
        notes: shipments.notes,
        createdAt: shipments.createdAt,
        updatedAt: shipments.updatedAt,
      })
      .from(shipments)
      .innerJoin(branches, eq(shipments.branchId, branches.id))
      .innerJoin(users, eq(shipments.preparedBy, users.id))
      .leftJoin(dispatchers, eq(shipments.dispatchedBy, dispatchers.id))
      .where(eq(shipments.id, shipmentId));

    if (!shipment) return undefined;
    const items = await conn
      .select({
        id: shipmentItems.id,
        replenishmentRequestItemId: shipmentItems.replenishmentRequestItemId,
        supply: { id: supplies.id, sku: supplies.sku, name: supplies.name },
        usagePurposeId: replenishmentRequestItems.usagePurposeId,
        usagePurposeName: usagePurposes.name,
        plannedQuantity: shipmentItems.plannedQuantity,
        shippedQuantity: shipmentItems.shippedQuantity,
        createdAt: shipmentItems.createdAt,
      })
      .from(shipmentItems)
      .innerJoin(supplies, eq(shipmentItems.supplyId, supplies.id))
      .innerJoin(
        replenishmentRequestItems,
        eq(shipmentItems.replenishmentRequestItemId, replenishmentRequestItems.id),
      )
      .innerJoin(usagePurposes, eq(replenishmentRequestItems.usagePurposeId, usagePurposes.id))
      .where(eq(shipmentItems.shipmentId, shipmentId))
      .orderBy(asc(supplies.name), asc(shipmentItems.createdAt));
    return { ...shipment, items };
  }

  async dispatch(shipmentId: string, actorId: string) {
    return this.runInTransaction(async (conn) => {
      const [shipment] = await conn
        .select({ status: shipments.status })
        .from(shipments)
        .where(eq(shipments.id, shipmentId))
        .for("update");
      if (!shipment) throw new AppError(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      if (shipment.status !== "preparing") {
        throw new AppError(409, "SHIPMENT_NOT_PREPARING", "Shipment is not preparing");
      }
      const dispatchedAt = new Date();
      await conn
        .update(shipmentItems)
        .set({ shippedQuantity: shipmentItems.plannedQuantity })
        .where(eq(shipmentItems.shipmentId, shipmentId));
      const [updated] = await conn
        .update(shipments)
        .set({ status: "dispatched", dispatchedBy: actorId, dispatchedAt, updatedAt: dispatchedAt })
        .where(and(eq(shipments.id, shipmentId), eq(shipments.status, "preparing")))
        .returning({ id: shipments.id });
      if (!updated) throw new AppError(409, "SHIPMENT_NOT_PREPARING", "Shipment is not preparing");
      return (await this.getById(shipmentId, conn))!;
    });
  }

  private runInTransaction<T>(callback: (conn: Executor) => Promise<T>) {
    if ("transaction" in this.conn) return this.conn.transaction(callback);
    return callback(this.conn);
  }
}

export type ShipmentDetail = NonNullable<Awaited<ReturnType<ShipmentsRepo["getById"]>>>;
