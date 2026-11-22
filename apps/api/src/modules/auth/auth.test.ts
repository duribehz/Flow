import { beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";

import { configureOpenApi } from "@/shared/infrastructure/http/openapi.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import type { Executor } from "@/shared/infrastructure/database/client.js";

const now = new Date("2026-11-01T12:00:00.000Z");
const user = {
  id: "10000000-0000-4000-8000-000000000001",
  userName: "dario",
  role: "super_admin" as const,
  branch: null,
  active: true,
  createdAt: now,
};

const loginUseCase = mock(async () => ({
  token: "opaque-session-token",
  expiresAt: new Date("2026-11-02T00:00:00.000Z"),
  user,
}));
const getCurrentUserUseCase = mock(async () => user);
const logoutUseCase = mock(async () => undefined);

mock.module("./auth.usecases.js", () => ({
  loginUseCase,
  getCurrentUserUseCase,
  logoutUseCase,
  hashSessionToken: (token: string) => `hash:${token}`,
}));

const { authRouter } = await import("./auth.router.js");
const testDb = {} as Executor;

function createTestApp() {
  const app = new OpenAPIHono<State>();
  app.use("*", async (context, next) => {
    context.set("db", testDb);
    context.set("userId", user.id);
    context.set("userName", user.userName);
    context.set("userRole", user.role);
    context.set("branchId", null);
    context.set("sessionId", "20000000-0000-4000-8000-000000000001");
    context.set("sessionTokenHash", "hash:opaque-session-token");
    await next();
  });
  app.route("/v1/auth", authRouter);
  configureOpenApi(app);
  return app;
}

beforeEach(() => {
  loginUseCase.mockClear();
  getCurrentUserUseCase.mockClear();
  logoutUseCase.mockClear();
});

describe("authentication routes", () => {
  test("creates a secure http-only session cookie on login", async () => {
    const response = await createTestApp().request("/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "user-agent": "test-agent" },
      body: JSON.stringify({ userName: " DARIO ", password: "long-password-123" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("flow_session=opaque-session-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
    expect(await response.json()).toMatchObject({
      data: { userName: "dario", role: "super_admin" },
    });
    expect(loginUseCase).toHaveBeenCalledWith(
      { userName: "dario", password: "long-password-123" },
      { ipAddress: null, userAgent: "test-agent" },
      testDb,
    );
  });

  test("returns the current user and revokes the session on logout", async () => {
    const app = createTestApp();
    const me = await app.request("/v1/auth/me");
    const logout = await app.request("/v1/auth/logout", {
      method: "POST",
      headers: { Cookie: "flow_session=opaque-session-token" },
    });

    expect(me.status).toBe(200);
    expect((await me.json()).data).toMatchObject({ id: user.id, role: user.role });
    expect(logout.status).toBe(204);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(logoutUseCase).toHaveBeenCalledWith("hash:opaque-session-token", testDb);
  });
});
