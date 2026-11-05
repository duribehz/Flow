import { createFileRoute } from "@tanstack/react-router";

import { IncidentDetailPage } from "@/features/logistics/incident-detail-page";

export const Route = createFileRoute("/incidents/$incidentId")({
  component: IncidentDetailPage,
});
