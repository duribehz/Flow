import { createFileRoute } from "@tanstack/react-router";

import { UsagePurposesPage } from "@/features/usage-purposes/usage-purposes-page";

export const Route = createFileRoute("/usage-purposes")({
  component: UsagePurposesPage,
});
