import { and, asc, eq, inArray } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { suppliers as suppliersTable } from "../suppliers/suppliers.schema.js";
import { categories, supplies, supplySuppliers, units } from "./supplies.schema.js";

type NewSupply = Pick<
  typeof supplies.$inferInsert,
  "sku" | "name" | "description" | "unitId" | "unitCost" | "categoryId" | "active"
>;

export type CreateSupplyInput = NewSupply & { supplierIds: string[] };

export class SuppliesRepo {
  constructor(private readonly conn: Executor) {}

  async getSupplies() {
    const supplyRows = await this.selectSupplies().orderBy(asc(supplies.name), asc(supplies.sku));
    return this.addSuppliers(supplyRows);
  }

  async getSupplyById(supplyId: string) {
    const [supply] = await this.selectSupplies().where(eq(supplies.id, supplyId));

    if (!supply) {
      return undefined;
    }

    const [supplyWithSuppliers] = await this.addSuppliers([supply]);
    return supplyWithSuppliers;
  }

  createSupply(input: CreateSupplyInput) {
    const { supplierIds, ...supplyInput } = input;

    return this.runInTransaction(async (conn) => {
      const [createdSupply] = await conn
        .insert(supplies)
        .values(supplyInput)
        .onConflictDoNothing({ target: supplies.sku })
        .returning({ id: supplies.id });

      if (!createdSupply) {
        return undefined;
      }

      await conn.insert(supplySuppliers).values(
        supplierIds.map((supplierId) => ({
          supplyId: createdSupply.id,
          supplierId,
        })),
      );

      return new SuppliesRepo(conn).getSupplyById(createdSupply.id);
    });
  }

  replaceSupplySuppliers(supplyId: string, supplierIds: string[]) {
    return this.runInTransaction(async (conn) => {
      await conn.delete(supplySuppliers).where(eq(supplySuppliers.supplyId, supplyId));
      await conn
        .insert(supplySuppliers)
        .values(supplierIds.map((supplierId) => ({ supplyId, supplierId })));

      return new SuppliesRepo(conn).getSupplyById(supplyId);
    });
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

  async suppliersExist(supplierIds: string[]) {
    const existingSuppliers = await this.conn
      .select({ id: suppliersTable.id })
      .from(suppliersTable)
      .where(inArray(suppliersTable.id, supplierIds));

    return existingSuppliers.length === supplierIds.length;
  }

  async supplyExists(supplyId: string) {
    const [supply] = await this.conn
      .select({ id: supplies.id })
      .from(supplies)
      .where(eq(supplies.id, supplyId));

    return Boolean(supply);
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

  private async addSuppliers<T extends { id: string }>(supplyRows: T[]) {
    if (supplyRows.length === 0) {
      return supplyRows.map((supply) => ({ ...supply, suppliers: [] }));
    }

    const supplierRows = await this.conn
      .select({
        supplyId: supplySuppliers.supplyId,
        id: suppliersTable.id,
        name: suppliersTable.name,
      })
      .from(supplySuppliers)
      .innerJoin(suppliersTable, eq(supplySuppliers.supplierId, suppliersTable.id))
      .where(
        inArray(
          supplySuppliers.supplyId,
          supplyRows.map((supply) => supply.id),
        ),
      )
      .orderBy(asc(suppliersTable.name));

    const suppliersBySupply = Map.groupBy(supplierRows, (supplier) => supplier.supplyId);

    return supplyRows.map((supply) => ({
      ...supply,
      suppliers: (suppliersBySupply.get(supply.id) ?? []).map(({ id, name }) => ({ id, name })),
    }));
  }

  private runInTransaction<T>(callback: (conn: Executor) => Promise<T>) {
    if ("transaction" in this.conn) {
      return this.conn.transaction(callback);
    }

    return callback(this.conn);
  }
}

export type Supply = Awaited<ReturnType<SuppliesRepo["getSupplies"]>>[number];

export interface SuppliesRepository {
  getSupplies(): Promise<Supply[]>;
  getSupplyById(supplyId: string): Promise<Supply | undefined>;
  createSupply(input: CreateSupplyInput): Promise<Supply | undefined>;
  replaceSupplySuppliers(supplyId: string, supplierIds: string[]): Promise<Supply | undefined>;
  categoryExists(categoryId: string): Promise<boolean>;
  activeUnitExists(unitId: string): Promise<boolean>;
  suppliersExist(supplierIds: string[]): Promise<boolean>;
  supplyExists(supplyId: string): Promise<boolean>;
}
