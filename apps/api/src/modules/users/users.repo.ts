import { asc, eq } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import type { CreateUserInput, UserRole } from "./users.dto.js";
import { branches } from "../branches/branches.schema.js";
import { users } from "./users.schema.js";

export class UsersRepo {
  constructor(private readonly conn: Executor) {}

  findByUserName(userName: string) {
    return this.conn.query.users.findFirst({ where: eq(users.userName, userName) });
  }

  async getCurrentUser(userId: string) {
    const [user] = await this.conn
      .select({
        id: users.id,
        userName: users.userName,
        role: users.role,
        branch: { id: branches.id, name: branches.name },
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .where(eq(users.id, userId));
    return user;
  }

  async listUsers() {
    return this.conn
      .select({
        id: users.id,
        userName: users.userName,
        role: users.role,
        branch: { id: branches.id, name: branches.name },
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(branches, eq(users.branchId, branches.id))
      .orderBy(asc(users.userName));
  }

  async createUser(input: CreateUserInput, passwordHash: string) {
    const [user] = await this.conn
      .insert(users)
      .values({
        userName: input.userName,
        passwordHash,
        role: input.role,
        branchId: input.role === "manager" ? (input.branchId ?? null) : null,
      })
      .onConflictDoNothing({ target: users.userName })
      .returning({ id: users.id });
    return user ? this.getCurrentUser(user.id) : undefined;
  }

  findById(userId: string) {
    return this.conn.query.users.findFirst({ where: eq(users.id, userId) });
  }

  async updateUser(
    userId: string,
    fields: {
      userName?: string;
      passwordHash?: string;
      role?: UserRole;
      branchId?: string | null;
      active?: boolean;
    },
  ) {
    const [updated] = await this.conn
      .update(users)
      .set(fields)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    return updated ? this.getCurrentUser(updated.id) : undefined;
  }

  updatePasswordHash(userId: string, passwordHash: string) {
    return this.conn.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async branchExists(branchId: string) {
    const [branch] = await this.conn
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, branchId));
    return Boolean(branch);
  }
}

export type SafeUser = NonNullable<Awaited<ReturnType<UsersRepo["getCurrentUser"]>>>;
export type AuthUser = {
  id: string;
  userName: string;
  role: UserRole;
  branchId: string | null;
  active: boolean;
  createdAt: Date;
  passwordHash: string;
};
