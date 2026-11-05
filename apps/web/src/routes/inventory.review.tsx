import { createFileRoute } from "@tanstack/react-router";

import { InventoryReviewPage } from "@/features/inventory/review-page";

export const Route = createFileRoute("/inventory/review")({
  component: InventoryReviewPage,
});
