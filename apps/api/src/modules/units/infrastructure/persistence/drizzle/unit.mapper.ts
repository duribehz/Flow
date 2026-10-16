import type { Unit } from "../../../domain/unit.js";
import type { units } from "./units.table.js";

type UnitRow = typeof units.$inferSelect;

export function toUnit(row: UnitRow): Unit {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
