import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  acceptTransferDTO,
  createTransferDTO,
  listTransfersQueryDTO,
  transferDTO,
  transferBranchOptionDTO,
  transferIdParamsDTO,
} from "./transfers.dto.js";
import {
  acceptTransferUseCase,
  cancelTransferUseCase,
  createTransferUseCase,
  getTransferUseCase,
  listTransferBranchOptionsUseCase,
  listTransfersUseCase,
} from "./transfers.usecases.js";

export const transfersRouter = new OpenAPIHono<State>({
  defaultHook: (result, context) => {
    if (!result.success) {
      return context.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

const errors = {
  400: {
    description: "Invalid transfer data",
    content: { "application/json": { schema: errorSchema } },
  },
  403: {
    description: "Branch access denied",
    content: { "application/json": { schema: errorSchema } },
  },
  404: {
    description: "Branch, article or transfer not found",
    content: { "application/json": { schema: errorSchema } },
  },
  409: {
    description: "Transfer or inventory-day state conflict",
    content: { "application/json": { schema: errorSchema } },
  },
} as const;

transfersRouter.openapi(
  createRoute({
    method: "get",
    path: "/branches",
    operationId: "getTransferBranches",
    tags: ["Transfers"],
    summary: "List branches available for transfer destinations",
    responses: {
      200: {
        description: "Branch choices",
        content: {
          "application/json": { schema: z.object({ data: z.array(transferBranchOptionDTO) }) },
        },
      },
    },
  }),
  async (context) => {
    const branches = await listTransferBranchOptionsUseCase(context.get("db"));
    return context.json({ data: branches }, 200);
  },
);

transfersRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getTransfers",
    tags: ["Transfers"],
    summary: "List sent or received branch transfers",
    request: { query: listTransfersQueryDTO },
    responses: {
      200: {
        description: "Branch transfers",
        content: { "application/json": { schema: z.object({ data: z.array(transferDTO) }) } },
      },
      400: errors[400],
    },
  }),
  async (context) => {
    const transfers = await listTransfersUseCase(
      context.req.valid("query"),
      context.get("db"),
      context.get("userRole") === "manager" ? context.get("branchId")! : undefined,
    );
    return context.json({ data: transfers.map(serializeTransfer) }, 200);
  },
);

transfersRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postTransfers",
    tags: ["Transfers"],
    summary: "Send a transfer to another branch",
    request: {
      body: { required: true, content: { "application/json": { schema: createTransferDTO } } },
    },
    responses: {
      201: {
        description: "Transfer sent",
        content: { "application/json": { schema: z.object({ data: transferDTO }) } },
      },
      ...errors,
    },
  }),
  async (context) => {
    const transfer = await createTransferUseCase(
      context.get("userId"),
      context.req.valid("json"),
      context.get("db"),
      context.get("userRole") === "manager" ? context.get("branchId")! : undefined,
    );
    return context.json({ data: serializeTransfer(transfer) }, 201);
  },
);

transfersRouter.openapi(
  createRoute({
    method: "get",
    path: "/{transferId}",
    operationId: "getTransfersTransferId",
    tags: ["Transfers"],
    summary: "Get a transfer detail",
    request: { params: transferIdParamsDTO },
    responses: {
      200: {
        description: "Transfer detail",
        content: { "application/json": { schema: z.object({ data: transferDTO }) } },
      },
      400: errors[400],
      404: errors[404],
    },
  }),
  async (context) => {
    const transfer = await getTransferUseCase(
      context.req.valid("param").transferId,
      context.get("db"),
    );
    if (!transfer)
      return context.json(
        { error: { code: "TRANSFER_NOT_FOUND", message: "Transfer not found" } },
        404,
      );
    const branchScopeId = context.get("userRole") === "manager" ? context.get("branchId") : null;
    if (
      branchScopeId &&
      transfer.fromBranch.id !== branchScopeId &&
      transfer.toBranch.id !== branchScopeId
    ) {
      return context.json(
        { error: { code: "BRANCH_ACCESS_DENIED", message: "Transfer not found" } },
        404,
      );
    }
    return context.json({ data: serializeTransfer(transfer) }, 200);
  },
);

transfersRouter.openapi(
  createRoute({
    method: "post",
    path: "/{transferId}/accept",
    operationId: "postTransfersTransferIdAccept",
    tags: ["Transfers"],
    summary: "Accept a transfer at the destination branch",
    request: {
      params: transferIdParamsDTO,
      body: { required: true, content: { "application/json": { schema: acceptTransferDTO } } },
    },
    responses: {
      200: {
        description: "Transfer accepted",
        content: { "application/json": { schema: z.object({ data: transferDTO }) } },
      },
      ...errors,
    },
  }),
  async (context) => {
    const transfer = await acceptTransferUseCase(
      context.req.valid("param").transferId,
      context.get("userId"),
      context.req.valid("json"),
      context.get("db"),
      context.get("userRole") === "manager" ? context.get("branchId")! : undefined,
    );
    return context.json({ data: serializeTransfer(transfer) }, 200);
  },
);

transfersRouter.openapi(
  createRoute({
    method: "post",
    path: "/{transferId}/cancel",
    operationId: "postTransfersTransferIdCancel",
    tags: ["Transfers"],
    summary: "Cancel a pending transfer and return its stock to the origin branch",
    request: { params: transferIdParamsDTO },
    responses: {
      200: {
        description: "Transfer cancelled",
        content: { "application/json": { schema: z.object({ data: transferDTO }) } },
      },
      ...errors,
    },
  }),
  async (context) => {
    const transfer = await cancelTransferUseCase(
      context.req.valid("param").transferId,
      context.get("userId"),
      context.get("db"),
      context.get("userRole") === "manager" ? context.get("branchId")! : undefined,
    );
    return context.json({ data: serializeTransfer(transfer) }, 200);
  },
);

function serializeTransfer(transfer: Awaited<ReturnType<typeof getTransferUseCase>>) {
  return {
    ...transfer!,
    sentAt: transfer!.sentAt.toISOString(),
    acceptedAt: transfer!.acceptedAt?.toISOString() ?? null,
    createdAt: transfer!.createdAt.toISOString(),
  };
}
