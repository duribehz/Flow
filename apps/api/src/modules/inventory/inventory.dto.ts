import { z } from "@hono/zod-openapi";

export const inventoryDayStatusValues = ["open", "closed"] as const;
export const inventoryCountStatusValues = ["draft", "submitted", "reviewed"] as const;

const notesSchema = z.string().trim().min(1).max(1000);
const quantitySchema = z.number().int().safe().nonnegative();
const dateTimeSchema = z.iso.datetime();

export const inventoryDayIdParamsDTO = z.object({
  dayId: z.uuid().openapi({ param: { name: "dayId", in: "path" } }),
});

export const inventoryCountIdParamsDTO = z.object({
  countId: z.uuid().openapi({ param: { name: "countId", in: "path" } }),
});

export const listInventoryDaysQueryDTO = z.object({
  branchId: z.uuid().optional(),
  businessDate: z.iso.date().optional(),
  status: z.enum(inventoryDayStatusValues).optional(),
});

export const listInventoryCountsQueryDTO = z.object({
  inventoryDayId: z.uuid().optional(),
  branchId: z.uuid().optional(),
  status: z.enum(inventoryCountStatusValues).optional(),
});

export const createInventoryCountDTO = z
  .object({
    branchId: z.uuid(),
    businessDate: z.iso.date(),
    dayNotes: notesSchema.nullable().optional(),
    notes: notesSchema.nullable().optional(),
  })
  .openapi("CreateInventoryCount");

export const updateInventoryCountItemDTO = z.object({
  supplyId: z.uuid(),
  closingQuantity: quantitySchema.nullable(),
});

export const updateInventoryCountDTO = z
  .object({
    notes: notesSchema.nullable().optional(),
    items: z.array(updateInventoryCountItemDTO).optional(),
  })
  .refine((value) => value.notes !== undefined || value.items !== undefined, {
    message: "At least one field is required",
  })
  .refine(
    (value) =>
      !value.items || new Set(value.items.map((item) => item.supplyId)).size === value.items.length,
    { message: "Each supply may appear only once", path: ["items"] },
  )
  .openapi("UpdateInventoryCount");

export const inventoryDayDTO = z
  .object({
    id: z.uuid(),
    branchId: z.uuid(),
    businessDate: z.iso.date(),
    status: z.enum(inventoryDayStatusValues),
    openedBy: z.uuid(),
    closedBy: z.uuid().nullable(),
    openedAt: dateTimeSchema,
    closedAt: dateTimeSchema.nullable(),
    notes: z.string().nullable(),
    createdAt: dateTimeSchema,
  })
  .openapi("InventoryDay");

export const inventoryCountItemDTO = z
  .object({
    id: z.uuid(),
    inventoryCountId: z.uuid(),
    supplyId: z.uuid(),
    counted: z.boolean(),
    openingQuantity: quantitySchema,
    receivedQuantity: quantitySchema,
    closingQuantity: quantitySchema.nullable(),
    lastCountedAt: dateTimeSchema.nullable(),
    createdAt: dateTimeSchema,
  })
  .openapi("InventoryCountItem");

export const inventoryCountDTO = z
  .object({
    id: z.uuid(),
    inventoryDayId: z.uuid(),
    branchId: z.uuid(),
    status: z.enum(inventoryCountStatusValues),
    notes: z.string().nullable(),
    createdBy: z.uuid(),
    submittedBy: z.uuid().nullable(),
    reviewedBy: z.uuid().nullable(),
    submittedAt: dateTimeSchema.nullable(),
    reviewedAt: dateTimeSchema.nullable(),
    createdAt: dateTimeSchema,
  })
  .openapi("InventoryCount");

export const inventoryCountDetailDTO = inventoryCountDTO
  .extend({ items: z.array(inventoryCountItemDTO) })
  .openapi("InventoryCountDetail");

export type CreateInventoryCountInput = z.infer<typeof createInventoryCountDTO>;
export type UpdateInventoryCountInput = z.infer<typeof updateInventoryCountDTO>;
