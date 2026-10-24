import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { AppError } from "@/shared/errors/app-error.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { branches } from "../branches/branches.schema.js";
import {
  inventoryCountItems,
  inventoryCounts,
  inventoryDays,
} from "../inventory/inventory.schema.js";
import {
  branchSupplySettings,
  branchSupplyWeeklyTargets,
  categories,
  supplies,
  units,
} from "../supplies/supplies.schema.js";
import { usagePurposes } from "../usage-purposes/usage-purposes.schema.js";
import { users } from "../users/users.schema.js";
import {
  replenishmentRequestCounters,
  replenishmentRequestItems,
  replenishmentRequests,
} from "./replenishments.schema.js";

const reviewers = alias(users, "reviewers");

export type AddReplenishmentRequestItemInput = {
  supplyId: string;
  usagePurposeId: string;
  requestedQuantity: number;
};

export class ReplenishmentsRepo {
  constructor(private readonly conn: Executor) {}

  async createDraftFromSubmittedCount(countId: string, requestedBy: string) {
    const [count] = await this.conn
      .select({
        id: inventoryCounts.id,
        branchId: inventoryCounts.branchId,
        inventoryDayId: inventoryCounts.inventoryDayId,
        status: inventoryCounts.status,
        businessDate: inventoryDays.businessDate,
      })
      .from(inventoryCounts)
      .innerJoin(inventoryDays, eq(inventoryCounts.inventoryDayId, inventoryDays.id))
      .where(eq(inventoryCounts.id, countId));

    if (!count) throw new AppError(404, "INVENTORY_COUNT_NOT_FOUND", "Inventory count not found");
    if (count.status !== "submitted") {
      throw new AppError(
        409,
        "INVENTORY_COUNT_NOT_SUBMITTED",
        "Only submitted counts can create a replenishment request",
      );
    }

    const existing = await this.getReplenishmentByCountId(countId);
    if (existing) {
      throw new AppError(
        409,
        "REPLENISHMENT_ALREADY_EXISTS",
        "A replenishment request already exists for this count",
      );
    }

    const tomorrowWeekday = getNextWeekday(count.businessDate);
    const configuredItems = await this.conn
      .select({
        supplyId: inventoryCountItems.supplyId,
        counted: inventoryCountItems.counted,
        closingQuantity: inventoryCountItems.closingQuantity,
        mode: branchSupplySettings.mode,
        usagePurposeId: branchSupplySettings.defaultUsagePurposeId,
        targetQuantity: branchSupplyWeeklyTargets.targetQuantity,
        unitCost: supplies.unitCost,
      })
      .from(inventoryCountItems)
      .innerJoin(
        branchSupplySettings,
        and(
          eq(branchSupplySettings.branchId, count.branchId),
          eq(branchSupplySettings.supplyId, inventoryCountItems.supplyId),
        ),
      )
      .innerJoin(supplies, eq(supplies.id, inventoryCountItems.supplyId))
      .leftJoin(
        branchSupplyWeeklyTargets,
        and(
          eq(branchSupplyWeeklyTargets.branchSupplySettingId, branchSupplySettings.id),
          eq(branchSupplyWeeklyTargets.weekday, tomorrowWeekday),
        ),
      )
      .where(eq(inventoryCountItems.inventoryCountId, countId));

    const sequence = await this.nextRequestCounter(count.branchId.slice(0, 8).toUpperCase());
    const prefix = count.branchId.slice(0, 8).toUpperCase();
    const requestNumber = `REQ-${prefix}-${String(sequence).padStart(6, "0")}`;
    const [request] = await this.conn
      .insert(replenishmentRequests)
      .values({
        requestNumber,
        branchId: count.branchId,
        inventoryCountId: countId,
        requestedBy,
      })
      .returning();

    const fixedItems = configuredItems.filter((item) => item.mode === "fixed");
    if (fixedItems.length > 0) {
      await this.conn.insert(replenishmentRequestItems).values(
        fixedItems.map((item) => {
          const suggestedQuantity =
            item.counted && item.closingQuantity !== null && item.targetQuantity !== null
              ? Math.max(item.targetQuantity - item.closingQuantity, 0)
              : null;
          const requestedQuantity = suggestedQuantity ?? 0;
          return {
            replenishmentRequestId: request!.id,
            supplyId: item.supplyId,
            usagePurposeId: item.usagePurposeId,
            suggestedQuantity,
            requestedQuantity,
            approvedQuantity: null,
            fulfilledQuantity: 0,
            unitCost: item.unitCost,
            lineTotal: calculateReplenishmentLineTotal(item.unitCost, requestedQuantity),
          };
        }),
      );
    }

    return request!;
  }

