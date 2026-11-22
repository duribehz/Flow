import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { AppError } from "@/shared/errors/app-error.js";
import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  clearedSessionCookie,
  readSessionToken,
  sessionCookie,
} from "@/shared/infrastructure/http/auth-middleware.js";
import { authResponseDTO, loginDTO } from "./auth.dto.js";
import {
  hashSessionToken,
  getCurrentUserUseCase,
  loginUseCase,
  logoutUseCase,
} from "./auth.usecases.js";

export const authRouter = new OpenAPIHono<State>({
  defaultHook: (result, context) => {
    if (!result.success) {
      return context.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

authRouter.openapi(
  createRoute({
    method: "post",
    path: "/login",
    operationId: "postAuthLogin",
    tags: ["Authentication"],
    summary: "Start a user session",
    request: {
      body: { required: true, content: { "application/json": { schema: loginDTO } } },
    },
    responses: {
      200: {
        description: "User signed in",
        content: { "application/json": { schema: authResponseDTO } },
      },
      400: {
        description: "Invalid login data",
        content: { "application/json": { schema: errorSchema } },
      },
      401: {
        description: "Invalid credentials",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (context) => {
    const result = await loginUseCase(
      context.req.valid("json"),
      {
        ipAddress: context.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: context.req.header("user-agent") ?? null,
      },
      context.get("db"),
    );
    context.header("Set-Cookie", sessionCookie(result.token, useSecureCookie(context.req.url)));
    context.header("Cache-Control", "no-store");
    return context.json({ data: serializeUser(result.user) }, 200);
  },
);

authRouter.openapi(
  createRoute({
    method: "get",
    path: "/me",
    operationId: "getAuthMe",
    tags: ["Authentication"],
    summary: "Get the current authenticated user",
    responses: {
      200: {
        description: "Current user",
        content: { "application/json": { schema: authResponseDTO } },
      },
      401: {
        description: "Sign in required",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (context) => {
    const user = await getCurrentUserUseCase(context.get("userId"), context.get("db"));
    if (!user) throw new AppError(401, "UNAUTHENTICATED", "Sign in required");
    context.header("Cache-Control", "no-store");
    return context.json({ data: serializeUser(user) }, 200);
  },
);

authRouter.openapi(
  createRoute({
    method: "post",
    path: "/logout",
    operationId: "postAuthLogout",
    tags: ["Authentication"],
    summary: "End the current user session",
    responses: { 204: { description: "Session ended" } },
  }),
  async (context) => {
    const token = readSessionToken(context.req.header("Cookie"));
    if (token) await logoutUseCase(hashSessionToken(token), context.get("db"));
    context.header("Set-Cookie", clearedSessionCookie(useSecureCookie(context.req.url)));
    return context.body(null, 204);
  },
);

function useSecureCookie(url: string) {
  return process.env.NODE_ENV === "production" || url.startsWith("https://");
}

function serializeUser(user: {
  id: string;
  userName: string;
  role: "manager" | "admin" | "super_admin";
  branch: { id: string; name: string } | null;
  active: boolean;
  createdAt: Date;
}) {
  return { ...user, createdAt: user.createdAt.toISOString() };
}
