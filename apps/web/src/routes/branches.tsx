import { createFileRoute } from "@tanstack/react-router";

import { BranchesPage } from "@/features/branches/branches-page";

export const Route = createFileRoute("/branches")({
  component: BranchesPage,
});
