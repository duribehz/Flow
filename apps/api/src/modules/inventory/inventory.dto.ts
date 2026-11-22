import { z } from "@hono/zod-openapi";
import { storedQuantitySchema } from "@/shared/domain/quantities.js";

export const inventoryDayStatusValues = ["open", "closed"] as const;
export const inventoryCountStatusValues = ["draft", "submitted", "reviewed"] as const;

const notesSchema = z.string().trim().min(1).max(1000);
const dateTimeSchema = z.iso.datetime();

export const inventoryDayIdParamsDTO = z.object({
  dayId: z.uuid().openapi({ param: { name: "dayId", in: "path" } }),
});

export const createInventoryDayDTO = z
  .object({
    branchId: z.uuid(),
    businessDate: z.iso.date(),
    notes: notesSchema.nullable().optional(),
  })
  .openapi("CreateInventoryDay");

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
    inventoryDayId: z.uuid(),
    notes: notesSchema.nullable().optional(),
  })
  .openapi("CreateInventoryCount");

export const updateInventoryCountItemDTO = z.object({
  supplyId: z.uuid(),
  closingQuantity: storedQuantitySchema.nullable(),
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
    openingQuantity: storedQuantitySchema.nullable(),
    receivedQuantity: storedQuantitySchema.nullable(),
    closingQuantity: storedQuantitySchema.nullable(),
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

export const inventorySupplyDTO = z
  .object({
    id: z.uuid(),
    sku: z.string(),
    name: z.string(),
    active: z.boolean(),
    category: z.object({ name: z.string() }),
    unit: z.object({ symbol: z.string() }),
  })
  .openapi("InventorySupply");

export const inventoryLastReportsQueryDTO = z.object({ branchId: z.uuid() });

export const inventoryLastReportDTO = z
  .object({
    supplyId: z.uuid(),
    closingQuantity: z.number().int().nullable(),
    businessDate: z.string(),
    reportedAt: z.iso.datetime().nullable(),
    movementsSince: z.number().int(),
    currentQuantity: z.number().int().nullable(),
  })
  .openapi("InventoryLastReport");

export type CreateInventoryDayInput = z.infer<typeof createInventoryDayDTO>;
export type CreateInventoryCountInput = z.infer<typeof createInventoryCountDTO>;
export type UpdateInventoryCountInput = z.infer<typeof updateInventoryCountDTO>;
