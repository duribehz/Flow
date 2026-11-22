import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import { createUserDTO, safeUserDTO, updateUserDTO } from "./users.dto.js";
import {
  createUserUseCase,
  deactivateUserUseCase,
  listUsersUseCase,
  updateUserUseCase,
} from "./users.usecases.js";

export const usersRouter = new OpenAPIHono<State>({
  defaultHook: (result, context) => {
    if (!result.success) {
      return context.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

usersRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getUsers",
    tags: ["Users"],
    summary: "List users",
    responses: {
      200: {
        description: "Users",
        content: { "application/json": { schema: z.object({ data: z.array(safeUserDTO) }) } },
      },
      401: {
        description: "Sign in required",
        content: { "application/json": { schema: errorSchema } },
      },
      403: {
        description: "Super admin role required",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (context) => {
    const users = await listUsersUseCase(context.get("db"));
    context.header("Cache-Control", "no-store");
    return context.json(
      { data: users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() })) },
      200,
    );
  },
);

usersRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{userId}",
    operationId: "patchUsersUserId",
    tags: ["Users"],
    summary: "Update a user's name, password, role or branch",
    request: {
      params: z.object({ userId: z.uuid().openapi({ param: { name: "userId", in: "path" } }) }),
      body: { required: true, content: { "application/json": { schema: updateUserDTO } } },
    },
    responses: {
      200: {
        description: "User updated",
        content: { "application/json": { schema: z.object({ data: safeUserDTO }) } },
      },
      400: {
        description: "Invalid user data",
        content: { "application/json": { schema: errorSchema } },
      },
      403: {
        description: "Protected user",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "User or branch not found",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "User name already exists",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (context) => {
    const { userId } = context.req.valid("param");
    const { user } = await updateUserUseCase(
      context.get("userId"),
      userId,
      context.req.valid("json"),
      context.get("db"),
    );
    context.header("Cache-Control", "no-store");
    return context.json({ data: { ...user!, createdAt: user!.createdAt.toISOString() } }, 200);
  },
);

usersRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{userId}",
    operationId: "deleteUsersUserId",
    tags: ["Users"],
    summary: "Deactivate a user (logical delete)",
    request: {
      params: z.object({ userId: z.uuid().openapi({ param: { name: "userId", in: "path" } }) }),
    },
    responses: {
      200: {
        description: "User deactivated",
        content: { "application/json": { schema: z.object({ data: safeUserDTO }) } },
      },
      400: {
        description: "Cannot deactivate yourself",
        content: { "application/json": { schema: errorSchema } },
      },
      403: {
        description: "Protected user",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "User not found",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (context) => {
    const { userId } = context.req.valid("param");
    const user = await deactivateUserUseCase(context.get("userId"), userId, context.get("db"));
    context.header("Cache-Control", "no-store");
    return context.json({ data: { ...user!, createdAt: user!.createdAt.toISOString() } }, 200);
  },
);

usersRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postUsers",
    tags: ["Users"],
    summary: "Create a user and assign a role",
    request: {
      body: { required: true, content: { "application/json": { schema: createUserDTO } } },
    },
    responses: {
      201: {
        description: "User created",
        content: { "application/json": { schema: z.object({ data: safeUserDTO }) } },
      },
      400: {
        description: "Invalid user data",
        content: { "application/json": { schema: errorSchema } },
      },
      403: {
        description: "Super admin role required",
        content: { "application/json": { schema: errorSchema } },
      },
      404: {
        description: "Branch not found",
        content: { "application/json": { schema: errorSchema } },
      },
      409: {
        description: "User name already exists",
        content: { "application/json": { schema: errorSchema } },
      },
    },
  }),
  async (context) => {
    const user = await createUserUseCase(context.req.valid("json"), context.get("db"));
    context.header("Cache-Control", "no-store");
    return context.json({ data: { ...user, createdAt: user.createdAt.toISOString() } }, 201);
  },
);
