import type { Executor } from "@/shared/infrastructure/database/client.js";
import { CreateSupplier } from "./application/use-cases/create-supplier.js";
import { GetSupplier } from "./application/use-cases/get-supplier.js";
import { ListSuppliers } from "./application/use-cases/list-suppliers.js";
import { DrizzleSuppliersRepository } from "./infrastructure/persistence/drizzle/drizzle-suppliers-repository.js";
import { createSuppliersRoutes } from "./presentation/http/suppliers.routes.js";

export function createSupplierModule(executor: Executor) {
  const repository = new DrizzleSuppliersRepository(executor);

  return createSuppliersRoutes(
    new ListSuppliers(repository),
    new GetSupplier(repository),
    new CreateSupplier(repository),
  );
}
