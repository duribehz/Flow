import type { Supply } from "../../domain/supply.js";

export function toSupplyResponse(supply: Supply) {
  return {
    ...supply,
    createdAt: supply.createdAt.toISOString(),
    updatedAt: supply.updatedAt.toISOString(),
  };
}
