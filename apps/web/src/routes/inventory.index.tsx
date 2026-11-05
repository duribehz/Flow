import { createFileRoute } from "@tanstack/react-router";

import { InventoryPage } from "@/features/inventory/inventory-page";

export const Route = createFileRoute("/inventory/")({
  component: InventoryPage,
});
