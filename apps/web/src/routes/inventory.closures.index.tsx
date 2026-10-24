import { createFileRoute } from "@tanstack/react-router";

import { ClosuresPage } from "@/features/inventory/closures/closures-page";

export const Route = createFileRoute("/inventory/closures/")({
  component: ClosuresPage,
});
