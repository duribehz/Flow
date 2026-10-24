import { asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { branches } from "../branches/branches.schema.js";
import { categories, supplies, units } from "../supplies/supplies.schema.js";
import { users } from "../users/users.schema.js";
import {
  replenishmentRequestCounters,
  replenishmentRequestItems,
  replenishmentRequests,
} from "./replenishments.schema.js";

const reviewers = alias(users, "reviewers");

export type CreateReplenishmentRequestItemInput = {
  supplyId: string;
  suggestedQuantity: number;
  requestedQuantity: number;
  notes?: string | null;
};

export type CreateReplenishmentRequestInput = {
  requestNumber: string;
  branchId: string;
  inventoryClosureId: string;
  requestedBy: string;
  notes?: string | null;
};

export class ReplenishmentsRepo {
  constructor(private readonly conn: Executor) {}

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

  async getReplenishmentById(replenishmentId: string) {
    const [replenishment] = await this.conn
      .select({
        id: replenishmentRequests.id,
        requestNumber: replenishmentRequests.requestNumber,
        inventoryClosureId: replenishmentRequests.inventoryClosureId,
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

    if (!replenishment) {
      return undefined;
    }

    const items = await this.conn
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
        suggestedQuantity: replenishmentRequestItems.suggestedQuantity,
        requestedQuantity: replenishmentRequestItems.requestedQuantity,
        approvedQuantity: replenishmentRequestItems.approvedQuantity,
        fulfilledQuantity: replenishmentRequestItems.fulfilledQuantity,
        notes: replenishmentRequestItems.notes,
        createdAt: replenishmentRequestItems.createdAt,
      })
      .from(replenishmentRequestItems)
      .innerJoin(supplies, eq(replenishmentRequestItems.supplyId, supplies.id))
      .innerJoin(categories, eq(supplies.categoryId, categories.id))
      .innerJoin(units, eq(supplies.unitId, units.id))
      .where(eq(replenishmentRequestItems.replenishmentRequestId, replenishmentId))
      .orderBy(asc(supplies.name));

    return { ...replenishment, items };
  }

  async nextRequestCounter(branchIdPrefix: string): Promise<number> {
    const [row] = await this.conn
      .insert(replenishmentRequestCounters)
      .values({ branchIdPrefix, lastSeq: 1 })
      .onConflictDoUpdate({
        target: replenishmentRequestCounters.branchIdPrefix,
        set: {
          lastSeq: sql`${replenishmentRequestCounters.lastSeq} + 1`,
        },
      })
      .returning({ lastSeq: replenishmentRequestCounters.lastSeq });
    return row!.lastSeq;
  }

  async createRequestWithItems(
    request: CreateReplenishmentRequestInput,
    items: CreateReplenishmentRequestItemInput[],
  ) {
    const [created] = await this.conn
      .insert(replenishmentRequests)
      .values({
        requestNumber: request.requestNumber,
        branchId: request.branchId,
        inventoryClosureId: request.inventoryClosureId,
        requestedBy: request.requestedBy,
        notes: request.notes ?? null,
      })
      .returning();

    if (items.length === 0) {
      return created!;
    }

    await this.conn.insert(replenishmentRequestItems).values(
      items.map((item) => ({
        replenishmentRequestId: created!.id,
        supplyId: item.supplyId,
        suggestedQuantity: item.suggestedQuantity,
        requestedQuantity: item.requestedQuantity,
        notes: item.notes ?? null,
      })),
    );

    return created!;
  }

  async getReplenishmentByClosureId(inventoryClosureId: string) {
    const [row] = await this.conn
      .select()
      .from(replenishmentRequests)
      .where(eq(replenishmentRequests.inventoryClosureId, inventoryClosureId));
    return row;
  }

  async listItemsByReplenishmentId(replenishmentRequestId: string) {
    return this.conn
      .select({
        supplyId: replenishmentRequestItems.supplyId,
        requestedQuantity: replenishmentRequestItems.requestedQuantity,
      })
      .from(replenishmentRequestItems)
      .where(eq(replenishmentRequestItems.replenishmentRequestId, replenishmentRequestId));
  }
}

export type SubmittedReplenishment = Awaited<
  ReturnType<ReplenishmentsRepo["getSubmittedReplenishments"]>
>[number];
export type ReplenishmentDetail = NonNullable<
  Awaited<ReturnType<ReplenishmentsRepo["getReplenishmentById"]>>
>;
