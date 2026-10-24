import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { AppError } from "@/shared/errors/app-error.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { branches } from "../branches/branches.schema.js";
import { inventoryDays } from "../inventory/inventory.schema.js";
import {
  replenishmentRequestItems,
  replenishmentRequests,
} from "../replenishments/replenishments.schema.js";
import { supplies } from "../supplies/supplies.schema.js";
import { shipmentItems, shipments } from "../shipments/shipments.schema.js";
import { usagePurposes } from "../usage-purposes/usage-purposes.schema.js";
import { users } from "../users/users.schema.js";
import type { CreateReceiptInput, UpdateReceiptItemInput } from "./receipts.dto.js";
import { receiptItems, receipts } from "./receipts.schema.js";

const receivers = alias(users, "receivers");

export class ReceiptsRepo {
  constructor(private readonly conn: Executor) {}

  async createFromShipment(shipmentId: string, actorId: string, input: CreateReceiptInput) {
    return this.runInTransaction(async (conn) => {
      const [shipment] = await conn
        .select({ id: shipments.id, branchId: shipments.branchId, status: shipments.status })
        .from(shipments)
        .where(eq(shipments.id, shipmentId))
        .for("update");
      if (!shipment) throw new AppError(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      if (shipment.status !== "dispatched") {
        throw new AppError(
          409,
          "SHIPMENT_NOT_DISPATCHED",
          "Only dispatched shipments can be received",
        );
      }

      const [existing] = await conn
        .select({ id: receipts.id })
        .from(receipts)
        .where(eq(receipts.shipmentId, shipmentId));
      if (existing)
        throw new AppError(
          409,
          "RECEIPT_ALREADY_EXISTS",
          "A receipt already exists for this shipment",
        );

      let [day] = await conn
        .select()
        .from(inventoryDays)
        .where(
          and(
            eq(inventoryDays.branchId, shipment.branchId),
            eq(inventoryDays.businessDate, input.businessDate),
          ),
        )
        .for("update");
      if (day?.status === "closed") {
        throw new AppError(
          409,
          "INVENTORY_DAY_CLOSED",
          "Receipt date belongs to a closed inventory day",
        );
      }
      if (!day) {
        const [created] = await conn
          .insert(inventoryDays)
          .values({
            branchId: shipment.branchId,
            businessDate: input.businessDate,
            openedBy: actorId,
          })
          .onConflictDoNothing({ target: [inventoryDays.branchId, inventoryDays.businessDate] })
          .returning();
        day =
          created ??
          (
            await conn
              .select()
              .from(inventoryDays)
              .where(
                and(
                  eq(inventoryDays.branchId, shipment.branchId),
                  eq(inventoryDays.businessDate, input.businessDate),
                ),
              )
              .for("update")
          )[0];
        if (!day || day.status === "closed") {
          throw new AppError(
            409,
            "INVENTORY_DAY_CLOSED",
            "Receipt date belongs to a closed inventory day",
          );
        }
      }

      const now = new Date();
      const [receipt] = await conn
        .insert(receipts)
        .values({
          receiptNumber: `REC-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
          shipmentId,
          inventoryDayId: day.id,
          branchId: shipment.branchId,
          status: "in_progress",
          receivedBy: actorId,
          startedAt: now,
          notes: input.notes ?? null,
        })
        .onConflictDoNothing({ target: receipts.shipmentId })
        .returning();
      if (!receipt)
        throw new AppError(
          409,
          "RECEIPT_ALREADY_EXISTS",
          "A receipt already exists for this shipment",
        );

      const sentItems = await conn
        .select({
          id: shipmentItems.id,
          supplyId: shipmentItems.supplyId,
          shippedQuantity: shipmentItems.shippedQuantity,
        })
        .from(shipmentItems)
        .where(eq(shipmentItems.shipmentId, shipmentId));
      await conn.insert(receiptItems).values(
        sentItems.map((item) => ({
          receiptId: receipt.id,
          shipmentItemId: item.id,
          supplyId: item.supplyId,
          expectedQuantity: item.shippedQuantity,
          receivedQuantity: 0,
          acceptedQuantity: 0,
          rejectedQuantity: 0,
        })),
      );
      return (await this.getById(receipt.id, conn))!;
    });
  }

  async list(filters: {
    status?: "pending" | "in_progress" | "completed" | "cancelled";
    branchId?: string;
  }) {
    const rows = await this.conn
      .select({ id: receipts.id })
      .from(receipts)
      .where(
        and(
          filters.status ? eq(receipts.status, filters.status) : undefined,
          filters.branchId ? eq(receipts.branchId, filters.branchId) : undefined,
        ),
      )
      .orderBy(asc(receipts.createdAt));
    const details = await Promise.all(rows.map((row) => this.getById(row.id)));
    return details.filter((receipt) => receipt !== undefined);
  }

  async getById(receiptId: string, conn: Executor = this.conn) {
    const [receipt] = await conn
      .select({
        id: receipts.id,
        receiptNumber: receipts.receiptNumber,
        shipmentId: receipts.shipmentId,
        inventoryDayId: receipts.inventoryDayId,
        businessDate: inventoryDays.businessDate,
        branch: { id: branches.id, name: branches.name },
        status: receipts.status,
        receivedBy: { id: receivers.id, userName: receivers.userName },
        startedAt: receipts.startedAt,
        completedAt: receipts.completedAt,
        notes: receipts.notes,
        createdAt: receipts.createdAt,
        updatedAt: receipts.updatedAt,
      })
      .from(receipts)
      .innerJoin(inventoryDays, eq(receipts.inventoryDayId, inventoryDays.id))
      .innerJoin(branches, eq(receipts.branchId, branches.id))
      .leftJoin(receivers, eq(receipts.receivedBy, receivers.id))
      .where(eq(receipts.id, receiptId));
    if (!receipt) return undefined;

    const items = await conn
      .select({
        id: receiptItems.id,
        shipmentItemId: receiptItems.shipmentItemId,
        replenishmentRequestItemId: shipmentItems.replenishmentRequestItemId,
        supply: { id: supplies.id, sku: supplies.sku, name: supplies.name },
        usagePurposeId: replenishmentRequestItems.usagePurposeId,
        usagePurposeName: usagePurposes.name,
        expectedQuantity: receiptItems.expectedQuantity,
        receivedQuantity: receiptItems.receivedQuantity,
        acceptedQuantity: receiptItems.acceptedQuantity,
        rejectedQuantity: receiptItems.rejectedQuantity,
        condition: receiptItems.condition,
        checkedAt: receiptItems.checkedAt,
        notes: receiptItems.notes,
        createdAt: receiptItems.createdAt,
      })
      .from(receiptItems)
      .innerJoin(shipmentItems, eq(receiptItems.shipmentItemId, shipmentItems.id))
      .innerJoin(
        replenishmentRequestItems,
        eq(shipmentItems.replenishmentRequestItemId, replenishmentRequestItems.id),
      )
      .innerJoin(supplies, eq(receiptItems.supplyId, supplies.id))
      .innerJoin(usagePurposes, eq(replenishmentRequestItems.usagePurposeId, usagePurposes.id))
      .where(eq(receiptItems.receiptId, receiptId))
      .orderBy(asc(supplies.name), asc(receiptItems.createdAt));
    return { ...receipt, items };
  }

  async updateNotes(receiptId: string, notes: string | null) {
    return this.runInTransaction(async (conn) => {
      await this.assertInProgress(receiptId, conn);
      await conn
        .update(receipts)
        .set({ notes, updatedAt: new Date() })
        .where(eq(receipts.id, receiptId));
      return (await this.getById(receiptId, conn))!;
    });
  }

  async updateItem(receiptId: string, itemId: string, input: UpdateReceiptItemInput) {
    return this.runInTransaction(async (conn) => {
      await this.assertInProgress(receiptId, conn);
      if (input.receivedQuantity > 0 && input.condition === null) {
        throw new AppError(
          400,
          "RECEIPT_CONDITION_REQUIRED",
          "A condition is required for received items",
        );
      }
      const [currentItem] = await conn
        .select()
        .from(receiptItems)
        .where(and(eq(receiptItems.id, itemId), eq(receiptItems.receiptId, receiptId)));
      if (!currentItem) throw new AppError(404, "RECEIPT_ITEM_NOT_FOUND", "Receipt item not found");
      const [updated] = await conn
        .update(receiptItems)
        .set({
          receivedQuantity: input.receivedQuantity,
          acceptedQuantity: input.acceptedQuantity,
          rejectedQuantity: input.rejectedQuantity,
          condition: input.condition,
          checkedAt: new Date(),
          notes: input.notes === undefined ? currentItem.notes : input.notes,
        })
        .where(and(eq(receiptItems.id, itemId), eq(receiptItems.receiptId, receiptId)))
        .returning({ id: receiptItems.id });
      if (!updated) throw new AppError(404, "RECEIPT_ITEM_NOT_FOUND", "Receipt item not found");
      await conn.update(receipts).set({ updatedAt: new Date() }).where(eq(receipts.id, receiptId));
      return (await this.getById(receiptId, conn))!;
    });
  }

  async complete(receiptId: string) {
    return this.runInTransaction(async (conn) => {
      const receipt = await this.assertInProgress(receiptId, conn);
      const [day] = await conn
        .select({ status: inventoryDays.status })
        .from(inventoryDays)
        .where(eq(inventoryDays.id, receipt.inventoryDayId))
        .for("update");
      if (!day || day.status !== "open") {
        throw new AppError(
          409,
          "INVENTORY_DAY_CLOSED",
          "Receipt cannot complete on a closed inventory day",
        );
      }

      const items = await conn
        .select()
        .from(receiptItems)
        .where(eq(receiptItems.receiptId, receiptId));
      if (items.length === 0)
        throw new AppError(409, "RECEIPT_HAS_NO_ITEMS", "Receipt has no items");
      for (const item of items) {
        if (item.acceptedQuantity + item.rejectedQuantity !== item.receivedQuantity) {
          throw new AppError(
            400,
            "RECEIPT_QUANTITIES_UNCLASSIFIED",
            "Classify all received units as accepted or rejected",
          );
        }
        if (item.receivedQuantity > 0 && item.condition === null) {
          throw new AppError(
            400,
            "RECEIPT_CONDITION_REQUIRED",
            "A condition is required for received items",
          );
        }
      }

      const completedAt = new Date();
      const [completed] = await conn
        .update(receipts)
        .set({ status: "completed", completedAt, updatedAt: completedAt })
        .where(and(eq(receipts.id, receiptId), eq(receipts.status, "in_progress")))
        .returning({ id: receipts.id });
      if (!completed)
        throw new AppError(409, "RECEIPT_NOT_IN_PROGRESS", "Receipt is not in progress");

      const fulfilledItems = await conn
        .select({
          requestItemId: shipmentItems.replenishmentRequestItemId,
          acceptedQuantity: receiptItems.acceptedQuantity,
        })
        .from(receiptItems)
        .innerJoin(shipmentItems, eq(receiptItems.shipmentItemId, shipmentItems.id))
        .where(eq(receiptItems.receiptId, receiptId));
      for (const item of fulfilledItems) {
        await conn
          .update(replenishmentRequestItems)
          .set({ fulfilledQuantity: item.acceptedQuantity })
          .where(eq(replenishmentRequestItems.id, item.requestItemId));
      }

      const [shipment] = await conn
        .select({ id: shipments.id, replenishmentRequestId: shipments.replenishmentRequestId })
        .from(shipments)
        .where(eq(shipments.id, receipt.shipmentId));
      await conn
        .update(shipments)
        .set({ status: "delivered", updatedAt: completedAt })
        .where(and(eq(shipments.id, receipt.shipmentId), eq(shipments.status, "dispatched")));
      const requestedItems = await conn
        .select({
          requestedQuantity: replenishmentRequestItems.requestedQuantity,
          fulfilledQuantity: replenishmentRequestItems.fulfilledQuantity,
        })
        .from(replenishmentRequestItems)
        .where(
          eq(replenishmentRequestItems.replenishmentRequestId, shipment!.replenishmentRequestId),
        );
      const requestStatus = requestedItems.every(
        (item) => item.fulfilledQuantity >= item.requestedQuantity,
      )
        ? "fulfilled"
        : "partially_fulfilled";
      await conn
        .update(replenishmentRequests)
        .set({ status: requestStatus, updatedAt: completedAt })
        .where(eq(replenishmentRequests.id, shipment!.replenishmentRequestId));
      return (await this.getById(receiptId, conn))!;
    });
  }

  private async assertInProgress(receiptId: string, conn: Executor) {
    const [receipt] = await conn
      .select({
        id: receipts.id,
        inventoryDayId: receipts.inventoryDayId,
        shipmentId: receipts.shipmentId,
        status: receipts.status,
      })
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .for("update");
    if (!receipt) throw new AppError(404, "RECEIPT_NOT_FOUND", "Receipt not found");
    if (receipt.status !== "in_progress") {
      throw new AppError(409, "RECEIPT_NOT_IN_PROGRESS", "Receipt is not in progress");
    }
    return receipt;
  }

  private runInTransaction<T>(callback: (conn: Executor) => Promise<T>) {
    if ("transaction" in this.conn) return this.conn.transaction(callback);
    return callback(this.conn);
  }
}

export type ReceiptDetail = NonNullable<Awaited<ReturnType<ReceiptsRepo["getById"]>>>;
