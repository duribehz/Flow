import { Scalar } from "@scalar/hono-api-reference";
import type { OpenAPIHono } from "@hono/zod-openapi";

import type { State } from "./state.js";

export function configureOpenApi(app: OpenAPIHono<State>) {
  app.doc("/v1/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Flow API",
      version: "1.0.0",
      description: "Inventory and replenishment management API",
    },
  });

  app.get(
    "/docs/scalar",
    Scalar({
      url: "/v1/openapi.json",
      pageTitle: "Flow API",
    }),
  );
}
