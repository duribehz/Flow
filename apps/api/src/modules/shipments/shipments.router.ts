import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { errorSchema } from "@/shared/infrastructure/http/contracts.js";
import type { State } from "@/shared/infrastructure/http/state.js";
import {
  createShipmentDTO,
  shipmentDTO,
  shipmentIdParamsDTO,
  shipmentStatusValues,
} from "./shipments.dto.js";
import { createShipmentUseCase } from "./use-cases/create-shipment.usecase.js";
import { dispatchShipmentUseCase } from "./use-cases/dispatch-shipment.usecase.js";
import { getShipmentUseCase } from "./use-cases/get-shipment.usecase.js";
import { listShipmentsUseCase } from "./use-cases/list-shipments.usecase.js";

export const shipmentsRouter = new OpenAPIHono<State>({
  defaultHook: (result, context) => {
    if (!result.success) {
      return context.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, 400);
    }
  },
});

const errors = {
  400: { description: "Invalid request", content: { "application/json": { schema: errorSchema } } },
  404: {
    description: "Shipment or request not found",
    content: { "application/json": { schema: errorSchema } },
  },
  409: {
    description: "Request or shipment state conflict",
    content: { "application/json": { schema: errorSchema } },
  },
} as const;

const shipmentListQueryDTO = z.object({ status: z.enum(shipmentStatusValues).optional() });

shipmentsRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    operationId: "getShipments",
    tags: ["Shipments"],
    summary: "List shipments",
    request: { query: shipmentListQueryDTO },
    responses: {
      200: {
        description: "Shipments",
        content: { "application/json": { schema: z.object({ data: z.array(shipmentDTO) }) } },
      },
      400: errors[400],
    },
  }),
  async (context) => {
    const shipments = await listShipmentsUseCase(
      context.req.valid("query").status,
      context.get("db"),
    );
    return context.json({ data: shipments.map(serializeShipment) }, 200);
  },
);

shipmentsRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    operationId: "postShipments",
    tags: ["Shipments"],
    summary: "Create the shipment for a submitted request",
    request: {
      body: { required: true, content: { "application/json": { schema: createShipmentDTO } } },
    },
    responses: {
      201: {
        description: "Shipment created",
        content: { "application/json": { schema: z.object({ data: shipmentDTO }) } },
      },
      400: errors[400],
      404: errors[404],
      409: errors[409],
    },
  }),
  async (context) => {
    const shipment = await createShipmentUseCase(
      context.req.valid("json").replenishmentRequestId,
      context.get("userId"),
      context.get("db"),
    );
    return context.json({ data: serializeShipment(shipment) }, 201);
  },
);

shipmentsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{shipmentId}",
    operationId: "getShipmentsShipmentId",
    tags: ["Shipments"],
    summary: "Get shipment detail",
    request: { params: shipmentIdParamsDTO },
    responses: {
      200: {
        description: "Shipment",
        content: { "application/json": { schema: z.object({ data: shipmentDTO }) } },
      },
      400: errors[400],
      404: errors[404],
    },
  }),
  async (context) => {
    const shipment = await getShipmentUseCase(
      context.req.valid("param").shipmentId,
      context.get("db"),
    );
    return context.json({ data: serializeShipment(shipment) }, 200);
  },
);

shipmentsRouter.openapi(
  createRoute({
    method: "post",
    path: "/{shipmentId}/dispatch",
    operationId: "postShipmentsShipmentIdDispatch",
    tags: ["Shipments"],
    summary: "Dispatch a prepared shipment",
    request: { params: shipmentIdParamsDTO },
    responses: {
      200: {
        description: "Shipment dispatched",
        content: { "application/json": { schema: z.object({ data: shipmentDTO }) } },
      },
      404: errors[404],
      409: errors[409],
    },
  }),
  async (context) => {
    const shipment = await dispatchShipmentUseCase(
      context.req.valid("param").shipmentId,
      context.get("userId"),
      context.get("db"),
    );
    return context.json({ data: serializeShipment(shipment) }, 200);
  },
);

function serializeShipment(shipment: Awaited<ReturnType<typeof getShipmentUseCase>>) {
  return {
    ...shipment,
    preparedAt: shipment.preparedAt.toISOString(),
    dispatchedAt: shipment.dispatchedAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
    updatedAt: shipment.updatedAt.toISOString(),
    items: shipment.items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
  };
}
