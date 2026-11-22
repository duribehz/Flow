import { describe, expect, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import type { Executor } from "../database/client.js";
import { assertBranchAccess, authenticateRequest, authorizeRoleRoutes } from "./auth-middleware.js";
import type { State } from "./state.js";

function appForRole(role: "manager" | "admin" | "super_admin") {
  const app = new OpenAPIHono<State>();
  app.use("*", async (context, next) => {
    context.set("db", {} as Executor);
    context.set("userId", "00000000-0000-4000-8000-000000000001");
    context.set("userName", "tester");
    context.set("userRole", role);
    context.set("branchId", role === "manager" ? "10000000-0000-4000-8000-000000000001" : null);
    context.set("sessionId", "00000000-0000-4000-8000-000000000002");
    context.set("sessionTokenHash", "test-hash");
    await next();
  });
  app.use("*", authorizeRoleRoutes);
  app.get("/v1/inventory-days", (context) => context.text("inventory"));
  app.get("/v1/inventory/supplies", (context) => context.text("inventory-supplies"));
  app.get("/v1/inventory-counts", (context) => context.text("counts"));
  app.get("/v1/supplies", (context) => context.text("catalog"));
  app.get("/v1/orders", (context) => context.text("orders"));
  app.get("/v1/users", (context) => context.text("users"));
  return app;
}

describe("role authorization", () => {
  test("limits managers to operational screens and hides the review queue", async () => {
    const app = appForRole("manager");
    const inventory = await app.request("/v1/inventory-days");
    const inventorySupplies = await app.request("/v1/inventory/supplies");
    const catalog = await app.request("/v1/supplies");
    const orders = await app.request("/v1/orders");
    const reviewQueue = await app.request("/v1/inventory-counts?status=submitted");

    expect(inventory.status).toBe(200);
    expect(inventorySupplies.status).toBe(200);
    expect(catalog.status).toBe(403);
    expect(orders.status).toBe(403);
    expect(reviewQueue.status).toBe(403);
  });

  test("allows administrators everywhere except user administration", async () => {
    const app = appForRole("admin");
    const orders = await app.request("/v1/orders");
    const users = await app.request("/v1/users");

    expect(orders.status).toBe(200);
    expect(users.status).toBe(403);
  });

  test("limits managers to their assigned branch", () => {
    const branchId = "10000000-0000-4000-8000-000000000001";
    expect(() => assertBranchAccess("manager", branchId, branchId)).not.toThrow();
    expect(() =>
      assertBranchAccess("manager", branchId, "10000000-0000-4000-8000-000000000002"),
    ).toThrow();
    expect(() =>
      assertBranchAccess("admin", null, "10000000-0000-4000-8000-000000000002"),
    ).not.toThrow();
  });
});

describe("session authentication", () => {
  test("rejects protected API requests without a session cookie", async () => {
    const app = new OpenAPIHono<State>();
    app.use("*", async (context, next) => {
      context.set("db", {} as Executor);
      await next();
    });
    app.use("*", authenticateRequest);
    app.get("/v1/inventory-days", (context) => context.text("inventory"));

    const response = await app.request("/v1/inventory-days");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Sign in required" },
    });
  });
});
