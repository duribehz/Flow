import { asc, eq } from "drizzle-orm";

import type { CreateSupplierCommand } from "../../../application/dto/create-supplier-command.js";
import type { SuppliersRepository } from "../../../application/ports/suppliers-repository.js";
import type { Supplier } from "../../../domain/supplier.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";
import { toSupplier } from "./supplier.mapper.js";
import { suppliers } from "./suppliers.table.js";

export class DrizzleSuppliersRepository implements SuppliersRepository {
  constructor(private readonly executor: Executor) {}

  async findAll(): Promise<Supplier[]> {
    const rows = await this.executor.select().from(suppliers).orderBy(asc(suppliers.name));
    return rows.map(toSupplier);
  }

  async findById(supplierId: string): Promise<Supplier | undefined> {
    const [row] = await this.executor.select().from(suppliers).where(eq(suppliers.id, supplierId));
    return row ? toSupplier(row) : undefined;
  }

  async create(command: CreateSupplierCommand): Promise<Supplier | undefined> {
    const [row] = await this.executor
      .insert(suppliers)
      .values(command)
      .onConflictDoNothing({ target: suppliers.name })
      .returning();
    return row ? toSupplier(row) : undefined;
  }
}
