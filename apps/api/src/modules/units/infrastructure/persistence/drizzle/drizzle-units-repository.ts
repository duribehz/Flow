import { asc, eq } from "drizzle-orm";

import type { CreateUnitCommand } from "../../../application/dto/create-unit-command.js";
import type { UnitsRepository } from "../../../application/ports/units-repository.js";
import type { Unit } from "../../../domain/unit.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { toUnit } from "./unit.mapper.js";
import { units } from "./units.table.js";

export class DrizzleUnitsRepository implements UnitsRepository {
  constructor(private readonly executor: Executor) {}

  async findAll(): Promise<Unit[]> {
    const rows = await this.executor
      .select()
      .from(units)
      .orderBy(asc(units.name), asc(units.symbol));
    return rows.map(toUnit);
  }

  async findById(unitId: string): Promise<Unit | undefined> {
    const [row] = await this.executor.select().from(units).where(eq(units.id, unitId));
    return row ? toUnit(row) : undefined;
  }

  async create(command: CreateUnitCommand): Promise<Unit | undefined> {
    const [row] = await this.executor
      .insert(units)
      .values(command)
      .onConflictDoNothing()
      .returning();
    return row ? toUnit(row) : undefined;
  }
}
