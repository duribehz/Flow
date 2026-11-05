import { z } from "@hono/zod-openapi";
import { storedQuantitySchema } from "@/shared/domain/quantities.js";

export const shipmentStatusValues = ["dispatched", "delivered", "cancelled"] as const;

export const shipmentIdParamsDTO = z.object({
  shipmentId: z.uuid().openapi({ param: { name: "shipmentId", in: "path" } }),
});

export const shipmentItemDTO = z
  .object({
    id: z.uuid(),
    replenishmentRequestItemId: z.uuid(),
    supply: z.object({ id: z.uuid(), sku: z.string(), name: z.string() }),
    usagePurposeId: z.uuid(),
    usagePurposeName: z.string(),
    plannedQuantity: storedQuantitySchema.refine((value) => value > 0),
    shippedQuantity: storedQuantitySchema,
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
