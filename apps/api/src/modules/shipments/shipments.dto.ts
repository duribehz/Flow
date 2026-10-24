import { z } from "@hono/zod-openapi";

export const shipmentStatusValues = ["preparing", "dispatched", "delivered", "cancelled"] as const;

export const shipmentIdParamsDTO = z.object({
  shipmentId: z.uuid().openapi({ param: { name: "shipmentId", in: "path" } }),
});

export const createShipmentDTO = z
  .object({ replenishmentRequestId: z.uuid() })
  .openapi("CreateShipment");

export const shipmentItemDTO = z
  .object({
    id: z.uuid(),
    replenishmentRequestItemId: z.uuid(),
    supply: z.object({ id: z.uuid(), sku: z.string(), name: z.string() }),
    usagePurposeId: z.uuid(),
    usagePurposeName: z.string(),
    plannedQuantity: z.number().int().safe().positive(),
    shippedQuantity: z.number().int().safe().nonnegative(),
    createdAt: z.iso.datetime(),
  })
  .openapi("ShipmentItem");

export const shipmentDTO = z
  .object({
    id: z.uuid(),
    shipmentNumber: z.string(),
    branch: z.object({ id: z.uuid(), name: z.string() }),
    replenishmentRequestId: z.uuid(),
    status: z.enum(shipmentStatusValues),
    preparedBy: z.object({ id: z.uuid(), userName: z.string() }),
    dispatchedBy: z.object({ id: z.uuid(), userName: z.string() }).nullable(),
    preparedAt: z.iso.datetime(),
    dispatchedAt: z.iso.datetime().nullable(),
    notes: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    items: z.array(shipmentItemDTO),
  })
  .openapi("Shipment");

export type CreateShipmentInput = z.infer<typeof createShipmentDTO>;
