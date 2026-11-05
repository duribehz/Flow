import { createFileRoute } from "@tanstack/react-router";

import { IncidentsPage } from "@/features/logistics/incidents-page";

export const Route = createFileRoute("/incidents/")({
  component: IncidentsPage,
});
