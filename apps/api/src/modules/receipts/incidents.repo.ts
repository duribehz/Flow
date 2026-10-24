import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { AppError } from "@/shared/errors/app-error.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { users } from "../users/users.schema.js";
import type { CreateIncidentInput, UpdateIncidentInput } from "./incidents.dto.js";
import { incidents, receiptItems, receipts } from "./receipts.schema.js";

const assignees = alias(users, "assignees");
const resolvers = alias(users, "resolvers");

export class IncidentsRepo {
  constructor(private readonly conn: Executor) {}

  async create(reportedBy: string, input: CreateIncidentInput) {
    const [receipt] = await this.conn
      .select({ id: receipts.id })
      .from(receipts)
      .where(eq(receipts.id, input.receiptId));
    if (!receipt) throw new AppError(404, "RECEIPT_NOT_FOUND", "Receipt not found");
    if (input.receiptItemId) {
      const [item] = await this.conn
        .select({ id: receiptItems.id })
        .from(receiptItems)
        .where(
          and(
            eq(receiptItems.id, input.receiptItemId),
            eq(receiptItems.receiptId, input.receiptId),
          ),
        );
      if (!item)
        throw new AppError(
          404,
          "RECEIPT_ITEM_NOT_FOUND",
          "Receipt item not found for this receipt",
        );
    }
    const [incident] = await this.conn
      .insert(incidents)
      .values({
        incidentNumber: `INC-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        receiptId: input.receiptId,
        receiptItemId: input.receiptItemId ?? null,
        type: input.type,
        description: input.description,
        reportedBy,
      })
      .returning({ id: incidents.id });
    return (await this.getById(incident!.id))!;
  }

  async list(filters: {
    receiptId?: string;
    status?: "open" | "investigating" | "resolved" | "closed";
  }) {
    const rows = await this.conn
      .select({ id: incidents.id })
      .from(incidents)
      .where(
        and(
          filters.receiptId ? eq(incidents.receiptId, filters.receiptId) : undefined,
          filters.status ? eq(incidents.status, filters.status) : undefined,
        ),
      )
      .orderBy(asc(incidents.createdAt));
    const details = await Promise.all(rows.map((row) => this.getById(row.id)));
    return details.filter((incident) => incident !== undefined);
  }

  async getById(incidentId: string, conn: Executor = this.conn) {
    const [incident] = await conn
      .select({
        id: incidents.id,
        incidentNumber: incidents.incidentNumber,
        receiptId: incidents.receiptId,
        receiptItemId: incidents.receiptItemId,
        type: incidents.type,
        status: incidents.status,
        description: incidents.description,
        reportedBy: { id: users.id, userName: users.userName },
        assignedTo: { id: assignees.id, userName: assignees.userName },
        resolution: incidents.resolution,
        resolvedBy: { id: resolvers.id, userName: resolvers.userName },
        resolvedAt: incidents.resolvedAt,
        createdAt: incidents.createdAt,
        updatedAt: incidents.updatedAt,
      })
      .from(incidents)
      .innerJoin(users, eq(incidents.reportedBy, users.id))
      .leftJoin(assignees, eq(incidents.assignedTo, assignees.id))
      .leftJoin(resolvers, eq(incidents.resolvedBy, resolvers.id))
      .where(eq(incidents.id, incidentId));
    return incident;
  }

  async update(incidentId: string, actorId: string, input: UpdateIncidentInput) {
    return this.runInTransaction(async (conn) => {
      const [incident] = await conn
        .select()
        .from(incidents)
        .where(eq(incidents.id, incidentId))
        .for("update");
      if (!incident) throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found");

      if (input.assignedTo) {
        const [assignee] = await conn
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, input.assignedTo));
        if (!assignee) throw new AppError(404, "USER_NOT_FOUND", "Assigned user not found");
      }

      const status = input.status ?? incident.status;
      const resolution = input.resolution === undefined ? incident.resolution : input.resolution;
      const isResolved = status === "resolved" || status === "closed";
      if (isResolved && !resolution?.trim()) {
        throw new AppError(
          400,
          "INCIDENT_RESOLUTION_REQUIRED",
          "Resolution is required to resolve an incident",
        );
      }
      const now = new Date();
      await conn
        .update(incidents)
        .set({
          status,
          assignedTo: input.assignedTo === undefined ? incident.assignedTo : input.assignedTo,
          resolution,
          resolvedBy: isResolved ? actorId : null,
          resolvedAt: isResolved ? (incident.resolvedAt ?? now) : null,
          updatedAt: now,
        })
        .where(eq(incidents.id, incidentId));
      return (await this.getById(incidentId, conn))!;
    });
  }

  private runInTransaction<T>(callback: (conn: Executor) => Promise<T>) {
    if ("transaction" in this.conn) return this.conn.transaction(callback);
    return callback(this.conn);
  }
}

export type Incident = NonNullable<Awaited<ReturnType<IncidentsRepo["getById"]>>>;
