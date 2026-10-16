import type { Executor } from "@/shared/infrastructure/database/client.js";
import { CreateUnit } from "./application/use-cases/create-unit.js";
import { GetUnit } from "./application/use-cases/get-unit.js";
import { ListUnits } from "./application/use-cases/list-units.js";
import { DrizzleUnitsRepository } from "./infrastructure/persistence/drizzle/drizzle-units-repository.js";
import { createUnitsRoutes } from "./presentation/http/units.routes.js";

export function createUnitModule(executor: Executor) {
  const repository = new DrizzleUnitsRepository(executor);

  return createUnitsRoutes(
    new ListUnits(repository),
    new GetUnit(repository),
    new CreateUnit(repository),
  );
}
