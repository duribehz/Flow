import { createCategoryModule } from "@/modules/categories/category.module.js";
import { createReplenishmentModule } from "@/modules/replenishments/replenishment.module.js";
import { createSupplierModule } from "@/modules/suppliers/supplier.module.js";
import { createSupplyModule } from "@/modules/supplies/supply.module.js";
import { createUnitModule } from "@/modules/units/unit.module.js";
import type { Database } from "@/shared/infrastructure/database/client.js";

export function composeModules(database: Database) {
  return {
    categories: createCategoryModule(database),
    replenishments: createReplenishmentModule(database),
    supplies: createSupplyModule(database),
    suppliers: createSupplierModule(database),
    units: createUnitModule(database),
  };
}

export type ApplicationModules = ReturnType<typeof composeModules>;
