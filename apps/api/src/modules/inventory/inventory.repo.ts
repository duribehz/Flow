import { and, desc, eq, sql } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import {
  inventoryClosureItems,
  inventoryClosures,
  inventoryReceipts,
  inventoryShifts,
} from "./inventory.schema.js";
import { branchSupplySettings } from "../supplies/supplies.schema.js";

export type ListInventoryShiftsFilters = {
  branchId?: string;
  businessDate?: string;
  shiftName?: "morning" | "afternoon" | "night";
};

export type ListInventoryClosuresFilters = {
  branchId?: string;
  businessDate?: string;
};

export type CreateShiftInput = Pick<
  typeof inventoryShifts.$inferInsert,
  "branchId" | "businessDate" | "shiftName" | "notes"
>;

export type RecordReceiptInput = Pick<
  typeof inventoryReceipts.$inferInsert,
  "supplyId" | "expectedQuantity" | "receivedQuantity" | "incidentType" | "notes"
>;

export class InventoryRepo {
  constructor(private readonly conn: Executor) {}

  async getOpenShift(
    branchId: string,
    businessDate: string,
    shiftName: "morning" | "afternoon" | "night",
  ) {
    const [row] = await this.conn
      .select()
      .from(inventoryShifts)
      .where(
        and(
          eq(inventoryShifts.branchId, branchId),
          eq(inventoryShifts.businessDate, businessDate),
          eq(inventoryShifts.shiftName, shiftName),
        ),
      );
    return row;
  }

  async createShift(actorId: string, input: CreateShiftInput) {
    const [row] = await this.conn
      .insert(inventoryShifts)
      .values({
        branchId: input.branchId,
        businessDate: input.businessDate,
        shiftName: input.shiftName,
        openedBy: actorId,
        notes: input.notes ?? null,
      })
      .returning();
    return row!;
  }

  async getShift(shiftId: string) {
    const [row] = await this.conn
      .select()
      .from(inventoryShifts)
      .where(eq(inventoryShifts.id, shiftId));
    return row;
  }

  async listShifts(filters: ListInventoryShiftsFilters) {
    if (filters.branchId && filters.businessDate && filters.shiftName) {
      return this.conn
        .select()
        .from(inventoryShifts)
        .where(
          and(
            eq(inventoryShifts.branchId, filters.branchId),
            eq(inventoryShifts.businessDate, filters.businessDate),
            eq(inventoryShifts.shiftName, filters.shiftName),
          ),
        )
        .orderBy(desc(inventoryShifts.openedAt));
    }

    if (filters.branchId && filters.businessDate) {
      return this.conn
        .select()
        .from(inventoryShifts)
        .where(
          and(
            eq(inventoryShifts.branchId, filters.branchId),
            eq(inventoryShifts.businessDate, filters.businessDate),
          ),
        )
        .orderBy(desc(inventoryShifts.openedAt));
    }

    if (filters.branchId && filters.shiftName) {
      return this.conn
        .select()
        .from(inventoryShifts)
        .where(
          and(
            eq(inventoryShifts.branchId, filters.branchId),
            eq(inventoryShifts.shiftName, filters.shiftName),
          ),
        )
        .orderBy(desc(inventoryShifts.openedAt));
    }

    if (filters.businessDate && filters.shiftName) {
      return this.conn
        .select()
        .from(inventoryShifts)
        .where(
          and(
            eq(inventoryShifts.businessDate, filters.businessDate),
            eq(inventoryShifts.shiftName, filters.shiftName),
          ),
        )
        .orderBy(desc(inventoryShifts.openedAt));
    }

    if (filters.branchId) {
      return this.conn
        .select()
        .from(inventoryShifts)
        .where(eq(inventoryShifts.branchId, filters.branchId))
        .orderBy(desc(inventoryShifts.openedAt));
    }

    if (filters.businessDate) {
      return this.conn
        .select()
        .from(inventoryShifts)
        .where(eq(inventoryShifts.businessDate, filters.businessDate))
        .orderBy(desc(inventoryShifts.openedAt));
    }

    if (filters.shiftName) {
      return this.conn
        .select()
        .from(inventoryShifts)
        .where(eq(inventoryShifts.shiftName, filters.shiftName))
        .orderBy(desc(inventoryShifts.openedAt));
    }

    return this.conn.select().from(inventoryShifts).orderBy(desc(inventoryShifts.openedAt));
  }

