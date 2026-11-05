import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { useGetIncidents } from "@/api/generated/incidents/incidents";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { formatDateTime } from "@/lib/operational-format";
import { EmptyState, ErrorState, incidentTypeLabels, LoadingState } from "./logistics-ui";

export function IncidentsPage() {
  const navigate = useNavigate();
  const query = useGetIncidents<ApiError>();
  const incidents = query.data?.status === 200 ? query.data.data.data : [];

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Logística"
        title="Incidencias"
        description="Consulta y resuelve diferencias detectadas durante la recepción."
      />
      {query.isLoading && <LoadingState label="Cargando incidencias…" />}
      {!query.isLoading && query.error && (
        <ErrorState error={query.error} onRetry={() => void query.mutate()} />
      )}
      {!query.isLoading && !query.error && incidents.length === 0 && (
        <EmptyState
          title="No hay incidencias"
          description="Los problemas reportados desde una recepción aparecerán aquí."
        />
      )}
      {!query.isLoading && !query.error && incidents.length > 0 && (
        <div className="grid gap-3">
          {incidents.map((incident) => (
            <button
              key={incident.id}
              type="button"
              className="group flex w-full flex-col gap-4 rounded-xl border bg-card p-5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:justify-between"
              onClick={() =>
                void navigate({ to: "/incidents/$incidentId", params: { incidentId: incident.id } })
              }
            >
              <span className="flex min-w-0 items-start gap-4">
                <span className="rounded-lg bg-amber-50 p-2.5 text-amber-700">
                  <AlertTriangle className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {incident.incidentNumber} · {incidentTypeLabels[incident.type]}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                    {incident.description}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Reportada {formatDateTime(incident.createdAt)}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                <StatusBadge status={incident.status} />
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
