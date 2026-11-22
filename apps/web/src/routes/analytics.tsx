import { createFileRoute } from "@tanstack/react-router";

import { ComingSoonPage } from "@/features/layout/coming-soon-page";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <ComingSoonPage
      title="Analítica"
      description="Próximamente podrás consultar indicadores y tendencias de operación."
    />
  );
}
