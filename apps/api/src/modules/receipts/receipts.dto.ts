import { z } from "@hono/zod-openapi";
import { moneyCentsSchema, storedQuantitySchema } from "@/shared/domain/quantities.js";

export const receiptStatusValues = ["pending", "in_progress", "completed", "cancelled"] as const;
export const receiptConditionValues = [
  "good",
  "damaged",
  "expired",
  "incorrect",
  "not_arrived",
] as const;

export const receiptIdParamsDTO = z.object({
  receiptId: z.uuid().openapi({ param: { name: "receiptId", in: "path" } }),
});

export const receiptItemParamsDTO = receiptIdParamsDTO.extend({
  itemId: z.uuid().openapi({ param: { name: "itemId", in: "path" } }),
});

export const createReceiptDTO = z
  .object({
    businessDate: z.iso.date(),
    notes: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .openapi("CreateReceipt");

export const updateReceiptNotesDTO = z
  .object({ notes: z.string().trim().min(1).max(2000).nullable() })
  .openapi("UpdateReceiptNotes");

export const updateReceiptItemDTO = z
  .object({
    receivedQuantity: storedQuantitySchema,
    condition: z.enum(receiptConditionValues),
  })
  .refine((item) => item.condition !== "not_arrived" || item.receivedQuantity === 0, {
    message: "Items that did not arrive must have zero received quantity",
    path: ["receivedQuantity"],
  })
  .openapi("UpdateReceiptItem");

export const receiptItemDTO = z
  .object({
    id: z.uuid(),
    shipmentItemId: z.uuid(),
    replenishmentRequestItemId: z.uuid(),
    supply: z.object({ id: z.uuid(), sku: z.string(), name: z.string() }),
    usagePurposeId: z.uuid(),
    usagePurposeName: z.string(),
    expectedQuantity: storedQuantitySchema,
    receivedQuantity: storedQuantitySchema,
    unitPriceAtReceipt: moneyCentsSchema,
    receivedAmount: moneyCentsSchema,
    condition: z.enum(receiptConditionValues),
    checkedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .openapi("ReceiptItem");

export const receiptDTO = z
  .object({
    id: z.uuid(),
    receiptNumber: z.string(),
    shipmentId: z.uuid(),
    inventoryDayId: z.uuid(),
    businessDate: z.iso.date(),
    branch: z.object({ id: z.uuid(), name: z.string() }),
    status: z.enum(receiptStatusValues),
    receivedBy: z.object({ id: z.uuid(), userName: z.string() }).nullable(),
    startedAt: z.iso.datetime().nullable(),
    completedAt: z.iso.datetime().nullable(),
    notes: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    items: z.array(receiptItemDTO),
  })
  .openapi("Receipt");

export const receiptListQueryDTO = z.object({
  status: z.enum(receiptStatusValues).optional(),
  branchId: z.uuid().optional(),
});

export type CreateReceiptInput = z.infer<typeof createReceiptDTO>;
export type UpdateReceiptItemInput = z.infer<typeof updateReceiptItemDTO>;
