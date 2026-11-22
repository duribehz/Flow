import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { AppError } from "@/shared/errors/app-error.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { branches } from "../branches/branches.schema.js";
import {
  inventoryCounts,
  inventoryDays,
  inventoryMovements,
} from "../inventory/inventory.schema.js";
import { supplies, units } from "../supplies/supplies.schema.js";
import { users } from "../users/users.schema.js";
import { branchTransferItems, branchTransfers } from "./transfers.schema.js";
import type {
  AcceptTransferInput,
  CreateTransferInput,
  ListTransfersFilters,
} from "./transfers.dto.js";

const sourceBranches = alias(branches, "transfer_source_branches");
const destinationBranches = alias(branches, "transfer_destination_branches");
const senders = alias(users, "transfer_senders");
const receivers = alias(users, "transfer_receivers");

export class TransfersRepo {
  constructor(private readonly conn: Executor) {}

  listBranchOptions() {
    return this.conn
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .orderBy(asc(branches.name));
  }

  create(senderId: string, input: CreateTransferInput, branchScopeId?: string) {
    return this.runInTransaction(async (conn) => {
      const fromBranchId = branchScopeId ?? input.fromBranchId;
      if (!fromBranchId) {
        throw new AppError(400, "TRANSFER_SOURCE_BRANCH_REQUIRED", "Select a source branch");
      }
      if (fromBranchId === input.toBranchId) {
        throw new AppError(
          400,
          "TRANSFER_BRANCHES_MUST_DIFFER",
          "Choose a different destination branch",
        );
      }

      const branchRows = await conn
        .select({ id: branches.id })
        .from(branches)
        .where(inArray(branches.id, [fromBranchId, input.toBranchId]));
      if (branchRows.length !== 2) {
        throw new AppError(404, "BRANCH_NOT_FOUND", "Source or destination branch not found");
      }

      const [sourceDay] = await conn
        .select({ id: inventoryDays.id, status: inventoryDays.status })
        .from(inventoryDays)
        .where(
          and(
            eq(inventoryDays.branchId, fromBranchId),
            eq(inventoryDays.businessDate, input.businessDate),
          ),
        )
        .for("update");
      if (sourceDay?.status === "closed") {
        throw new AppError(
          409,
          "INVENTORY_DAY_CLOSED",
          "Transfers must be sent before the source branch closes inventory",
        );
      }
      if (sourceDay) {
        const [draftCount] = await conn
          .select({ id: inventoryCounts.id })
          .from(inventoryCounts)
          .where(
            and(
              eq(inventoryCounts.inventoryDayId, sourceDay.id),
              eq(inventoryCounts.status, "draft"),
            ),
          );
        if (draftCount) {
          throw new AppError(
            409,
            "INVENTORY_COUNT_IN_PROGRESS",
            "Transfers must be sent before counting inventory",
          );
        }
      }

      const supplyIds = input.items.map((item) => item.supplyId);
      const activeSupplyRows = await conn
        .select({ id: supplies.id })
        .from(supplies)
        .where(and(inArray(supplies.id, supplyIds), eq(supplies.active, true)));
      if (activeSupplyRows.length !== supplyIds.length) {
        throw new AppError(404, "SUPPLY_NOT_AVAILABLE", "One or more articles are unavailable");
      }

      const [transfer] = await conn
        .insert(branchTransfers)
        .values({
          transferNumber: `TRF-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
          fromBranchId,
          toBranchId: input.toBranchId,
          sentBusinessDate: input.businessDate,
          sentBy: senderId,
          status: "pending",
        })
        .returning({ id: branchTransfers.id });
      await conn.insert(branchTransferItems).values(
        input.items.map((item) => ({
          transferId: transfer!.id,
          supplyId: item.supplyId,
          quantity: item.quantity,
        })),
      );
      await conn.insert(inventoryMovements).values(
        input.items.map((item) => ({
          branchId: fromBranchId,
          supplyId: item.supplyId,
          kind: "transfer_out" as const,
          quantity: -item.quantity,
          referenceId: transfer!.id,
        })),
      );
      return (await this.getById(transfer!.id, conn))!;
    });
  }

  async list(filters: ListTransfersFilters, branchScopeId?: string) {
    const branchFilter = branchScopeId
      ? filters.direction === "sent"
        ? eq(branchTransfers.fromBranchId, branchScopeId)
        : filters.direction === "received"
          ? eq(branchTransfers.toBranchId, branchScopeId)
          : or(
              eq(branchTransfers.fromBranchId, branchScopeId),
              eq(branchTransfers.toBranchId, branchScopeId),
            )
      : undefined;
    const rows = await this.conn
      .select({ id: branchTransfers.id })
      .from(branchTransfers)
      .where(
        and(branchFilter, filters.status ? eq(branchTransfers.status, filters.status) : undefined),
      )
      .orderBy(desc(branchTransfers.sentAt));
    const details = await Promise.all(rows.map((row) => this.getById(row.id)));
    return details.filter((transfer) => transfer !== undefined);
  }

  async getById(transferId: string, conn: Executor = this.conn) {
    const [transfer] = await conn
      .select({
        id: branchTransfers.id,
        transferNumber: branchTransfers.transferNumber,
        fromBranch: { id: sourceBranches.id, name: sourceBranches.name },
        toBranch: { id: destinationBranches.id, name: destinationBranches.name },
        sentBusinessDate: branchTransfers.sentBusinessDate,
        status: branchTransfers.status,
        sentBy: { id: senders.id, userName: senders.userName },
        acceptedBy: { id: receivers.id, userName: receivers.userName },
        acceptedInventoryDayId: branchTransfers.acceptedInventoryDayId,
        sentAt: branchTransfers.sentAt,
        acceptedAt: branchTransfers.acceptedAt,
        createdAt: branchTransfers.createdAt,
      })
      .from(branchTransfers)
      .innerJoin(sourceBranches, eq(branchTransfers.fromBranchId, sourceBranches.id))
      .innerJoin(destinationBranches, eq(branchTransfers.toBranchId, destinationBranches.id))
      .innerJoin(senders, eq(branchTransfers.sentBy, senders.id))
      .leftJoin(receivers, eq(branchTransfers.acceptedBy, receivers.id))
      .where(eq(branchTransfers.id, transferId));
    if (!transfer) return undefined;

    const itemRows = await conn
      .select({
        id: branchTransferItems.id,
        supplyId: supplies.id,
        sku: supplies.sku,
        name: supplies.name,
        unitSymbol: units.symbol,
        quantity: branchTransferItems.quantity,
      })
      .from(branchTransferItems)
      .innerJoin(supplies, eq(branchTransferItems.supplyId, supplies.id))
      .innerJoin(units, eq(supplies.unitId, units.id))
      .where(eq(branchTransferItems.transferId, transferId))
      .orderBy(asc(supplies.name));
    const items = itemRows.map((item) => ({
      id: item.id,
      supply: {
        id: item.supplyId,
        sku: item.sku,
        name: item.name,
        unit: { symbol: item.unitSymbol },
      },
      quantity: item.quantity,
    }));
    return { ...transfer, items };
  }

  accept(transferId: string, actorId: string, input: AcceptTransferInput, branchScopeId?: string) {
    return this.runInTransaction(async (conn) => {
      const [transfer] = await conn
        .select()
        .from(branchTransfers)
        .where(eq(branchTransfers.id, transferId))
        .for("update");
      if (!transfer) throw new AppError(404, "TRANSFER_NOT_FOUND", "Transfer not found");
      if (branchScopeId && transfer.toBranchId !== branchScopeId) {
        throw new AppError(403, "BRANCH_ACCESS_DENIED", "This user cannot accept this transfer");
      }
      if (transfer.status !== "pending") {
        throw new AppError(409, "TRANSFER_ALREADY_ACCEPTED", "Transfer is not pending acceptance");
      }

      let [day] = await conn
        .select()
        .from(inventoryDays)
        .where(
          and(
            eq(inventoryDays.branchId, transfer.toBranchId),
            eq(inventoryDays.businessDate, input.businessDate),
          ),
        )
        .for("update");
      if (day?.status === "closed") {
        throw new AppError(
          409,
          "INVENTORY_DAY_CLOSED",
          "Transfers must be accepted before the destination branch closes inventory",
        );
      }
      if (!day) {
        const [created] = await conn
          .insert(inventoryDays)
          .values({
            branchId: transfer.toBranchId,
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
                  eq(inventoryDays.branchId, transfer.toBranchId),
                  eq(inventoryDays.businessDate, input.businessDate),
                ),
              )
              .for("update")
          )[0];
        if (!day || day.status === "closed") {
          throw new AppError(409, "INVENTORY_DAY_CLOSED", "Destination inventory day is closed");
        }
      }

      const [draftCount] = await conn
        .select({ id: inventoryCounts.id })
        .from(inventoryCounts)
        .where(
          and(eq(inventoryCounts.inventoryDayId, day.id), eq(inventoryCounts.status, "draft")),
        );
      if (draftCount) {
        throw new AppError(
          409,
          "INVENTORY_COUNT_IN_PROGRESS",
          "Transfers must be accepted before counting inventory",
        );
      }

      const acceptedAt = new Date();
      const [accepted] = await conn
        .update(branchTransfers)
        .set({
          status: "accepted",
          acceptedBy: actorId,
          acceptedInventoryDayId: day.id,
          acceptedAt,
        })
        .where(and(eq(branchTransfers.id, transferId), eq(branchTransfers.status, "pending")))
        .returning({ id: branchTransfers.id });
      if (!accepted) {
        throw new AppError(409, "TRANSFER_ALREADY_ACCEPTED", "Transfer is not pending acceptance");
      }
      const items = await conn
        .select({ supplyId: branchTransferItems.supplyId, quantity: branchTransferItems.quantity })
        .from(branchTransferItems)
        .where(eq(branchTransferItems.transferId, transferId));
      await conn.insert(inventoryMovements).values(
        items.map((item) => ({
          branchId: transfer.toBranchId,
          supplyId: item.supplyId,
          kind: "transfer_in" as const,
          quantity: item.quantity,
          referenceId: transferId,
        })),
      );
      return (await this.getById(transferId, conn))!;
    });
  }

  cancel(transferId: string, actorId: string, branchScopeId?: string) {
    return this.runInTransaction(async (conn) => {
      const [transfer] = await conn
        .select()
        .from(branchTransfers)
        .where(eq(branchTransfers.id, transferId))
        .for("update");
      if (!transfer) throw new AppError(404, "TRANSFER_NOT_FOUND", "Transfer not found");
      if (branchScopeId && transfer.fromBranchId !== branchScopeId) {
        throw new AppError(403, "BRANCH_ACCESS_DENIED", "This user cannot cancel this transfer");
      }
      if (transfer.status !== "pending") {
        throw new AppError(409, "TRANSFER_NOT_PENDING", "Only pending transfers can be cancelled");
      }

      const [cancelled] = await conn
        .update(branchTransfers)
        .set({ status: "cancelled", cancelledBy: actorId, cancelledAt: new Date() })
        .where(and(eq(branchTransfers.id, transferId), eq(branchTransfers.status, "pending")))
        .returning({ id: branchTransfers.id });
      if (!cancelled) {
        throw new AppError(409, "TRANSFER_NOT_PENDING", "Only pending transfers can be cancelled");
      }

      const items = await conn
        .select({ supplyId: branchTransferItems.supplyId, quantity: branchTransferItems.quantity })
        .from(branchTransferItems)
        .where(eq(branchTransferItems.transferId, transferId));
      await conn.insert(inventoryMovements).values(
        items.map((item) => ({
          branchId: transfer.fromBranchId,
          supplyId: item.supplyId,
          kind: "transfer_cancel" as const,
          quantity: item.quantity,
          referenceId: transferId,
        })),
      );
      return (await this.getById(transferId, conn))!;
    });
  }

  private runInTransaction<T>(callback: (conn: Executor) => Promise<T>) {
    if ("transaction" in this.conn) return this.conn.transaction(callback);
    return callback(this.conn);
  }
}

export type Transfer = NonNullable<Awaited<ReturnType<TransfersRepo["getById"]>>>;
