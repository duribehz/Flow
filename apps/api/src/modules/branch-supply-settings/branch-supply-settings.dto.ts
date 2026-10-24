import { z } from "@hono/zod-openapi";

export const branchSupplySettingModeValues = ["fixed", "on_demand"] as const;

const quantityDTO = z.number().int().safe().nonnegative();

export const branchSupplySettingsParamsDTO = z.object({
  branchId: z.uuid().openapi({ param: { name: "branchId", in: "path" } }),
});

export const branchSupplySettingParamsDTO = branchSupplySettingsParamsDTO.extend({
  supplyId: z.uuid().openapi({ param: { name: "supplyId", in: "path" } }),
});

export const weeklyTargetDTO = z.object({
  weekday: z.number().int().min(1).max(7),
  targetQuantity: quantityDTO,
});

export const upsertBranchSupplySettingDTO = z
  .object({
    mode: z.enum(branchSupplySettingModeValues),
    defaultUsagePurposeId: z.uuid(),
    active: z.boolean(),
    weeklyTargets: z.array(weeklyTargetDTO),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.weeklyTargets.map((target) => target.weekday)).size !==
      value.weeklyTargets.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Weekdays must be unique",
        path: ["weeklyTargets"],
      });
    }

    if (value.mode === "fixed" && value.weeklyTargets.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed settings require at least one weekly target",
        path: ["weeklyTargets"],
      });
    }

    if (value.mode === "on_demand" && value.weeklyTargets.length !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "On-demand settings cannot have weekly targets",
        path: ["weeklyTargets"],
      });
    }
  })
  .openapi("UpsertBranchSupplySetting");

export const branchSupplySettingDTO = z
  .object({
    id: z.uuid(),
    branchId: z.uuid(),
    supplyId: z.uuid(),
    mode: z.enum(branchSupplySettingModeValues),
    defaultUsagePurposeId: z.uuid(),
    active: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    weeklyTargets: z.array(weeklyTargetDTO),
  })
  .openapi("BranchSupplySetting");

export type UpsertBranchSupplySettingInput = z.infer<typeof upsertBranchSupplySettingDTO>;
