import { z } from "@hono/zod-openapi";

import { safeUserDTO } from "../users/users.dto.js";

export const loginDTO = z
  .object({
    userName: z.string().trim().min(1).max(100).toLowerCase(),
    password: z.string().min(1).max(200),
  })
  .openapi("Login");

export const authResponseDTO = z.object({ data: safeUserDTO });
export type LoginInput = z.infer<typeof loginDTO>;
