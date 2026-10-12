import { createFileRoute } from "@tanstack/react-router";

import { ReportDetailPage } from "@/features/reports/report-detail-page";

export const Route = createFileRoute("/reportes/$reporteId")({
  component: ReportDetailPage,
});
