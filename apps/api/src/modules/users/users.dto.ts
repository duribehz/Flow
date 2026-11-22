import { z } from "@hono/zod-openapi";

export const userRoleValues = ["manager", "admin", "super_admin"] as const;
export type UserRole = (typeof userRoleValues)[number];

export const createUserDTO = z
  .object({
    userName: z.string().trim().min(3).max(100).toLowerCase(),
    password: z.string().min(12).max(200),
    role: z.enum(userRoleValues),
    branchId: z.uuid().nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.role === "manager" && !value.branchId) {
      context.addIssue({
        code: "custom",
        path: ["branchId"],
        message: "Managers must be assigned to a branch",
      });
    }
    if (value.role !== "manager" && value.branchId) {
      context.addIssue({
        code: "custom",
        path: ["branchId"],
        message: "Only managers can be assigned to a branch",
      });
    }
  })
  .openapi("CreateUser");

export const updateUserDTO = z
  .object({
    userName: z.string().trim().min(3).max(100).toLowerCase().optional(),
    password: z.string().min(12).max(200).optional(),
    role: z.enum(["admin", "manager"]).optional(),
    branchId: z.uuid().nullable().optional(),
    active: z.boolean().optional(),
  })
  .openapi("UpdateUser");

export type UpdateUserInput = z.infer<typeof updateUserDTO>;

export const safeUserDTO = z
  .object({
    id: z.uuid(),
    userName: z.string(),
    role: z.enum(userRoleValues),
    branch: z.object({ id: z.uuid(), name: z.string() }).nullable(),
    active: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .openapi("User");

export const currentUserDTO = safeUserDTO.openapi("CurrentUser");

export type CreateUserInput = z.infer<typeof createUserDTO>;
