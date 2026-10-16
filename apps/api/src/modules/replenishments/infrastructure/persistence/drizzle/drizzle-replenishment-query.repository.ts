import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { branches } from "@/modules/branches/infrastructure/persistence/drizzle/branches.table.js";
import { categories } from "@/modules/categories/infrastructure/persistence/drizzle/categories.table.js";
import { supplies } from "@/modules/supplies/infrastructure/persistence/drizzle/supply.table.js";
import { units } from "@/modules/units/infrastructure/persistence/drizzle/units.table.js";
import { users } from "@/modules/users/infrastructure/persistence/drizzle/users.table.js";
import type {
  ReplenishmentDetailReadModel,
  ReplenishmentItemReadModel,
  SubmittedReplenishmentReadModel,
} from "../../../domain/read-models/replenishment.read-model.js";
import type { ReplenishmentQueryRepository } from "../../../application/ports/replenishment-query.repository.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { replenishmentRequestItems, replenishmentRequests } from "./replenishment.table.js";

const reviewers = alias(users, "reviewers");

export class DrizzleReplenishmentQueryRepository implements ReplenishmentQueryRepository {
  constructor(private readonly connection: Executor) {}

  async findSubmitted(): Promise<SubmittedReplenishmentReadModel[]> {
    const rows = await this.connection
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

    return rows.map((row) => ({ ...row, status: "submitted" }));
  }

  async findDetailById(replenishmentId: string): Promise<ReplenishmentDetailReadModel | undefined> {
    const [row] = await this.connection
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

    if (!row) {
      return undefined;
    }

    const items: ReplenishmentItemReadModel[] = await this.connection
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

    return { ...row, items };
  }
}
