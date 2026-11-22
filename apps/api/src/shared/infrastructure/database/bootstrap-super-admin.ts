import { and, eq } from "drizzle-orm";

import { AppError } from "@/shared/errors/app-error.js";
import { DB, pool } from "./client.js";
import { users } from "../../../modules/users/users.schema.js";

const userName = process.env.INITIAL_SUPER_ADMIN_USERNAME?.trim().toLowerCase();
const password = process.env.INITIAL_SUPER_ADMIN_PASSWORD;

if (
  !userName ||
  userName.length < 3 ||
  userName.length > 100 ||
  !password ||
  password.length < 12 ||
  password.length > 200
) {
  throw new Error(
    "Set a 3-100 character INITIAL_SUPER_ADMIN_USERNAME and a 12-200 character INITIAL_SUPER_ADMIN_PASSWORD",
  );
}

try {
  const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
  await DB.transaction(async (tx) => {
    const [existingSuperAdmin] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "super_admin"), eq(users.active, true)));
    if (existingSuperAdmin) {
      throw new AppError(409, "SUPER_ADMIN_ALREADY_EXISTS", "An active super admin already exists");
    }

    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.userName, userName));
    if (existingUser) {
      await tx
        .update(users)
        .set({ passwordHash, role: "super_admin", branchId: null, active: true })
        .where(eq(users.id, existingUser.id));
      return;
    }

    await tx.insert(users).values({
      userName,
      passwordHash,
      role: "super_admin",
      branchId: null,
      active: true,
    });
  });
  console.log(`Bootstrapped super admin ${userName}`);
} finally {
  await pool.end();
}
