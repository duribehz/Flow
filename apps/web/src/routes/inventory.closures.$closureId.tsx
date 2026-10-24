import { createFileRoute } from "@tanstack/react-router";

import { ClosureReportPage } from "@/features/inventory/closures/closure-report-page";

export const Route = createFileRoute("/inventory/closures/$closureId")({
  component: ClosureReportPage,
});
