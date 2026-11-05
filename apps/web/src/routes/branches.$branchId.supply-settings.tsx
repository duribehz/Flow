import { createFileRoute } from "@tanstack/react-router";

import { BranchSupplySettingsPage } from "@/features/branches/branch-supply-settings-page";

export const Route = createFileRoute("/branches/$branchId/supply-settings")({
  component: BranchSupplySettingsPage,
});
