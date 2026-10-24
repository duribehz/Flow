import { z } from "@hono/zod-openapi";

const nameSchema = z.string().trim().min(1).max(100);
const descriptionSchema = z.string().trim().min(1).max(500).nullable();

export const listUsagePurposesQuerySchema = z.object({
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const usagePurposeIdParamsSchema = z.object({
  usagePurposeId: z.uuid().openapi({ param: { name: "usagePurposeId", in: "path" } }),
});

export const createUsagePurposeSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema.optional(),
    active: z.boolean().default(true),
  })
  .openapi("CreateUsagePurpose");

export const editUsagePurposeSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.description !== undefined || value.active !== undefined,
    { message: "At least one field is required" },
  )
  .openapi("EditUsagePurpose");

export const usagePurposeSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    active: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .openapi("UsagePurpose");

export type ListUsagePurposesQuery = z.infer<typeof listUsagePurposesQuerySchema>;
export type CreateUsagePurposeInput = z.infer<typeof createUsagePurposeSchema>;
export type EditUsagePurposeInput = z.infer<typeof editUsagePurposeSchema>;
