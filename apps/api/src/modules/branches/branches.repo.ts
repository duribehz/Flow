import type { Executor } from "@/shared/infrastructure/database/client";
import { branches } from "./branches.schema";
import type { createBranchType } from "./branches.dto";
import { eq } from "drizzle-orm"

export class BranchesRepo {
  constructor(private readonly conn: Executor) { }

  async createBranch(data: createBranchType) {
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

    return branch!
  }

  async getBranches() {
    const branchesRows = await this.conn
      .select()
      .from(branches)
  }

  async getBranch(branchId: string) {
    const [branch] = await this.conn
      .select()
      .from(branches)
      .where(eq(branches.id, branchId))

    return branch
  }
}