  async getSubmittedReplenishments() {
    const replenishments = await this.conn
      .select({
        id: replenishmentRequests.id,
        requestNumber: replenishmentRequests.requestNumber,
        branch: {
          id: branches.id,
          name: branches.name,
        },
        requestedBy: {
          id: users.id,
          userName: users.userName,
        },
        submittedAt: replenishmentRequests.submittedAt,
        createdAt: replenishmentRequests.createdAt,
      })
      .from(replenishmentRequests)
      .innerJoin(branches, eq(replenishmentRequests.branchId, branches.id))
      .innerJoin(users, eq(replenishmentRequests.requestedBy, users.id))
      .where(eq(replenishmentRequests.status, "submitted"))
      .orderBy(asc(replenishmentRequests.submittedAt), asc(replenishmentRequests.createdAt));

    return replenishments.map((replenishment) => ({
      ...replenishment,
      status: "submitted" as const,
    }));
  }

  async getDraftReplenishments() {
    const replenishments = await this.conn
      .select({
        id: replenishmentRequests.id,
        requestNumber: replenishmentRequests.requestNumber,
        inventoryCountId: replenishmentRequests.inventoryCountId,
        branch: { id: branches.id, name: branches.name },
        requestedBy: { id: users.id, userName: users.userName },
        createdAt: replenishmentRequests.createdAt,
        updatedAt: replenishmentRequests.updatedAt,
      })
      .from(replenishmentRequests)
      .innerJoin(branches, eq(replenishmentRequests.branchId, branches.id))
      .innerJoin(users, eq(replenishmentRequests.requestedBy, users.id))
      .where(eq(replenishmentRequests.status, "draft"))
      .orderBy(asc(replenishmentRequests.createdAt));

    return replenishments.map((replenishment) => ({
      ...replenishment,
      status: "draft" as const,
    }));
  }

  async getReplenishmentById(replenishmentId: string, conn: Executor = this.conn) {
    const [replenishment] = await conn
      .select({
        id: replenishmentRequests.id,
        requestNumber: replenishmentRequests.requestNumber,
        inventoryCountId: replenishmentRequests.inventoryCountId,
        status: replenishmentRequests.status,
        branch: {
          id: branches.id,
          name: branches.name,
        },
        requestedBy: {
          id: users.id,
          userName: users.userName,
        },
        reviewedBy: {
          id: reviewers.id,
          userName: reviewers.userName,
        },
        submittedAt: replenishmentRequests.submittedAt,
        reviewedAt: replenishmentRequests.reviewedAt,
        notes: replenishmentRequests.notes,
        createdAt: replenishmentRequests.createdAt,
        updatedAt: replenishmentRequests.updatedAt,
      })
      .from(replenishmentRequests)
      .innerJoin(branches, eq(replenishmentRequests.branchId, branches.id))
      .innerJoin(users, eq(replenishmentRequests.requestedBy, users.id))
      .leftJoin(reviewers, eq(replenishmentRequests.reviewedBy, reviewers.id))
      .where(eq(replenishmentRequests.id, replenishmentId));

    if (!replenishment) return undefined;

    const items = await conn
      .select({
        id: replenishmentRequestItems.id,
        supply: {
          id: supplies.id,
          sku: supplies.sku,
          name: supplies.name,
        },
        category: {
          id: categories.id,
          name: categories.name,
        },
        unit: {
          id: units.id,
          name: units.name,
          symbol: units.symbol,
        },
        usagePurposeId: replenishmentRequestItems.usagePurposeId,
        usagePurposeName: usagePurposes.name,
        existenceQuantity: inventoryCountItems.closingQuantity,
        suggestedQuantity: replenishmentRequestItems.suggestedQuantity,
        requestedQuantity: replenishmentRequestItems.requestedQuantity,
        approvedQuantity: replenishmentRequestItems.approvedQuantity,
        fulfilledQuantity: replenishmentRequestItems.fulfilledQuantity,
        unitCost: replenishmentRequestItems.unitCost,
        lineTotal: replenishmentRequestItems.lineTotal,
        createdAt: replenishmentRequestItems.createdAt,
      })
      .from(replenishmentRequestItems)
      .innerJoin(supplies, eq(replenishmentRequestItems.supplyId, supplies.id))
      .innerJoin(categories, eq(supplies.categoryId, categories.id))
      .innerJoin(units, eq(supplies.unitId, units.id))
      .innerJoin(usagePurposes, eq(replenishmentRequestItems.usagePurposeId, usagePurposes.id))
      .leftJoin(
        inventoryCountItems,
        and(
          eq(inventoryCountItems.inventoryCountId, replenishment.inventoryCountId),
          eq(inventoryCountItems.supplyId, replenishmentRequestItems.supplyId),
        ),
      )
      .where(eq(replenishmentRequestItems.replenishmentRequestId, replenishmentId))
      .orderBy(asc(supplies.name), asc(replenishmentRequestItems.createdAt));

    return { ...replenishment, items };
  }

