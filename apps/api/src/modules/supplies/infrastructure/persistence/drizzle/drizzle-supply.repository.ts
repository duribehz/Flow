import { and, asc, eq, inArray } from "drizzle-orm";

import type { CreateSupplyInput } from "../../../application/dto/create-supply.dto.js";
import type { SupplyRepository } from "../../../application/ports/supply.repository.js";
import type { Executor } from "../../../application/ports/unit-of-work.js";
import type { Supply } from "../../../domain/supply.js";
import type { Database } from "@/shared/infrastructure/database/client.js";
import { categories } from "../../../../categories/infrastructure/persistence/drizzle/categories.table.js";
import { suppliers as suppliersTable } from "../../../../suppliers/infrastructure/persistence/drizzle/suppliers.table.js";
import { units } from "../../../../units/infrastructure/persistence/drizzle/units.table.js";
import { toDatabaseExecutor } from "./drizzle-executor.js";
import { supplies, supplySuppliers } from "./supply.table.js";

export class DrizzleSupplyRepository implements SupplyRepository {
  constructor(private readonly database: Database) {}

  async list(): Promise<Supply[]> {
    const rows = await this.selectSupplies(this.database).orderBy(
      asc(supplies.name),
      asc(supplies.sku),
    );
    return this.addSuppliers(this.database, rows);
  }

  async findById(executor: Executor, supplyId: string): Promise<Supply | undefined> {
    const connection = toDatabaseExecutor(executor);
    const [supply] = await this.selectSupplies(connection).where(eq(supplies.id, supplyId));
    if (!supply) return undefined;

    const [result] = await this.addSuppliers(connection, [supply]);
    return result;
  }

  async create(executor: Executor, input: CreateSupplyInput): Promise<string | undefined> {
    const connection = toDatabaseExecutor(executor);
    const { supplierIds, ...values } = input;
    const [created] = await connection
      .insert(supplies)
      .values(values)
      .onConflictDoNothing({ target: supplies.sku })
      .returning({ id: supplies.id });

    if (!created) return undefined;

    await connection
      .insert(supplySuppliers)
      .values(supplierIds.map((supplierId) => ({ supplyId: created.id, supplierId })));
    return created.id;
  }

  async replaceSuppliers(
    executor: Executor,
    supplyId: string,
    supplierIds: string[],
  ): Promise<void> {
    const connection = toDatabaseExecutor(executor);
    await connection.delete(supplySuppliers).where(eq(supplySuppliers.supplyId, supplyId));
    await connection
      .insert(supplySuppliers)
      .values(supplierIds.map((supplierId) => ({ supplyId, supplierId })));
  }

  async categoryExists(executor: Executor, categoryId: string): Promise<boolean> {
    const [category] = await toDatabaseExecutor(executor)
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId));
    return Boolean(category);
  }

  async activeUnitExists(executor: Executor, unitId: string): Promise<boolean> {
    const [unit] = await toDatabaseExecutor(executor)
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.id, unitId), eq(units.active, true)));
    return Boolean(unit);
  }

  async suppliersExist(executor: Executor, supplierIds: string[]): Promise<boolean> {
    const rows = await toDatabaseExecutor(executor)
      .select({ id: suppliersTable.id })
      .from(suppliersTable)
      .where(inArray(suppliersTable.id, supplierIds));
    return rows.length === supplierIds.length;
  }

  async supplyExists(executor: Executor, supplyId: string): Promise<boolean> {
    const [supply] = await toDatabaseExecutor(executor)
      .select({ id: supplies.id })
      .from(supplies)
      .where(eq(supplies.id, supplyId));
    return Boolean(supply);
  }

  private selectSupplies(connection: Database | ReturnType<typeof toDatabaseExecutor>) {
    return connection
      .select({
        id: supplies.id,
        sku: supplies.sku,
        name: supplies.name,
        description: supplies.description,
        unitCost: supplies.unitCost,
        active: supplies.active,
        category: { id: categories.id, name: categories.name },
        unit: { id: units.id, name: units.name, symbol: units.symbol },
        createdAt: supplies.createdAt,
        updatedAt: supplies.updatedAt,
      })
      .from(supplies)
      .innerJoin(categories, eq(supplies.categoryId, categories.id))
      .innerJoin(units, eq(supplies.unitId, units.id));
  }

  private async addSuppliers<T extends Omit<Supply, "suppliers">>(
    connection: Database | ReturnType<typeof toDatabaseExecutor>,
    supplyRows: T[],
  ): Promise<Array<T & Pick<Supply, "suppliers">>> {
    if (supplyRows.length === 0) return [];

    const rows = await connection
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
    const bySupply = Map.groupBy(rows, (supplier) => supplier.supplyId);

    return supplyRows.map((supply) => ({
      ...supply,
      suppliers: (bySupply.get(supply.id) ?? []).map(({ id, name }) => ({ id, name })),
    }));
  }
}
