import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  createReceiptDTO,
  receiptDTO,
  receiptIdParamsDTO,
  receiptItemParamsDTO,
  receiptListQueryDTO,
  updateReceiptItemDTO,
  updateReceiptNotesDTO,
} from "./receipts.dto.js";
import { completeReceiptUseCase } from "./use-cases/complete-receipt.usecase.js";
import { createReceiptUseCase } from "./use-cases/create-receipt.usecase.js";
import { getReceiptUseCase } from "./use-cases/get-receipt.usecase.js";
import { listReceiptsUseCase } from "./use-cases/list-receipts.usecase.js";
import { updateReceiptItemUseCase } from "./use-cases/update-receipt-item.usecase.js";
import { updateReceiptNotesUseCase } from "./use-cases/update-receipt-notes.usecase.js";

export const receiptsRouter = new OpenAPIHono<State>({
  defaultHook: (result, context) => {
    if (!result.success) {
      return context.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

const errors = {
  400: {
    description: "Invalid receipt data",
    content: { "application/json": { schema: errorSchema } },
  },
  404: {
    description: "Receipt, shipment or item not found",
    content: { "application/json": { schema: errorSchema } },
  },
  409: {
    description: "Receipt, shipment or inventory day state conflict",
    content: { "application/json": { schema: errorSchema } },
  },
} as const;

receiptsRouter.openapi(
  createRoute({
    method: "get",
    path: "/receipts",
    operationId: "getReceipts",
    tags: ["Receipts"],
    summary: "List receipts",
    request: { query: receiptListQueryDTO },
    responses: {
      200: {
        description: "Receipts",
        content: { "application/json": { schema: z.object({ data: z.array(receiptDTO) }) } },
      },
      400: errors[400],
    },
  }),
  async (context) => {
    const receipts = await listReceiptsUseCase(context.req.valid("query"), context.get("db"));
    return context.json({ data: receipts.map(serializeReceipt) }, 200);
  },
);

receiptsRouter.openapi(
  createRoute({
    method: "post",
    path: "/shipments/{shipmentId}/receipts",
    operationId: "postShipmentsShipmentIdReceipts",
    tags: ["Receipts"],
    summary: "Start receiving a dispatched shipment",
    request: {
      params: z.object({
        shipmentId: z.uuid().openapi({ param: { name: "shipmentId", in: "path" } }),
      }),
      body: { required: true, content: { "application/json": { schema: createReceiptDTO } } },
    },
    responses: {
      201: {
        description: "Receipt started",
        content: { "application/json": { schema: z.object({ data: receiptDTO }) } },
      },
      400: errors[400],
      404: errors[404],
      409: errors[409],
    },
  }),
  async (context) => {
    const receipt = await createReceiptUseCase(
      context.req.valid("param").shipmentId,
      context.get("userId"),
      context.req.valid("json"),
      context.get("db"),
    );
    return context.json({ data: serializeReceipt(receipt) }, 201);
  },
);

receiptsRouter.openapi(
  createRoute({
    method: "get",
    path: "/receipts/{receiptId}",
    operationId: "getReceiptsReceiptId",
    tags: ["Receipts"],
    summary: "Get receipt detail",
    request: { params: receiptIdParamsDTO },
    responses: {
      200: {
        description: "Receipt",
        content: { "application/json": { schema: z.object({ data: receiptDTO }) } },
      },
      400: errors[400],
      404: errors[404],
    },
  }),
  async (context) => {
    const receipt = await getReceiptUseCase(
      context.req.valid("param").receiptId,
      context.get("db"),
    );
    return context.json({ data: serializeReceipt(receipt) }, 200);
  },
);

receiptsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/receipts/{receiptId}",
    operationId: "patchReceiptsReceiptId",
    tags: ["Receipts"],
    summary: "Update receipt notes",
    request: {
      params: receiptIdParamsDTO,
      body: { required: true, content: { "application/json": { schema: updateReceiptNotesDTO } } },
    },
    responses: {
      200: {
        description: "Receipt updated",
        content: { "application/json": { schema: z.object({ data: receiptDTO }) } },
      },
      ...errors,
    },
  }),
  async (context) => {
    const receipt = await updateReceiptNotesUseCase(
      context.req.valid("param").receiptId,
      context.req.valid("json").notes,
      context.get("db"),
    );
    return context.json({ data: serializeReceipt(receipt) }, 200);
  },
);

receiptsRouter.openapi(
  createRoute({
    method: "patch",
    path: "/receipts/{receiptId}/items/{itemId}",
    operationId: "patchReceiptsReceiptIdItemsItemId",
    tags: ["Receipts"],
    summary: "Record received, accepted, rejected quantities and condition",
    request: {
      params: receiptItemParamsDTO,
      body: { required: true, content: { "application/json": { schema: updateReceiptItemDTO } } },
    },
    responses: {
      200: {
        description: "Receipt item updated",
        content: { "application/json": { schema: z.object({ data: receiptDTO }) } },
      },
      ...errors,
    },
  }),
  async (context) => {
    const { receiptId, itemId } = context.req.valid("param");
    const receipt = await updateReceiptItemUseCase(
      receiptId,
      itemId,
      context.req.valid("json"),
      context.get("db"),
    );
    return context.json({ data: serializeReceipt(receipt) }, 200);
  },
);

receiptsRouter.openapi(
  createRoute({
    method: "post",
    path: "/receipts/{receiptId}/complete",
    operationId: "postReceiptsReceiptIdComplete",
    tags: ["Receipts"],
    summary: "Complete a receipt and post accepted quantities to inventory",
    request: { params: receiptIdParamsDTO },
    responses: {
      200: {
        description: "Receipt completed",
        content: { "application/json": { schema: z.object({ data: receiptDTO }) } },
      },
      400: errors[400],
      404: errors[404],
      409: errors[409],
    },
  }),
  async (context) => {
    const receipt = await completeReceiptUseCase(
      context.req.valid("param").receiptId,
      context.get("db"),
    );
    return context.json({ data: serializeReceipt(receipt) }, 200);
  },
);

function serializeReceipt(receipt: Awaited<ReturnType<typeof getReceiptUseCase>>) {
  return {
    ...receipt,
    startedAt: receipt.startedAt?.toISOString() ?? null,
    completedAt: receipt.completedAt?.toISOString() ?? null,
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString(),
    items: receipt.items.map((item) => ({
      ...item,
      checkedAt: item.checkedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}
