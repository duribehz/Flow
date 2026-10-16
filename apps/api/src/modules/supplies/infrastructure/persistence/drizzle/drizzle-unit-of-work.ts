import type {
  Executor as ApplicationExecutor,
  UnitOfWork,
} from "../../../application/ports/unit-of-work.js";
import type { Database } from "@/shared/infrastructure/database/client.js";
import { DrizzleExecutor, toApplicationExecutor } from "./drizzle-executor.js";

export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(private readonly database: Database) {}

  execute<T>(work: (executor: ApplicationExecutor) => Promise<T>): Promise<T> {
    return this.database.transaction((transaction) =>
      work(toApplicationExecutor(new DrizzleExecutor(transaction))),
    );
  }
}
