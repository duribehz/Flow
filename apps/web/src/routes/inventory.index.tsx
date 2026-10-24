import { createFileRoute } from "@tanstack/react-router";

import { InventoryShiftsPage } from "@/features/inventory/shifts/shifts-page";

export const Route = createFileRoute("/inventory/")({
  component: InventoryShiftsPage,
});
