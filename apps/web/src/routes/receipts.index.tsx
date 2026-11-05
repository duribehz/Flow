import { createFileRoute } from "@tanstack/react-router";

import { ReceiptsPage } from "@/features/logistics/receipts-page";

export const Route = createFileRoute("/receipts/")({
  component: ReceiptsPage,
});
