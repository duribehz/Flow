import { z } from "@hono/zod-openapi";

import { storedQuantitySchema } from "@/shared/domain/quantities.js";

export const transferStatusValues = ["pending", "accepted", "cancelled"] as const;
export const transferDirectionValues = ["sent", "received"] as const;

export const transferIdParamsDTO = z.object({
  transferId: z.uuid().openapi({ param: { name: "transferId", in: "path" } }),
});

export const createTransferItemDTO = z.object({
  supplyId: z.uuid(),
  quantity: storedQuantitySchema.positive(),
});

export const createTransferDTO = z
  .object({
    fromBranchId: z.uuid().optional(),
    toBranchId: z.uuid(),
    businessDate: z.iso.date(),
    items: z.array(createTransferItemDTO).min(1),
  })
  .refine((input) => !input.fromBranchId || input.fromBranchId !== input.toBranchId, {
    message: "A transfer must go to a different branch",
    path: ["toBranchId"],
  })
  .refine(
    (input) => new Set(input.items.map((item) => item.supplyId)).size === input.items.length,
    {
      message: "Each item may appear only once in a transfer",
      path: ["items"],
    },
  )
  .openapi("CreateTransfer");

export const acceptTransferDTO = z.object({ businessDate: z.iso.date() }).openapi("AcceptTransfer");

export const listTransfersQueryDTO = z.object({
  direction: z.enum(transferDirectionValues).optional(),
  status: z.enum(transferStatusValues).optional(),
});

export const transferDTO = z
  .object({
    id: z.uuid(),
    transferNumber: z.string(),
    fromBranch: z.object({ id: z.uuid(), name: z.string() }),
    toBranch: z.object({ id: z.uuid(), name: z.string() }),
    sentBusinessDate: z.iso.date(),
    status: z.enum(transferStatusValues),
    sentBy: z.object({ id: z.uuid(), userName: z.string() }),
    acceptedBy: z.object({ id: z.uuid(), userName: z.string() }).nullable(),
    acceptedInventoryDayId: z.uuid().nullable(),
    sentAt: z.iso.datetime(),
    acceptedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    items: z.array(
      z.object({
        id: z.uuid(),
        supply: z.object({
          id: z.uuid(),
          sku: z.string(),
          name: z.string(),
          unit: z.object({ symbol: z.string() }),
        }),
        quantity: storedQuantitySchema,
      }),
    ),
  })
  .openapi("Transfer");

export const transferBranchOptionDTO = z
  .object({ id: z.uuid(), name: z.string() })
  .openapi("TransferBranchOption");

export type CreateTransferInput = z.infer<typeof createTransferDTO>;
export type AcceptTransferInput = z.infer<typeof acceptTransferDTO>;
export type ListTransfersFilters = z.infer<typeof listTransfersQueryDTO>;