  async updateNotes(replenishmentId: string, notes: string | null) {
    return this.runInTransaction(async (conn) => {
      await this.assertDraft(replenishmentId, conn);
      const [updated] = await conn
        .update(replenishmentRequests)
        .set({ notes, updatedAt: new Date() })
        .where(eq(replenishmentRequests.id, replenishmentId))
        .returning({ id: replenishmentRequests.id });
      if (!updated) throw draftConflict();
      return (await this.getReplenishmentById(replenishmentId, conn))!;
    });
  }

  async addItem(replenishmentId: string, input: AddReplenishmentRequestItemInput) {
    return this.runInTransaction(async (conn) => {
      await this.assertDraft(replenishmentId, conn);
      const [supply] = await conn
        .select({ id: supplies.id, unitCost: supplies.unitCost })
        .from(supplies)
        .where(and(eq(supplies.id, input.supplyId), eq(supplies.active, true)));
      if (!supply) throw new AppError(404, "SUPPLY_NOT_FOUND", "Active supply not found");

      const [purpose] = await conn
        .select({ id: usagePurposes.id })
        .from(usagePurposes)
        .where(and(eq(usagePurposes.id, input.usagePurposeId), eq(usagePurposes.active, true)));
      if (!purpose) {
        throw new AppError(404, "USAGE_PURPOSE_NOT_FOUND", "Active usage purpose not found");
      }

      await conn.insert(replenishmentRequestItems).values({
        replenishmentRequestId: replenishmentId,
        supplyId: supply.id,
        usagePurposeId: purpose.id,
        suggestedQuantity: null,
        requestedQuantity: input.requestedQuantity,
        approvedQuantity: null,
        fulfilledQuantity: 0,
        unitCost: supply.unitCost,
        lineTotal: calculateReplenishmentLineTotal(supply.unitCost, input.requestedQuantity),
      });
      await this.touchRequest(replenishmentId, conn);
      return (await this.getReplenishmentById(replenishmentId, conn))!;
    });
  }

  async updateItem(
    replenishmentId: string,
    itemId: string,
    requestedQuantity: number | undefined,
    usagePurposeId?: string,
  ) {
    return this.runInTransaction(async (conn) => {
      await this.assertDraft(replenishmentId, conn);
      const [item] = await conn
        .select()
        .from(replenishmentRequestItems)
        .where(
          and(
            eq(replenishmentRequestItems.id, itemId),
            eq(replenishmentRequestItems.replenishmentRequestId, replenishmentId),
          ),
        );
      if (!item) throw new AppError(404, "REPLENISHMENT_ITEM_NOT_FOUND", "Request item not found");

      if (usagePurposeId !== undefined) {
        const [purpose] = await conn
          .select({ id: usagePurposes.id })
          .from(usagePurposes)
          .where(and(eq(usagePurposes.id, usagePurposeId), eq(usagePurposes.active, true)));
        if (!purpose) {
          throw new AppError(404, "USAGE_PURPOSE_NOT_FOUND", "Active usage purpose not found");
        }
      }

      await conn
        .update(replenishmentRequestItems)
        .set({
          requestedQuantity: requestedQuantity ?? item.requestedQuantity,
          usagePurposeId: usagePurposeId ?? item.usagePurposeId,
          lineTotal: calculateReplenishmentLineTotal(
            item.unitCost,
            requestedQuantity ?? item.requestedQuantity,
          ),
        })
        .where(eq(replenishmentRequestItems.id, itemId));
      await this.touchRequest(replenishmentId, conn);
      return (await this.getReplenishmentById(replenishmentId, conn))!;
    });
  }

