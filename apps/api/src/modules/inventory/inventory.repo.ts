import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { AppError } from "@/shared/errors/app-error.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { assertSafeStoredQuantity } from "@/shared/domain/quantities.js";
import { branches } from "../branches/branches.schema.js";
import { receiptItems, receipts } from "../receipts/receipts.schema.js";
import { ReplenishmentsRepo } from "../replenishments/replenishments.repo.js";
import { categories, supplies, units } from "../supplies/supplies.schema.js";
import { branchTransferItems, branchTransfers } from "../transfers/transfers.schema.js";
import type {
  CreateInventoryCountInput,
  CreateInventoryDayInput,
  UpdateInventoryCountInput,
} from "./inventory.dto.js";
import {
  inventoryCountItems,
  inventoryCounts,
  inventoryDays,
  inventoryMovements,
} from "./inventory.schema.js";

export type ListInventoryDaysFilters = {
  branchId?: string;
  businessDate?: string;
  status?: "open" | "closed";
};

export type ListInventoryCountsFilters = {
  inventoryDayId?: string;
  branchId?: string;
  status?: "draft" | "submitted" | "reviewed";
};

export class InventoryRepo {
  constructor(private readonly conn: Executor) {}

  listInventorySupplies() {
    return this.conn
      .select({
        id: supplies.id,
        sku: supplies.sku,
        name: supplies.name,
        active: supplies.active,
        category: { name: categories.name },
        unit: { symbol: units.symbol },
      })
      .from(supplies)
      .innerJoin(categories, eq(supplies.categoryId, categories.id))
      .innerJoin(units, eq(supplies.unitId, units.id))
      .orderBy(asc(supplies.name), asc(supplies.sku));
  }

