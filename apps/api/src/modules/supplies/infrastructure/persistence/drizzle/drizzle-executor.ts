import type { Executor as ApplicationExecutor } from "../../../application/ports/unit-of-work.js";
import type { Executor as DatabaseExecutor } from "@/shared/infrastructure/database/client.js";

export class DrizzleExecutor {
  constructor(readonly connection: DatabaseExecutor) {}
}

export function toApplicationExecutor(executor: DrizzleExecutor): ApplicationExecutor {
  return executor as unknown as ApplicationExecutor;
}

export function toDatabaseExecutor(executor: ApplicationExecutor): DatabaseExecutor {
  if (!(executor instanceof DrizzleExecutor)) throw new TypeError("Invalid supplies executor");
  return executor.connection;
}
