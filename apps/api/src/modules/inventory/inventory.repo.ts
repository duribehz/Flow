import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { AppError } from "@/shared/errors/app-error.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { receiptItems, receipts } from "../receipts/receipts.schema.js";
import { branchSupplySettings, supplies } from "../supplies/supplies.schema.js";
import type { CreateInventoryCountInput, UpdateInventoryCountInput } from "./inventory.dto.js";
import { inventoryCountItems, inventoryCounts, inventoryDays } from "./inventory.schema.js";

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

  createInventoryCount(actorId: string, input: CreateInventoryCountInput) {
    return this.runInTransaction(async (conn) => {
      const [createdDay] = await conn
        .insert(inventoryDays)
        .values({
          branchId: input.branchId,
          businessDate: input.businessDate,
          openedBy: actorId,
          notes: input.dayNotes ?? null,
        })
        .onConflictDoNothing({ target: [inventoryDays.branchId, inventoryDays.businessDate] })
        .returning();

      const day =
        createdDay ??
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
        )[0];

      if (!day || day.status !== "open") {
        throw new AppError(409, "INVENTORY_DAY_CLOSED", "Inventory day is closed");
      }

      const [count] = await conn
        .insert(inventoryCounts)
        .values({
          inventoryDayId: day.id,
          branchId: input.branchId,
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

      const settings = await conn
        .select({ supplyId: branchSupplySettings.supplyId })
        .from(branchSupplySettings)
        .innerJoin(supplies, eq(branchSupplySettings.supplyId, supplies.id))
        .where(
          and(
            eq(branchSupplySettings.branchId, input.branchId),
            eq(branchSupplySettings.active, true),
            eq(supplies.active, true),
          ),
        );

      if (settings.length === 0) {
        return { ...count, items: [] };
      }

      const supplyIds = settings.map((setting) => setting.supplyId);
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
            eq(inventoryCounts.branchId, input.branchId),
            inArray(inventoryCounts.status, ["submitted", "reviewed"]),
            eq(inventoryCountItems.counted, true),
            inArray(inventoryCountItems.supplyId, supplyIds),
            lt(inventoryDays.businessDate, input.businessDate),
          ),
        )
        .orderBy(desc(inventoryDays.businessDate), desc(inventoryCounts.submittedAt));

      const previousBySupply = new Map<
        string,
        { closingQuantity: number; countedAt: Date | null }
      >();
      for (const row of previousRows) {
        if (!previousBySupply.has(row.supplyId) && row.closingQuantity !== null) {
          previousBySupply.set(row.supplyId, {
            closingQuantity: Number(row.closingQuantity),
            countedAt: row.countedAt,
          });
        }
      }

      const receivedBySupply = await this.sumReceivedByDay(day.id, conn);
      const items = await conn
        .insert(inventoryCountItems)
        .values(
          supplyIds.map((supplyId) => {
            const previous = previousBySupply.get(supplyId);
            return {
              inventoryCountId: count.id,
              supplyId,
              openingQuantity: previous?.closingQuantity ?? 0,
              receivedQuantity: receivedBySupply.get(supplyId) ?? 0,
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
      const current = await this.getInventoryCount(countId, conn);
      if (!current) {
        throw new AppError(404, "INVENTORY_COUNT_NOT_FOUND", "Inventory count not found");
      }
      if (current.status !== "draft") {
        throw new AppError(409, "INVENTORY_COUNT_NOT_DRAFT", "Inventory count is not a draft");
      }

      const snapshotSupplyIds = new Set(current.items.map((item) => item.supplyId));
      for (const item of input.items ?? []) {
        if (!snapshotSupplyIds.has(item.supplyId)) {
          throw new AppError(
            400,
            "SUPPLY_NOT_IN_COUNT",
            "Supply is not part of the inventory count snapshot",
          );
        }
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

      const receivedBySupply = await this.sumReceivedByDay(current.inventoryDayId, conn);
      for (const item of current.items) {
        await conn
          .update(inventoryCountItems)
          .set({ receivedQuantity: receivedBySupply.get(item.supplyId) ?? 0 })
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

  private async sumReceivedByDay(dayId: string, conn: Executor) {
    const rows = await conn
      .select({
        supplyId: receiptItems.supplyId,
        total: sql<number>`coalesce(sum(${receiptItems.acceptedQuantity}), 0)`,
      })
      .from(receiptItems)
      .innerJoin(receipts, eq(receiptItems.receiptId, receipts.id))
      .where(and(eq(receipts.inventoryDayId, dayId), eq(receipts.status, "completed")))
      .groupBy(receiptItems.supplyId);
    return new Map(rows.map((row) => [row.supplyId, Number(row.total)]));
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