  openInventoryDay(actorId: string, input: CreateInventoryDayInput) {
    return this.runInTransaction(async (conn) => {
      const [branch] = await conn
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.id, input.branchId));
      if (!branch) throw new AppError(404, "BRANCH_NOT_FOUND", "Branch not found");

      const [created] = await conn
        .insert(inventoryDays)
        .values({
          branchId: input.branchId,
          businessDate: input.businessDate,
          openedBy: actorId,
          notes: input.notes ?? null,
        })
        .onConflictDoNothing({ target: [inventoryDays.branchId, inventoryDays.businessDate] })
        .returning();

      const day =
        created ??
        (
          await conn
            .select()
            .from(inventoryDays)
            .where(
              and(
                eq(inventoryDays.branchId, input.branchId),
                eq(inventoryDays.businessDate, input.businessDate),
              ),
            )
            .for("update")
        )[0];
      if (!day)
        throw new AppError(500, "INVENTORY_DAY_CREATE_FAILED", "Could not open inventory day");
      if (day.status !== "open") {
        throw new AppError(409, "INVENTORY_DAY_CLOSED", "Inventory day is closed");
      }
      return { day, created: created !== undefined };
    });
  }

  createInventoryCount(actorId: string, input: CreateInventoryCountInput) {
    return this.runInTransaction(async (conn) => {
      const [day] = await conn
        .select()
        .from(inventoryDays)
        .where(eq(inventoryDays.id, input.inventoryDayId))
        .for("update");
      if (!day) throw new AppError(404, "INVENTORY_DAY_NOT_FOUND", "Inventory day not found");
      if (day.status !== "open") {
        throw new AppError(409, "INVENTORY_DAY_CLOSED", "Inventory day is closed");
      }
      const [count] = await conn
        .insert(inventoryCounts)
        .values({
          inventoryDayId: day.id,
          branchId: day.branchId,
          notes: input.notes ?? null,
          createdBy: actorId,
        })
        .onConflictDoNothing({ target: inventoryCounts.inventoryDayId })
        .returning();

      if (!count) {
        throw new AppError(
          409,
          "INVENTORY_COUNT_ALREADY_EXISTS",
          "An inventory count already exists for this day",
        );
      }

      const trackedSupplies = await conn
        .select({ supplyId: supplies.id })
        .from(supplies)
        .where(and(eq(supplies.active, true), eq(supplies.trackInventory, true)))
        .orderBy(asc(supplies.name), asc(supplies.sku));

      const transferredSupplies = await conn
        .select({ supplyId: branchTransferItems.supplyId })
        .from(branchTransferItems)
        .innerJoin(branchTransfers, eq(branchTransferItems.transferId, branchTransfers.id))
        .where(
          and(
            eq(branchTransfers.acceptedInventoryDayId, day.id),
            eq(branchTransfers.status, "accepted"),
          ),
        );
      const candidateSupplyIds = [
        ...new Set([
          ...trackedSupplies.map((supply) => supply.supplyId),
          ...transferredSupplies.map((item) => item.supplyId),
        ]),
      ];

      if (candidateSupplyIds.length === 0) {
        return { ...count, items: [] };
      }

      const allSupplies = await conn
        .select({ id: supplies.id })
        .from(supplies)
        .where(inArray(supplies.id, candidateSupplyIds))
        .orderBy(asc(supplies.name), asc(supplies.sku));
      const supplyIds = allSupplies.map((supply) => supply.id);
      const previousBySupply = await this.getPreviousBySupply(
        day.branchId,
        day.businessDate,
        supplyIds,
        conn,
      );
      const receivedBySupply = await this.sumReceivedByDay(day.id, conn);
      const items = await conn
        .insert(inventoryCountItems)
        .values(
          supplyIds.map((supplyId) => {
            const previous = previousBySupply.get(supplyId);
            return {
              inventoryCountId: count.id,
              supplyId,
              openingQuantity: previous?.closingQuantity ?? null,
              receivedQuantity: receivedBySupply.get(supplyId) ?? null,
              lastCountedAt: previous?.countedAt ?? null,
            };
          }),
        )
        .returning();

      return { ...count, items };
    });
  }

  listInventoryDays(filters: ListInventoryDaysFilters) {
    return this.conn
      .select()
      .from(inventoryDays)
      .where(
        and(
          filters.branchId ? eq(inventoryDays.branchId, filters.branchId) : undefined,
          filters.businessDate ? eq(inventoryDays.businessDate, filters.businessDate) : undefined,
          filters.status ? eq(inventoryDays.status, filters.status) : undefined,
        ),
      )
      .orderBy(desc(inventoryDays.businessDate), desc(inventoryDays.createdAt));
  }

  async getInventoryDay(dayId: string) {
    const [day] = await this.conn.select().from(inventoryDays).where(eq(inventoryDays.id, dayId));
    return day;
  }

  listInventoryCounts(filters: ListInventoryCountsFilters) {
    return this.conn
      .select()
      .from(inventoryCounts)
      .where(
        and(
          filters.inventoryDayId
            ? eq(inventoryCounts.inventoryDayId, filters.inventoryDayId)
            : undefined,
          filters.branchId ? eq(inventoryCounts.branchId, filters.branchId) : undefined,
          filters.status ? eq(inventoryCounts.status, filters.status) : undefined,
        ),
      )
      .orderBy(desc(inventoryCounts.createdAt));
  }

  async getInventoryCount(countId: string, conn: Executor = this.conn) {
    const [count] = await conn
      .select()
      .from(inventoryCounts)
      .where(eq(inventoryCounts.id, countId));
    if (!count) return undefined;

    const items = await conn
      .select()
      .from(inventoryCountItems)
      .where(eq(inventoryCountItems.inventoryCountId, countId));
    return { ...count, items };
  }

  updateInventoryCount(countId: string, input: UpdateInventoryCountInput) {
    return this.runInTransaction(async (conn) => {
      const [countLock] = await conn
        .select({ id: inventoryCounts.id })
        .from(inventoryCounts)
        .where(eq(inventoryCounts.id, countId))
        .for("update");
      if (!countLock) {
        throw new AppError(404, "INVENTORY_COUNT_NOT_FOUND", "Inventory count not found");
      }

      const current = await this.getInventoryCount(countId, conn);
      if (!current)
        throw new AppError(404, "INVENTORY_COUNT_NOT_FOUND", "Inventory count not found");
      if (current.status !== "draft") {
        throw new AppError(409, "INVENTORY_COUNT_NOT_DRAFT", "Inventory count is not a draft");
      }

      const existingSupplyIds = new Set(current.items.map((item) => item.supplyId));
      const newSupplyIds = [...new Set((input.items ?? []).map((item) => item.supplyId))].filter(
        (supplyId) => !existingSupplyIds.has(supplyId),
      );

      if (newSupplyIds.length > 0) {
        const availableSupplies = await conn
          .select({ id: supplies.id })
          .from(supplies)
          .where(and(inArray(supplies.id, newSupplyIds), eq(supplies.active, true)));
        if (availableSupplies.length !== newSupplyIds.length) {
          throw new AppError(404, "SUPPLY_NOT_AVAILABLE", "One or more supplies are unavailable");
        }

        const [day] = await conn
          .select()
          .from(inventoryDays)
          .where(eq(inventoryDays.id, current.inventoryDayId));
        if (!day) throw new AppError(404, "INVENTORY_DAY_NOT_FOUND", "Inventory day not found");
        const previousBySupply = await this.getPreviousBySupply(
          current.branchId,
          day.businessDate,
          newSupplyIds,
          conn,
        );
        const receivedBySupply = await this.sumReceivedByDay(day.id, conn);
        await conn.insert(inventoryCountItems).values(
          newSupplyIds.map((supplyId) => {
            const previous = previousBySupply.get(supplyId);
            return {
              inventoryCountId: countId,
              supplyId,
              openingQuantity: previous?.closingQuantity ?? null,
              receivedQuantity: receivedBySupply.get(supplyId) ?? null,
              lastCountedAt: previous?.countedAt ?? null,
            };
          }),
        );
      }

      const [draft] = await conn
        .update(inventoryCounts)
        .set({ notes: input.notes === undefined ? current.notes : input.notes })
        .where(and(eq(inventoryCounts.id, countId), eq(inventoryCounts.status, "draft")))
        .returning();
      if (!draft) {
        throw new AppError(409, "INVENTORY_COUNT_NOT_DRAFT", "Inventory count is not a draft");
      }

      for (const item of input.items ?? []) {
        await conn
          .update(inventoryCountItems)
          .set({
            closingQuantity: item.closingQuantity,
            counted: item.closingQuantity !== null,
            reportedAt: item.closingQuantity !== null ? new Date() : null,
          })
          .where(
            and(
              eq(inventoryCountItems.inventoryCountId, countId),
              eq(inventoryCountItems.supplyId, item.supplyId),
            ),
          );
      }

      return (await this.getInventoryCount(countId, conn))!;
    });
  }

  submitInventoryCount(countId: string, actorId: string) {
    return this.runInTransaction(async (conn) => {
      const current = await this.getInventoryCount(countId, conn);
      if (!current) {
        throw new AppError(404, "INVENTORY_COUNT_NOT_FOUND", "Inventory count not found");
      }
      if (current.status !== "draft") {
        throw new AppError(409, "INVENTORY_COUNT_NOT_DRAFT", "Inventory count is not a draft");
      }

      const [day] = await conn
        .select({ status: inventoryDays.status })
        .from(inventoryDays)
        .where(eq(inventoryDays.id, current.inventoryDayId))
        .for("update");
      if (!day || day.status !== "open") {
        throw new AppError(409, "INVENTORY_DAY_CLOSED", "Inventory day is closed");
      }
      const [activeReceipt] = await conn
        .select({ id: receipts.id })
        .from(receipts)
        .where(
          and(
            eq(receipts.inventoryDayId, current.inventoryDayId),
            inArray(receipts.status, ["pending", "in_progress"]),
          ),
        );
      if (activeReceipt) {
        throw new AppError(
          409,
          "RECEIPT_IN_PROGRESS",
          "Complete or cancel receipts before submitting the inventory count",
        );
      }

      const receivedBySupply = await this.sumReceivedByDay(current.inventoryDayId, conn);
      for (const item of current.items) {
        await conn
          .update(inventoryCountItems)
          .set({ receivedQuantity: receivedBySupply.get(item.supplyId) ?? null })
          .where(eq(inventoryCountItems.id, item.id));
      }

      const submittedAt = new Date();
      const [submitted] = await conn
        .update(inventoryCounts)
        .set({ status: "submitted", submittedBy: actorId, submittedAt })
        .where(and(eq(inventoryCounts.id, countId), eq(inventoryCounts.status, "draft")))
        .returning();
      if (!submitted) {
        throw new AppError(409, "INVENTORY_COUNT_NOT_DRAFT", "Inventory count is not a draft");
      }

      const [closedDay] = await conn
        .update(inventoryDays)
        .set({ status: "closed", closedBy: actorId, closedAt: submittedAt })
        .where(and(eq(inventoryDays.id, current.inventoryDayId), eq(inventoryDays.status, "open")))
        .returning();
      if (!closedDay) {
        throw new AppError(409, "INVENTORY_DAY_CLOSED", "Inventory day is closed");
      }

      await new ReplenishmentsRepo(conn).createDraftFromSubmittedCount(countId, actorId);

      return (await this.getInventoryCount(countId, conn))!;
    });
  }

  reviewInventoryCount(countId: string, actorId: string) {
    return this.runInTransaction(async (conn) => {
      const [reviewed] = await conn
        .update(inventoryCounts)
        .set({ status: "reviewed", reviewedBy: actorId, reviewedAt: new Date() })
        .where(and(eq(inventoryCounts.id, countId), eq(inventoryCounts.status, "submitted")))
        .returning();

      if (!reviewed) {
        const [existing] = await conn
          .select({ status: inventoryCounts.status })
          .from(inventoryCounts)
          .where(eq(inventoryCounts.id, countId));
        if (!existing) {
          throw new AppError(404, "INVENTORY_COUNT_NOT_FOUND", "Inventory count not found");
        }
        throw new AppError(
          409,
          "INVENTORY_COUNT_NOT_SUBMITTED",
          "Inventory count is not submitted",
        );
      }

      return (await this.getInventoryCount(countId, conn))!;
    });
  }

  async listLastReports(branchId: string) {
    const reports = await this.conn
      .selectDistinctOn([inventoryCountItems.supplyId], {
        supplyId: inventoryCountItems.supplyId,
        closingQuantity: inventoryCountItems.closingQuantity,
        businessDate: inventoryDays.businessDate,
        reportedAt: inventoryCountItems.reportedAt,
      })
      .from(inventoryCountItems)
      .innerJoin(inventoryCounts, eq(inventoryCountItems.inventoryCountId, inventoryCounts.id))
      .innerJoin(inventoryDays, eq(inventoryCounts.inventoryDayId, inventoryDays.id))
      .where(and(eq(inventoryCounts.branchId, branchId), eq(inventoryCountItems.counted, true)))
      .orderBy(
        inventoryCountItems.supplyId,
        desc(inventoryDays.businessDate),
        desc(inventoryCountItems.reportedAt),
      );

    const movements = await this.conn
      .select({
        supplyId: inventoryMovements.supplyId,
        quantity: inventoryMovements.quantity,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.branchId, branchId));

    return reports.map((report) => {
      const since = report.reportedAt ?? new Date(`${report.businessDate}T00:00:00.000Z`);
      const movementsSince = movements
        .filter((movement) => movement.supplyId === report.supplyId && movement.createdAt > since)
        .reduce((total, movement) => total + movement.quantity, 0);
      return {
        supplyId: report.supplyId,
        closingQuantity: report.closingQuantity,
        businessDate: report.businessDate,
        reportedAt: report.reportedAt?.toISOString() ?? null,
        movementsSince,
        currentQuantity:
          report.closingQuantity === null ? null : report.closingQuantity + movementsSince,
      };
    });
  }

  private async sumReceivedByDay(dayId: string, conn: Executor) {
    const rows = await conn
      .select({
        supplyId: receiptItems.supplyId,
        total: sql<number>`coalesce(sum(${receiptItems.receivedQuantity}), 0)`,
      })
      .from(receiptItems)
      .innerJoin(receipts, eq(receiptItems.receiptId, receipts.id))
      .where(and(eq(receipts.inventoryDayId, dayId), eq(receipts.status, "completed")))
      .groupBy(receiptItems.supplyId);
    const totals = new Map<string, number>();
    try {
      for (const row of rows) {
        totals.set(row.supplyId, assertSafeStoredQuantity(Number(row.total)));
      }

      const transferRows = await conn
        .select({
          supplyId: branchTransferItems.supplyId,
          total: sql<number>`coalesce(sum(${branchTransferItems.quantity}), 0)`,
        })
        .from(branchTransferItems)
        .innerJoin(branchTransfers, eq(branchTransferItems.transferId, branchTransfers.id))
        .where(
          and(
            eq(branchTransfers.acceptedInventoryDayId, dayId),
            eq(branchTransfers.status, "accepted"),
          ),
        )
        .groupBy(branchTransferItems.supplyId);
      for (const row of transferRows) {
        const sum = BigInt(totals.get(row.supplyId) ?? 0) + BigInt(Number(row.total));
        totals.set(row.supplyId, assertSafeStoredQuantity(Number(sum)));
      }
    } catch {
      throw new AppError(
        500,
        "RECEIVED_QUANTITY_OVERFLOW",
        "Received quantity total exceeds the safe quantity range",
      );
    }
    return totals;
  }

  private async getPreviousBySupply(
    branchId: string,
    businessDate: string,
    supplyIds: string[],
    conn: Executor,
  ) {
    if (supplyIds.length === 0)
      return new Map<string, { closingQuantity: number; countedAt: Date | null }>();

    const previousRows = await conn
      .select({
        supplyId: inventoryCountItems.supplyId,
        closingQuantity: inventoryCountItems.closingQuantity,
        countedAt: inventoryCounts.submittedAt,
      })
      .from(inventoryCountItems)
      .innerJoin(inventoryCounts, eq(inventoryCountItems.inventoryCountId, inventoryCounts.id))
      .innerJoin(inventoryDays, eq(inventoryCounts.inventoryDayId, inventoryDays.id))
      .where(
        and(
          eq(inventoryCounts.branchId, branchId),
          inArray(inventoryCounts.status, ["submitted", "reviewed"]),
          eq(inventoryCountItems.counted, true),
          inArray(inventoryCountItems.supplyId, supplyIds),
          lt(inventoryDays.businessDate, businessDate),
        ),
      )
      .orderBy(desc(inventoryDays.businessDate), desc(inventoryCounts.submittedAt));

    const previousBySupply = new Map<string, { closingQuantity: number; countedAt: Date | null }>();
    for (const row of previousRows) {
      if (!previousBySupply.has(row.supplyId) && row.closingQuantity !== null) {
        previousBySupply.set(row.supplyId, {
          closingQuantity: Number(row.closingQuantity),
          countedAt: row.countedAt,
        });
      }
    }
    return previousBySupply;
  }

  private runInTransaction<T>(callback: (conn: Executor) => Promise<T>) {
    if ("transaction" in this.conn) {
      return this.conn.transaction(callback);
    }
    return callback(this.conn);
  }
}

export type InventoryDay = NonNullable<Awaited<ReturnType<InventoryRepo["getInventoryDay"]>>>;
export type InventoryCount = NonNullable<Awaited<ReturnType<InventoryRepo["getInventoryCount"]>>>;
