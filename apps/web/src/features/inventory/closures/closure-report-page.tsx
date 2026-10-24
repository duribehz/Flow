import { useParams } from "@tanstack/react-router";
import {
  Boxes,
  ClipboardList,
  Coins,
  Loader2,
  PackagePlus,
  PackageX,
  RefreshCw,
  TrendingDown,
} from "lucide-react";

import { useGetInventoryClosuresClosureIdReport } from "@/api/generated/inventory/inventory";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDate,
  formatDateTime,
  shiftNameLabels,
  type ShiftNameValue,
} from "@/features/inventory/inventory-labels";

export function ClosureReportPage() {
  const { closureId } = useParams({
    from: "/inventory/closures/$closureId",
  });
  const { data, error, isLoading, mutate } =
    useGetInventoryClosuresClosureIdReport<ApiError>(closureId);
  const report = data && data.status === 200 ? data.data.data : undefined;
  const requestNumber = report?.replenishmentRequest?.requestNumber ?? null;
  const requestStatus = report?.replenishmentRequest?.status ?? null;

  const items = report?.items ?? [];

  const totals = items.reduce(
    (acc, item) => {
      acc.opening += item.closureItem.openingQuantity;
      acc.received += item.receivedQuantityInShift;
      acc.closing += item.closureItem.closingQuantity;
      if (typeof item.requestedQuantity === "number") {
        acc.requested += item.requestedQuantity;
      }
      return acc;
    },
    { opening: 0, received: 0, closing: 0, requested: 0 },
  );

  return (
    <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reporte de cierre</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Detalle del cierre por artículo y pedido sugerido.
          </p>
        </div>
        {requestNumber && (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Pedido sugerido
            </span>
            <span className="inline-flex h-9 items-center rounded-full border bg-muted/70 px-4 text-sm font-semibold">
              {requestNumber}
              {requestStatus && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  · {requestStatus}
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 rounded-lg border bg-background p-6 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Cargando reporte…
        </div>
      )}

      {!isLoading && error && (
        <Card className="gap-0 py-6 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RefreshCw />
                </EmptyMedia>
                <EmptyTitle>No pudimos cargar el reporte</EmptyTitle>
                <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => void mutate()}>
                Intentar de nuevo
              </Button>
            </Empty>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && report && (
        <>
          <Card className="gap-0 py-0 shadow-sm">
            <CardHeader className="border-b p-6">
              <CardTitle className="text-lg">
                {formatDate(report.shift.businessDate)} ·{" "}
                {shiftNameLabels[report.shift.shiftName as ShiftNameValue] ??
                  report.shift.shiftName}
              </CardTitle>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Sucursal" value={report.closure.branchId} mono />
                <Detail label="Cerrado" value={formatDateTime(report.closure.closedAt)} />
                <Detail label="Abierto" value={formatDateTime(report.shift.openedAt)} />
                <Detail label="Cerrado por" value={report.closure.closedBy} mono />
                {report.closure.notes && (
                  <div className="sm:col-span-2 lg:col-span-4">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Notas
                    </span>
                    <p className="mt-2 text-sm">{report.closure.notes}</p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard
                label="Artículos"
                value={new Intl.NumberFormat("es-MX").format(items.length)}
                icon={<Boxes className="size-5" />}
              />
              <SummaryCard
                label="Suma inicial"
                value={new Intl.NumberFormat("es-MX").format(totals.opening)}
                icon={<PackagePlus className="size-5" />}
              />
              <SummaryCard
                label="Recibido en turno"
                value={new Intl.NumberFormat("es-MX").format(totals.received)}
                icon={<PackageX className="size-5" />}
              />
              <SummaryCard
                label="Suma cierre"
                value={new Intl.NumberFormat("es-MX").format(totals.closing)}
                icon={<TrendingDown className="size-5" />}
              />
              <SummaryCard
                label="Solicitado"
                value={new Intl.NumberFormat("es-MX").format(totals.requested)}
                icon={<Coins className="size-5" />}
              />
            </CardContent>
          </Card>

          <Card className="mt-6 gap-0 py-0 shadow-sm">
            <CardHeader className="border-b p-6">
              <CardTitle className="text-base">Detalle por artículo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="min-w-[820px]">
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-[50px] pl-6 text-xs font-semibold tracking-wide text-muted-foreground">
                      ARTÍCULO
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold tracking-wide text-muted-foreground">
                      INICIAL
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold tracking-wide text-muted-foreground">
                      RECIBIDO
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold tracking-wide text-muted-foreground">
                      CIERRE
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold tracking-wide text-muted-foreground">
                      OBJETIVO
                    </TableHead>
                    <TableHead className="pr-6 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                      SOLICITADO
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="h-[200px] p-6">
                        <Empty>
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <ClipboardList />
                            </EmptyMedia>
                            <EmptyTitle>Sin artículos en este cierre</EmptyTitle>
                            <EmptyDescription>
                              No se registraron artículos al cerrar este turno.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.closureItem.id} className="h-[68px] hover:bg-transparent">
                        <TableCell className="pl-6">
                          <div className="text-base font-semibold">{item.supply.name}</div>
                          <div className="text-xs text-muted-foreground">{item.supply.sku}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {new Intl.NumberFormat("es-MX").format(item.closureItem.openingQuantity)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {new Intl.NumberFormat("es-MX").format(item.receivedQuantityInShift)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {new Intl.NumberFormat("es-MX").format(item.closureItem.closingQuantity)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {item.targetQuantity === null
                            ? "—"
                            : new Intl.NumberFormat("es-MX").format(item.targetQuantity)}
                        </TableCell>
                        <TableCell className="pr-6 text-right font-mono text-sm text-muted-foreground">
                          {item.requestedQuantity === null
                            ? "—"
                            : new Intl.NumberFormat("es-MX").format(item.requestedQuantity)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <p className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <p className="font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

function getErrorMessage(error: ApiError) {
  if (error.status === 404) {
    return "El reporte ya no está disponible.";
  }

  if (error.status >= 500) {
    return "El servidor no está disponible. Inténtalo de nuevo en unos momentos.";
  }

  return "Verifica tu conexión e inténtalo de nuevo.";
}
