import { and, asc, eq } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { categories, supplies, units } from "./supplies.schema.js";

export type CreateSupplyInput = Pick<
  typeof supplies.$inferInsert,
  "sku" | "name" | "description" | "unitId" | "unitCost" | "categoryId" | "active"
>;

export class SuppliesRepo {
  constructor(private readonly conn: Executor) {}

  getSupplies() {
    return this.selectSupplies().orderBy(asc(supplies.name), asc(supplies.sku));
  }

  async getSupplyById(supplyId: string) {
    const [supply] = await this.selectSupplies().where(eq(supplies.id, supplyId));
    return supply;
  }

  async createSupply(input: CreateSupplyInput) {
    const [createdSupply] = await this.conn
      .insert(supplies)
      .values(input)
      .onConflictDoNothing({ target: supplies.sku })
      .returning({ id: supplies.id });

    if (!createdSupply) {
      return undefined;
    }

    return this.getSupplyById(createdSupply.id);
  }

  async categoryExists(categoryId: string) {
    const [category] = await this.conn
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId));

    return Boolean(category);
  }

  async activeUnitExists(unitId: string) {
    const [unit] = await this.conn
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.id, unitId), eq(units.active, true)));

    return Boolean(unit);
  }

  private selectSupplies() {
    return this.conn
      .select({
        id: supplies.id,
        sku: supplies.sku,
        name: supplies.name,
        description: supplies.description,
        unitCost: supplies.unitCost,
        active: supplies.active,
        category: {
          id: categories.id,
          name: categories.name,
        },
        unit: {
          id: units.id,
          name: units.name,
          symbol: units.symbol,
        },
        createdAt: supplies.createdAt,
        updatedAt: supplies.updatedAt,
      })
      .from(supplies)
      .innerJoin(categories, eq(supplies.categoryId, categories.id))
      .innerJoin(units, eq(supplies.unitId, units.id));
  }
}

export type Supply = Awaited<ReturnType<SuppliesRepo["getSupplies"]>>[number];

export interface SuppliesRepository {
  getSupplies(): Promise<Supply[]>;
  createSupply(input: CreateSupplyInput): Promise<Supply | undefined>;
  categoryExists(categoryId: string): Promise<boolean>;
  activeUnitExists(unitId: string): Promise<boolean>;
}
