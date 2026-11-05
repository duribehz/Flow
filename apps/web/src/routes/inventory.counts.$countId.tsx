import { createFileRoute } from "@tanstack/react-router";

import { CountDetailPage } from "@/features/inventory/count-detail-page";

export const Route = createFileRoute("/inventory/counts/$countId")({
  component: CountDetailPage,
});
