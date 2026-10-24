import type { MiddlewareHandler } from "hono";

import type { State } from "../http/state.js";

const DEV_ACTOR_ID = "00000000-0000-4000-8000-000000000001";

export const devActorMiddleware: MiddlewareHandler<State> = async (context, next) => {
  context.set("userId", DEV_ACTOR_ID);
  await next();
};
