import type { Supplier } from "../../../domain/supplier.js";
import type { suppliers } from "./suppliers.table.js";

type SupplierRow = typeof suppliers.$inferSelect;

export function toSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phoneNumber,
    email: row.email,
  };
}
