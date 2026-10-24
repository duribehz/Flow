import type { Executor } from "../database/client.js";

export type State = {
  Variables: {
    db: Executor;
    userId: string;
  };
};
