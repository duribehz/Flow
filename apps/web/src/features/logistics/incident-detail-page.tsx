import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import type { UpdateIncidentStatus } from "@/api/generated/models";
import {
  useGetIncidentsIncidentId,
  usePatchIncidentsIncidentId,
} from "@/api/generated/incidents/incidents";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/operational-format";
import {
  ErrorState,
  fieldClassName,
  getErrorMessage,
  incidentStatusLabels,
  incidentTypeLabels,
  InlineMessage,
  LoadingState,
} from "./logistics-ui";

export function IncidentDetailPage() {
  const { incidentId } = useParams({ from: "/incidents/$incidentId" });
  const navigate = useNavigate();
  const query = useGetIncidentsIncidentId<ApiError>(incidentId);
  const update = usePatchIncidentsIncidentId<ApiError>(incidentId);
  const incident = query.data?.status === 200 ? query.data.data.data : undefined;
  const [status, setStatus] = useState<UpdateIncidentStatus>("open");
  const [resolution, setResolution] = useState("");
  const [feedback, setFeedback] = useState<string>();

  useEffect(() => {
    if (!incident) return;
    setStatus(incident.status);
    setResolution(incident.resolution ?? "");
  }, [incident]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if ((status === "resolved" || status === "closed") && !resolution.trim()) {
      setFeedback("Escribe una resolución antes de resolver o cerrar la incidencia.");
      return;
    }
    setFeedback(undefined);
    try {
      await update.trigger({ status, resolution: resolution.trim() || null });
      await query.mutate();
      setFeedback("Incidencia actualizada.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  }

  return (
    <PageFrame>
      <Button variant="ghost" className="w-fit" onClick={() => void navigate({ to: "/incidents" })}>
        <ArrowLeft /> Volver a incidencias
      </Button>
      {query.isLoading && <LoadingState label="Cargando incidencia…" />}
      {!query.isLoading && query.error && (
        <ErrorState
          error={query.error}
          title="No pudimos cargar la incidencia"
          onRetry={() => void query.mutate()}
        />
      )}
      {!query.isLoading && !query.error && incident && (
        <>
          <PageHeader
            eyebrow={incident.incidentNumber}
            title={incidentTypeLabels[incident.type]}
            description={`Reportada ${formatDateTime(incident.createdAt)}`}
            actions={<StatusBadge status={incident.status} />}
          />
          {feedback &&
            (feedback === "Incidencia actualizada." ? (
              <p role="status" className="text-sm text-emerald-700">
                {feedback}
              </p>
            ) : (
              <InlineMessage>{feedback}</InlineMessage>
            ))}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Descripción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="whitespace-pre-wrap text-sm leading-6">{incident.description}</p>
                <dl className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Recepción
                    </dt>
                    <dd className="mt-1 font-mono text-xs">{incident.receiptId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Alcance
                    </dt>
                    <dd className="mt-1 text-sm">
                      {incident.receiptItemId ? "Artículo de la recepción" : "Recepción completa"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Reportó
                    </dt>
                    <dd className="mt-1 text-sm">{incident.reportedBy.userName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Resuelta
                    </dt>
                    <dd className="mt-1 text-sm">{formatDateTime(incident.resolvedAt)}</dd>
                  </div>
                </dl>
                <Button
                  variant="outline"
                  onClick={() =>
                    void navigate({
                      to: "/receipts/$receiptId",
                      params: { receiptId: incident.receiptId },
                    })
                  }
                >
                  Abrir recepción
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Seguimiento</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Actualiza el estado y documenta la solución.
                </p>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSave}>
                  <label className="block text-sm font-medium">
                    Estado
                    <select
                      className={`${fieldClassName} mt-2`}
                      value={status}
                      onChange={(event) => setStatus(event.target.value as UpdateIncidentStatus)}
                    >
                      {Object.entries(incidentStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Resolución
                    <textarea
                      className={`${fieldClassName} mt-2 min-h-36 resize-y`}
                      maxLength={4000}
                      value={resolution}
                      onChange={(event) => setResolution(event.target.value)}
                      placeholder="Acciones tomadas y resultado"
                    />
                  </label>
                  <Button type="submit" disabled={update.isMutating}>
                    {update.isMutating ? <Loader2 className="animate-spin" /> : <Save />} Guardar
                    cambios
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageFrame>
  );
}
