import { asc, eq } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { units } from "../supplies/supplies.schema.js";

export type CreateUnitInput = Pick<typeof units.$inferInsert, "name" | "symbol" | "active">;

export class UnitsRepo {
  constructor(private readonly conn: Executor) {}

  getUnits() {
    return this.conn.select().from(units).orderBy(asc(units.name), asc(units.symbol));
  }

  async getUnitById(unitId: string) {
    const [unit] = await this.conn.select().from(units).where(eq(units.id, unitId));
    return unit;
  }

  async createUnit(input: CreateUnitInput) {
    const [unit] = await this.conn.insert(units).values(input).onConflictDoNothing().returning();

    return unit;
  }
}

export type Unit = Awaited<ReturnType<UnitsRepo["getUnits"]>>[number];

export interface UnitsRepository {
  getUnits(): Promise<Unit[]>;
  getUnitById(unitId: string): Promise<Unit | undefined>;
  createUnit(input: CreateUnitInput): Promise<Unit | undefined>;
}
