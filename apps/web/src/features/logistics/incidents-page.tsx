import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";

import { useGetIncidents } from "@/api/generated/incidents/incidents";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Número</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                <TableHead className="hidden sm:table-cell">Reportada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Abrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow
                  key={incident.id}
                  className="cursor-pointer"
                  onClick={() =>
                    void navigate({
                      to: "/incidents/$incidentId",
                      params: { incidentId: incident.id },
                    })
                  }
                >
                  <TableCell className="font-mono font-semibold">
                    {incident.incidentNumber}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-700" />
                      {incidentTypeLabels[incident.type]}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-xs md:table-cell">
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {incident.description}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {formatDateTime(incident.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={incident.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ArrowRight className="ml-auto size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageFrame>
  );
}
