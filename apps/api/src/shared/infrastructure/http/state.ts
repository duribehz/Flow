import type { Executor } from "../database/client.js";
import type { UserRole } from "@/modules/users/users.dto.js";

export type State = {
  Variables: {
    db: Executor;
    userId: string;
    userName: string;
    userRole: UserRole;
    branchId: string | null;
    sessionId: string;
    sessionTokenHash: string;
  };
};
