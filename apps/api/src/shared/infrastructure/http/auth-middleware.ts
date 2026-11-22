import type { MiddlewareHandler } from "hono";

import { AuthRepo } from "@/modules/auth/auth.repo.js";
import { hashSessionToken } from "@/modules/auth/auth.usecases.js";
import type { UserRole } from "@/modules/users/users.dto.js";
import { AppError } from "@/shared/errors/app-error.js";
import type { State } from "./state.js";

export const AUTH_SESSION_COOKIE = "flow_session";

export function readSessionToken(cookieHeader: string | undefined) {
  if (!cookieHeader) return undefined;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_SESSION_COOKIE}=`));
  return cookie?.slice(AUTH_SESSION_COOKIE.length + 1) || undefined;
}

export function sessionCookie(token: string, secure: boolean) {
  return `${AUTH_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${secure ? "; Secure" : ""}`;
}

export function clearedSessionCookie(secure: boolean) {
  return `${AUTH_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export const authenticateRequest: MiddlewareHandler<State> = async (context, next) => {
  const path = new URL(context.req.url).pathname;
  if (path === "/v1/openapi.json" || path === "/docs/scalar") return next();

  const method = context.req.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const origin = context.req.header("Origin");
    if (origin && origin !== (process.env.WEB_ORIGIN ?? "http://localhost:5173")) {
      return context.json(
        { error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed" } },
        403,
      );
    }
  }

  const token = readSessionToken(context.req.header("Cookie"));
  if (!token) {
    if (path === "/v1/auth/login" || path === "/v1/auth/logout") return next();
    return context.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, 401);
  }

  const session = await new AuthRepo(context.get("db")).getSession(hashSessionToken(token));
  if (!session) {
    if (path === "/v1/auth/login" || path === "/v1/auth/logout") return next();
    return context.json({ error: { code: "UNAUTHENTICATED", message: "Session expired" } }, 401);
  }

  await new AuthRepo(context.get("db")).touchSession(session.sessionId);
  context.set("userId", session.userId);
  context.set("userName", session.userName);
  context.set("userRole", session.role as UserRole);
  context.set("branchId", session.branchId);
  context.set("sessionId", session.sessionId);
  context.set("sessionTokenHash", hashSessionToken(token));
  await next();
};

export const authorizeRoleRoutes: MiddlewareHandler<State> = async (context, next) => {
  const path = new URL(context.req.url).pathname;
  if (path === "/v1/openapi.json" || path === "/docs/scalar" || path.startsWith("/v1/auth/")) {
    return next();
  }

  const role = context.get("userRole");
  if (role === "super_admin") return next();
  if (role === "admin") {
    if (path === "/v1/users" || path.startsWith("/v1/users/")) {
      return context.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        403,
      );
    }
    return next();
  }

  const managerAllowed =
    (path === "/v1/branches" && context.req.method === "GET") ||
    (path === "/v1/inventory/supplies" && context.req.method === "GET") ||
    (path === "/v1/inventory/last-reports" && context.req.method === "GET") ||
    path === "/v1/inventory-days" ||
    path.startsWith("/v1/inventory-days/") ||
    path === "/v1/inventory-counts" ||
    (path.startsWith("/v1/inventory-counts/") && !path.endsWith("/review")) ||
    path === "/v1/receipts" ||
    path.startsWith("/v1/receipts/") ||
    path === "/v1/incidents" ||
    path.startsWith("/v1/incidents/") ||
    path === "/v1/transfers" ||
    path.startsWith("/v1/transfers/") ||
    (/^\/v1\/shipments\/[0-9a-f-]+\/receipts$/i.test(path) && context.req.method === "POST");

  const managerReviewQueue =
    path === "/v1/inventory-counts" &&
    context.req.method === "GET" &&
    new URL(context.req.url).searchParams.get("status") === "submitted";

  if (!managerAllowed || managerReviewQueue) {
    return context.json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } }, 403);
  }
  await next();
};

export function assertBranchAccess(
  role: UserRole,
  assignedBranchId: string | null,
  branchId: string,
) {
  if (role === "manager" && (!assignedBranchId || assignedBranchId !== branchId)) {
    throw new AppError(403, "BRANCH_ACCESS_DENIED", "This user cannot access another branch");
  }
}
