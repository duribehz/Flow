import type { Database } from "@/shared/infrastructure/database/client.js";
import { CreateSupply } from "./application/use-cases/create-supply.js";
import { ListSupplies } from "./application/use-cases/list-supplies.js";
import { ReplaceSupplySuppliers } from "./application/use-cases/replace-supply-suppliers.js";
import { DrizzleSupplyRepository } from "./infrastructure/persistence/drizzle/drizzle-supply.repository.js";
import { DrizzleUnitOfWork } from "./infrastructure/persistence/drizzle/drizzle-unit-of-work.js";
import { createSupplyRoutes } from "./presentation/http/supply.routes.js";

export function createSupplyModule(database: Database) {
  const supplies = new DrizzleSupplyRepository(database);
  const unitOfWork = new DrizzleUnitOfWork(database);

  return createSupplyRoutes({
    list: new ListSupplies(supplies),
    create: new CreateSupply(supplies, unitOfWork),
    replaceSuppliers: new ReplaceSupplySuppliers(supplies, unitOfWork),
  });
}