  async deleteItem(replenishmentId: string, itemId: string) {
    return this.runInTransaction(async (conn) => {
      await this.assertDraft(replenishmentId, conn);
      const [deleted] = await conn
        .delete(replenishmentRequestItems)
        .where(
          and(
            eq(replenishmentRequestItems.id, itemId),
            eq(replenishmentRequestItems.replenishmentRequestId, replenishmentId),
          ),
        )
        .returning({ id: replenishmentRequestItems.id });
      if (!deleted)
        throw new AppError(404, "REPLENISHMENT_ITEM_NOT_FOUND", "Request item not found");
      await this.touchRequest(replenishmentId, conn);
      return (await this.getReplenishmentById(replenishmentId, conn))!;
    });
  }

  async submit(replenishmentId: string) {
    return this.runInTransaction(async (conn) => {
      await this.assertDraft(replenishmentId, conn);
      const items = await conn
        .select({ requestedQuantity: replenishmentRequestItems.requestedQuantity })
        .from(replenishmentRequestItems)
        .where(eq(replenishmentRequestItems.replenishmentRequestId, replenishmentId));
      if (items.length === 0 || items.some((item) => item.requestedQuantity <= 0)) {
        throw new AppError(
          400,
          "REPLENISHMENT_ITEMS_REQUIRE_POSITIVE_QUANTITY",
          "A replenishment request requires items with positive requested quantities",
        );
      }

      const submittedAt = new Date();
      const [updated] = await conn
        .update(replenishmentRequests)
        .set({ status: "submitted", submittedAt, updatedAt: submittedAt })
        .where(
          and(
            eq(replenishmentRequests.id, replenishmentId),
            eq(replenishmentRequests.status, "draft"),
          ),
        )
        .returning({ id: replenishmentRequests.id });
      if (!updated) throw draftConflict();
      return (await this.getReplenishmentById(replenishmentId, conn))!;
    });
  }

  async getReplenishmentByCountId(inventoryCountId: string) {
    const [row] = await this.conn
      .select()
      .from(replenishmentRequests)
      .where(eq(replenishmentRequests.inventoryCountId, inventoryCountId));
    return row;
  }

  private async nextRequestCounter(branchIdPrefix: string): Promise<number> {
    const [row] = await this.conn
      .insert(replenishmentRequestCounters)
      .values({ branchIdPrefix, lastSeq: 1 })
      .onConflictDoUpdate({
        target: replenishmentRequestCounters.branchIdPrefix,
        set: { lastSeq: sql`${replenishmentRequestCounters.lastSeq} + 1` },
      })
      .returning({ lastSeq: replenishmentRequestCounters.lastSeq });
    return row!.lastSeq;
  }

  private async assertDraft(replenishmentId: string, conn: Executor) {
    const [request] = await conn
      .select({ status: replenishmentRequests.status })
      .from(replenishmentRequests)
      .where(eq(replenishmentRequests.id, replenishmentId))
      .for("update");
    if (!request) throw new AppError(404, "REPLENISHMENT_NOT_FOUND", "Replenishment not found");
    if (request.status !== "draft") throw draftConflict();
  }

  private touchRequest(replenishmentId: string, conn: Executor) {
    return conn
      .update(replenishmentRequests)
      .set({ updatedAt: new Date() })
      .where(eq(replenishmentRequests.id, replenishmentId));
  }

  private runInTransaction<T>(callback: (conn: Executor) => Promise<T>) {
    if ("transaction" in this.conn) return this.conn.transaction(callback);
    return callback(this.conn);
  }
}

function getNextWeekday(businessDate: string) {
  const next = new Date(`${businessDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const weekday = next.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function calculateReplenishmentLineTotal(unitCost: number, quantityInHundredths: number) {
  if (
    !Number.isSafeInteger(unitCost) ||
    !Number.isSafeInteger(quantityInHundredths) ||
    unitCost < 0 ||
    quantityInHundredths < 0
  ) {
    throw new AppError(400, "INVALID_REPLENISHMENT_AMOUNT", "Amounts must be safe integers");
  }
  const total = (BigInt(unitCost) * BigInt(quantityInHundredths) + 50n) / 100n;
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new AppError(400, "REPLENISHMENT_LINE_TOTAL_OVERFLOW", "Line total is too large");
  }
  return Number(total);
}

function draftConflict() {
  return new AppError(409, "REPLENISHMENT_NOT_DRAFT", "Replenishment is not a draft");
}

export type SubmittedReplenishment = Awaited<
  ReturnType<ReplenishmentsRepo["getSubmittedReplenishments"]>
>[number];
export type ReplenishmentDetail = NonNullable<
  Awaited<ReturnType<ReplenishmentsRepo["getReplenishmentById"]>>
>;
