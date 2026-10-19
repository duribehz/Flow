import { eq } from "drizzle-orm";

import type { Executor } from "@/shared/infrastructure/database/client.js";
import { branches } from "./branches.schema.js";
import type { createBranchType } from "./branches.dto.js";

export type CreateBranchInput = createBranchType;

export class BranchesRepo {
  constructor(private readonly conn: Executor) {}

  async createBranch(data: CreateBranchInput) {
    const [branch] = await this.conn
      .insert(branches)
      .values(data)
      .onConflictDoUpdate({
        target: branches.name,
        set: {
          name: data.name,
        },
      })
      .returning();

    return branch!;
  }

  async getBranches() {
    const branchesRows = await this.conn.select().from(branches);

    return branchesRows;
  }

  async getBranch(branchId: string) {
    const [branch] = await this.conn.select().from(branches).where(eq(branches.id, branchId));

    return branch;
  }
}
