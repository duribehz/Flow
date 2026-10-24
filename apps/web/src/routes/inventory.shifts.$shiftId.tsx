import { createFileRoute } from "@tanstack/react-router";

import { ShiftDetailPage } from "@/features/inventory/shifts/shift-detail-page";

export const Route = createFileRoute("/inventory/shifts/$shiftId")({
  component: ShiftDetailPage,
});
