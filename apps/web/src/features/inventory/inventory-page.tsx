import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, Loader2, RefreshCw } from "lucide-react";

import { useGetBranches } from "@/api/generated/branches/branches";
import {
  useGetInventoryCounts,
  useGetInventoryDays,
  usePostInventoryCounts,
  usePostInventoryDays,
} from "@/api/generated/inventory/inventory";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate, formatDateTime, todayIsoDate } from "@/lib/operational-format";

export function InventoryPage() {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState("");
  const [businessDate, setBusinessDate] = useState(todayIsoDate());
  const [actionError, setActionError] = useState<string>();
  const branchesQuery = useGetBranches<ApiError>();
  const daysQuery = useGetInventoryDays<ApiError>(branchId ? { branchId } : undefined);
  const countsQuery = useGetInventoryCounts<ApiError>(branchId ? { branchId } : undefined);
  const openDay = usePostInventoryDays<ApiError>();
  const createCount = usePostInventoryCounts<ApiError>();

  const branches = branchesQuery.data?.data.data ?? [];
  const days = daysQuery.data?.status === 200 ? daysQuery.data.data.data : [];
  const counts = countsQuery.data?.status === 200 ? countsQuery.data.data.data : [];
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
  const countsByDay = new Map(counts.map((count) => [count.inventoryDayId, count]));
  const isLoading = branchesQuery.isLoading || daysQuery.isLoading || countsQuery.isLoading;
  const loadError = branchesQuery.error ?? daysQuery.error ?? countsQuery.error;
  const isStarting = openDay.isMutating || createCount.isMutating;
  async function handleStart() {
    if (!branchId || !businessDate) return;
    setActionError(undefined);

    try {
      const dayResponse = await openDay.trigger({ branchId, businessDate });
      if (dayResponse.status !== 200 && dayResponse.status !== 201) return;

      const day = dayResponse.data.data;
      const refreshedCounts = await countsQuery.mutate();
      let count =
        refreshedCounts?.status === 200
          ? refreshedCounts.data.data.find((candidate) => candidate.inventoryDayId === day.id)
          : undefined;
      if (!count) {
        const countResponse = await createCount.trigger({ inventoryDayId: day.id });
        if (countResponse.status !== 201) return;
        count = countResponse.data.data;
      }

      await Promise.all([daysQuery.mutate(), countsQuery.mutate()]);
      void navigate({ to: "/inventory/counts/$countId", params: { countId: count.id } });
    } catch (error) {
      setActionError(
        getApiErrorMessage(
          error,
          {
            INVENTORY_DAY_CLOSED: "El día operativo ya está cerrado.",
            INVENTORY_COUNT_EXISTS: "Ya existen existencias para este día.",
          },
          "No pudimos preparar las existencias. Inténtalo de nuevo.",
        ),
      );
    }
  }

  function openCount(countId: string) {
    void navigate({ to: "/inventory/counts/$countId", params: { countId } });
  }

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Operación diaria"
        title="Existencias"
        description="Abre el día de una sucursal y continúa sus existencias desde cualquier dispositivo."
        actions={
          <Button variant="outline" onClick={() => void navigate({ to: "/inventory/review" })}>
            Bandeja de almacén
          </Button>
        }
      />

      <section aria-labelledby="start-count" className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="mb-5">
          <h2 id="start-count" className="text-lg font-semibold">
            Existencias del día
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Si el día o sus existencias ya existen, se abrirán sin crear duplicados.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(190px,0.55fr)_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-medium">
            Sucursal
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.currentTarget.value)}
              disabled={branchesQuery.isLoading}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Fecha operativa
            <Input
              type="date"
              value={businessDate}
              onChange={(event) => setBusinessDate(event.currentTarget.value)}
              className="h-10"
            />
          </label>
          <Button
            size="lg"
            className="h-10"
            disabled={!branchId || !businessDate || isStarting}
            onClick={() => void handleStart()}
          >
            {isStarting ? <Loader2 className="animate-spin" /> : <ClipboardList />}
            {isStarting ? "Preparando..." : "Abrir o continuar"}
          </Button>
        </div>
        {actionError && (
          <p role="alert" className="mt-4 text-sm font-medium text-destructive">
            {actionError}
          </p>
        )}
      </section>

      <section aria-labelledby="days-title" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="days-title" className="text-lg font-semibold">
              Días y existencias
            </h2>
            <p className="text-sm text-muted-foreground">
              {branchId
                ? "Historial de la sucursal seleccionada."
                : "Actividad de todas las sucursales."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => void Promise.all([daysQuery.mutate(), countsQuery.mutate()])}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} /> Actualizar
          </Button>
        </div>
        <Card className="gap-0 py-0 shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Sucursal</TableHead>
                  <TableHead className="hidden sm:table-cell">Día</TableHead>
                  <TableHead>Existencias</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 animate-spin" /> Cargando actividad...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && loadError && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <p className="font-medium">No pudimos cargar las existencias</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getApiErrorMessage(
                          loadError,
                          {},
                          "Verifica tu conexión e inténtalo de nuevo.",
                        )}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !loadError && days.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-44 text-center text-muted-foreground">
                      <CalendarDays className="mx-auto mb-3 size-7" />
                      No hay días operativos para mostrar.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  !loadError &&
                  days.map((day) => {
                    const count = countsByDay.get(day.id);
                    return (
                      <TableRow key={day.id}>
                        <TableCell className="font-medium">
                          {formatDate(day.businessDate)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {branchNames.get(day.branchId) ?? "Sucursal no disponible"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <StatusBadge status={day.status} />
                        </TableCell>
                        <TableCell>
                          {count ? (
                            <StatusBadge status={count.status} />
                          ) : (
                            <span className="text-muted-foreground">Sin existencias</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {count ? (
                            <Button variant="default" size="sm" onClick={() => openCount(count.id)}>
                              {count.status === "draft" ? "Continuar" : "Ver detalle"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Abierto {formatDateTime(day.openedAt)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>
    </PageFrame>
  );
}
