import type { OpenAPIHono } from "@hono/zod-openapi";

export function configureOpenApi(app: OpenAPIHono) {
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Flow API",
      version: "1.0.0",
      description: "Inventory and replenishment management API",
    },
  });
}