  async insertReceipt(actorId: string, shiftId: string, input: RecordReceiptInput) {
    const [row] = await this.conn
      .insert(inventoryReceipts)
      .values({
        inventoryShiftId: shiftId,
        supplyId: input.supplyId,
        expectedQuantity: input.expectedQuantity ?? null,
        receivedQuantity: input.receivedQuantity,
        incidentType: input.incidentType ?? "none",
        notes: input.notes ?? null,
        receivedBy: actorId,
      })
      .returning();
    return row!;
  }

  async getClosure(closureId: string) {
    const [row] = await this.conn
      .select()
      .from(inventoryClosures)
      .where(eq(inventoryClosures.id, closureId));
    return row;
  }

  async getClosureItems(closureId: string) {
    return this.conn
      .select()
      .from(inventoryClosureItems)
      .where(eq(inventoryClosureItems.inventoryClosureId, closureId));
  }

  async listClosures(filters: ListInventoryClosuresFilters) {
    if (filters.branchId) {
      return this.conn
        .select()
        .from(inventoryClosures)
        .where(eq(inventoryClosures.branchId, filters.branchId))
        .orderBy(desc(inventoryClosures.closedAt));
    }

    return this.conn
      .select()
      .from(inventoryClosures)
      .orderBy(desc(inventoryClosures.closedAt));
  }

  async listReceiptsByShift(shiftId: string) {
    return this.conn
      .select()
      .from(inventoryReceipts)
      .where(eq(inventoryReceipts.inventoryShiftId, shiftId));
  }

  async getLastClosingQuantityBySupply(branchId: string, supplyIds: string[]) {
    if (supplyIds.length === 0) {
      return new Map<string, number>();
    }

    const closures = await this.conn
      .select({ id: inventoryClosures.id, closedAt: inventoryClosures.closedAt })
      .from(inventoryClosures)
      .where(eq(inventoryClosures.branchId, branchId))
      .orderBy(desc(inventoryClosures.closedAt));

    if (closures.length === 0) {
      return new Map<string, number>();
    }

    const latestClosureId = closures[0].id;
    const items = await this.conn
      .select({
        supplyId: inventoryClosureItems.supplyId,
        closingQuantity: inventoryClosureItems.closingQuantity,
      })
      .from(inventoryClosureItems)
      .where(eq(inventoryClosureItems.inventoryClosureId, latestClosureId));

    return new Map(items.map((item) => [item.supplyId, Number(item.closingQuantity)]));
  }

  async getActiveBranchSupplySettings(branchId: string) {
    return this.conn
      .select()
      .from(branchSupplySettings)
      .where(
        and(
          eq(branchSupplySettings.branchId, branchId),
          eq(branchSupplySettings.active, true),
        ),
      );
  }

  async markShiftClosed(shiftId: string, actorId: string, closedAt: Date) {
    const [row] = await this.conn
      .update(inventoryShifts)
      .set({
        status: "closed",
        closedBy: actorId,
        closedAt,
      })
      .where(eq(inventoryShifts.id, shiftId))
      .returning();
    return row!;
  }

  async insertClosure(input: {
    inventoryShiftId: string;
    branchId: string;
    closedBy: string;
    closedAt: Date;
    notes: string | null;
  }) {
    const [row] = await this.conn
      .insert(inventoryClosures)
      .values({
        inventoryShiftId: input.inventoryShiftId,
        branchId: input.branchId,
        closedBy: input.closedBy,
        closedAt: input.closedAt,
        notes: input.notes,
      })
      .returning();
    return row!;
  }

  async insertClosureItems(
    closureId: string,
    items: Array<{ supplyId: string; openingQuantity: number; closingQuantity: number }>,
  ) {
    if (items.length === 0) return;
    await this.conn.insert(inventoryClosureItems).values(
      items.map((item) => ({
        inventoryClosureId: closureId,
        supplyId: item.supplyId,
        openingQuantity: item.openingQuantity,
        closingQuantity: item.closingQuantity,
      })),
    );
  }

  async sumReceiptsByShift(shiftId: string): Promise<Map<string, number>> {
    const rows = await this.conn
      .select({
        supplyId: inventoryReceipts.supplyId,
        total: sql<number>`coalesce(sum(${inventoryReceipts.receivedQuantity}), 0)`,
      })
      .from(inventoryReceipts)
      .where(eq(inventoryReceipts.inventoryShiftId, shiftId))
      .groupBy(inventoryReceipts.supplyId);
    return new Map(rows.map((row) => [row.supplyId, Number(row.total)]));
  }
}
