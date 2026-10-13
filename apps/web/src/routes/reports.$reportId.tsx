import { createFileRoute } from "@tanstack/react-router";

import { ReportDetailPage } from "@/features/reports/report-detail-page";

export const Route = createFileRoute("/reports/$reportId")({
  component: ReportDetailPage,
});
