import { describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { createCategoriesRoutes } from "@/modules/categories/presentation/http/categories.routes.js";
import { errorHandler } from "@/shared/presentation/http/error-handler.js";
import { configureOpenApi } from "@/shared/presentation/http/openapi.js";

const category = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Aceites",
};

function createTestApp() {
  const app = new OpenAPIHono();

  app.onError(errorHandler);
  app.route(
    "/categories",
    createCategoriesRoutes(
      {
        async execute() {
          return [category];
        },
      },
      {
        async execute() {
          return category;
        },
      },
    ),
  );
  configureOpenApi(app);

  return app;
}

describe("category routes", () => {
  test("lists categories", async () => {
    const response = await createTestApp().request("/categories");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [category] });
  });

  test("creates a category", async () => {
    const response = await createTestApp().request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: category.name }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: category });
  });

  test("trims the category name", async () => {
    let receivedInput: unknown;
    const app = new OpenAPIHono();

    app.route(
      "/categories",
      createCategoriesRoutes(
        {
          async execute() {
            return [];
          },
        },
        {
          async execute(input) {
            receivedInput = input;
            return category;
          },
        },
      ),
    );

    const response = await app.request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `  ${category.name}  ` }),
    });

    expect(response.status).toBe(201);
    expect(receivedInput).toEqual({ name: category.name });
  });

  test("rejects an empty name", async () => {
    const response = await createTestApp().request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   " }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
    });
  });

  test("publishes list and create operations in OpenAPI", async () => {
    const response = await createTestApp().request("/openapi.json");
    const document = (await response.json()) as {
      paths: Record<string, { get?: unknown; post?: unknown }>;
    };

    expect(response.status).toBe(200);
    expect(document.paths["/categories"]?.get).toBeDefined();
    expect(document.paths["/categories"]?.post).toBeDefined();
  });
});
