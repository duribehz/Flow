import { useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Loader2, RefreshCw } from "lucide-react";

import { useGetBranches } from "@/api/generated/branches/branches";
import {
  useGetInventoryCounts,
  useGetInventoryCountsCountId,
  useGetInventoryDays,
} from "@/api/generated/inventory/inventory";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatDateTime } from "@/lib/operational-format";

export function InventoryReviewPage() {
  const navigate = useNavigate();
  const countsQuery = useGetInventoryCounts<ApiError>({ status: "submitted" });
  const branchesQuery = useGetBranches<ApiError>();
  const daysQuery = useGetInventoryDays<ApiError>();
  const counts = countsQuery.data?.status === 200 ? countsQuery.data.data.data : [];
  const branches = branchesQuery.data?.data.data ?? [];
  const days = daysQuery.data?.status === 200 ? daysQuery.data.data.data : [];
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
  const dayById = new Map(days.map((day) => [day.id, day]));
  const error = countsQuery.error ?? branchesQuery.error ?? daysQuery.error;
  const isLoading = countsQuery.isLoading || branchesQuery.isLoading || daysQuery.isLoading;

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Almacén"
        title="Conteos por revisar"
        description="Conteos enviados por las sucursales, ordenados por la respuesta del servicio."
        actions={
          <Button variant="outline" onClick={() => void navigate({ to: "/inventory" })}>
            Volver a inventario
          </Button>
        }
      />

      <div className="flex justify-end">
        <Button
          variant="ghost"
          disabled={isLoading}
          onClick={() =>
            void Promise.all([countsQuery.mutate(), branchesQuery.mutate(), daysQuery.mutate()])
          }
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} /> Actualizar bandeja
        </Button>
      </div>

      {isLoading && (
        <Card className="min-h-52 items-center justify-center text-muted-foreground">
          <Loader2 className="animate-spin" /> Cargando conteos enviados...
        </Card>
      )}
      {!isLoading && error && (
        <Card className="items-center p-8 text-center">
          <h2 className="text-lg font-semibold">No pudimos cargar la bandeja</h2>
          <p className="text-muted-foreground">
            {getApiErrorMessage(error, {}, "Verifica tu conexión e inténtalo de nuevo.")}
          </p>
        </Card>
      )}
      {!isLoading && !error && counts.length === 0 && (
        <Card className="items-center p-10 text-center">
          <ClipboardCheck className="size-9 text-muted-foreground" />
          <h2 className="text-lg font-semibold">La bandeja está al día</h2>
          <p className="text-muted-foreground">No hay conteos enviados pendientes de revisión.</p>
        </Card>
      )}
      {!isLoading && !error && counts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {counts.map((count) => (
            <ReviewCard
              key={count.id}
              countId={count.id}
              branchName={branchNames.get(count.branchId) ?? "Sucursal no disponible"}
              businessDate={dayById.get(count.inventoryDayId)?.businessDate}
              submittedAt={count.submittedAt}
              onOpen={() =>
                void navigate({ to: "/inventory/counts/$countId", params: { countId: count.id } })
              }
            />
          ))}
        </div>
      )}
    </PageFrame>
  );
}

function ReviewCard({
  countId,
  branchName,
  businessDate,
  submittedAt,
  onOpen,
}: {
  countId: string;
  branchName: string;
  businessDate?: string;
  submittedAt: string | null;
  onOpen: () => void;
}) {
  const detailQuery = useGetInventoryCountsCountId<ApiError>(countId);
  const detail = detailQuery.data?.status === 200 ? detailQuery.data.data.data : undefined;
  const counted = detail?.items.filter((item) => item.counted).length ?? 0;
  const total = detail?.items.length ?? 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{branchName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {businessDate ? formatDate(businessDate) : "Fecha no disponible"}
          </p>
        </div>
        <StatusBadge status="submitted" />
      </div>
      <div className="mt-2 rounded-xl bg-muted/60 p-4">
        {detailQuery.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" /> Calculando progreso...
          </p>
        ) : detailQuery.error ? (
          <p className="text-sm text-destructive">No se pudo cargar el progreso.</p>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span>Progreso enviado</span>
              <strong className="tabular-nums">
                {counted} / {total}
              </strong>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-primary"
                style={{ width: `${total ? Math.round((counted / total) * 100) : 0}%` }}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Enviado {formatDateTime(submittedAt)}</p>
        <Button onClick={onOpen}>Revisar detalle</Button>
      </div>
    </Card>
  );
}
