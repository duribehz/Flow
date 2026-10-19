import { asc, eq } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { suppliers } from "./suppliers.schema.js";

export type CreateSupplierInput = Pick<
  typeof suppliers.$inferInsert,
  "name" | "phoneNumber" | "email"
>;

export class SuppliersRepo {
  constructor(private readonly conn: Executor) {}

  getSuppliers() {
    return this.conn.select().from(suppliers).orderBy(asc(suppliers.name));
  }

  async getSupplierById(supplierId: string) {
    const [supplier] = await this.conn.select().from(suppliers).where(eq(suppliers.id, supplierId));

    return supplier;
  }

  async createSupplier(input: CreateSupplierInput) {
    const [supplier] = await this.conn
      .insert(suppliers)
      .values(input)
      .onConflictDoNothing({ target: suppliers.name })
      .returning();

    return supplier;
  }
}

export type Supplier = Awaited<ReturnType<SuppliersRepo["getSuppliers"]>>[number];
