import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";

const now = new Date("2026-11-01T12:00:00.000Z");
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  userName: "manager.one",
  role: "manager" as const,
  branch: { id: "20000000-0000-4000-8000-000000000001", name: "Centro" },
  active: true,
  createdAt: now,
};
const listUsersUseCase = mock(async () => [user]);
const createUserUseCase = mock(async () => user);

mock.module("./users.usecases.js", () => ({
  listUsersUseCase,
  createUserUseCase,
  updateUserUseCase: async () => ({ user: undefined, actorId: "" }),
  deactivateUserUseCase: async () => undefined,
}));

const { usersRouter } = await import("./users.router.js");
const testDb = {} as Executor;

function createTestApp() {
  const app = new OpenAPIHono<State>();
  app.use("*", async (context, next) => {
    context.set("db", testDb);
    context.set("userId", user.id);
    context.set("userName", "root");
    context.set("userRole", "super_admin");
    context.set("branchId", null);
    context.set("sessionId", "30000000-0000-4000-8000-000000000001");
    context.set("sessionTokenHash", "test-hash");
    await next();
  });
  app.route("/v1/users", usersRouter);
  configureOpenApi(app);
  return app;
}

beforeEach(() => {
  listUsersUseCase.mockClear();
  createUserUseCase.mockClear();
});

describe("user administration routes", () => {
  test("lists users without exposing passwords", async () => {
    const response = await createTestApp().request("/v1/users");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[0]).toMatchObject({ userName: "manager.one", role: "manager" });
    expect(body.data[0].passwordHash).toBeUndefined();
  });

  test("requires a branch when creating a manager", async () => {
    const response = await createTestApp().request("/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: "manager.two",
        password: "long-password-123",
        role: "manager",
      }),
    });

    expect(response.status).toBe(400);
    expect(createUserUseCase).not.toHaveBeenCalled();
  });
});
