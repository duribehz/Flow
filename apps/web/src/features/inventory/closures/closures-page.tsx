import { useNavigate } from "@tanstack/react-router";
import { FileText, RefreshCw } from "lucide-react";

import { useGetInventoryClosures } from "@/api/generated/inventory/inventory";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { formatDate, formatDateTime } from "@/features/inventory/inventory-labels";

export function ClosuresPage() {
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useGetInventoryClosures<ApiError>();
  const closures = data && data.status === 200 ? data.data.data : [];

  return (
    <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">Cierres de inventario</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Consulta los cierres generados por cada turno cerrado.
        </p>
      </div>

      <Card className="gap-0 py-0 shadow-sm">
        <Table className="min-w-[760px]">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-[50px] pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                CIERRE
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                SUCURSAL
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                FECHA
              </TableHead>
              <TableHead className="pr-7 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                ACCIÓN
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <LoadingRows />}
            {!isLoading && error && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-[280px] p-6">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <RefreshCw />
                      </EmptyMedia>
                      <EmptyTitle>No pudimos cargar los cierres</EmptyTitle>
                      <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
                    </EmptyHeader>
                    <Button variant="outline" onClick={() => void mutate()}>
                      Intentar de nuevo
                    </Button>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !error &&
              closures.length > 0 &&
              closures.map((closure) => (
                <TableRow
                  key={closure.id}
                  tabIndex={0}
                  className="h-[76px] cursor-pointer hover:bg-transparent"
                  onClick={() =>
                    void navigate({
                      to: "/inventory/closures/$closureId",
                      params: { closureId: closure.id },
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void navigate({
                        to: "/inventory/closures/$closureId",
                        params: { closureId: closure.id },
                      });
                    }
                  }}
                >
                  <TableCell className="pl-7 text-base font-semibold">
                    {formatDateTime(closure.closedAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {closure.branchId}
                  </TableCell>
                  <TableCell className="text-base text-muted-foreground">
                    {formatDate(closure.createdAt)}
                  </TableCell>
                  <TableCell className="pr-7 text-right">
                    <span className="inline-flex h-8 items-center rounded-full border bg-muted/70 px-3 text-sm font-semibold">
                      Ver reporte
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && !error && closures.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-[280px] p-6">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FileText />
                      </EmptyMedia>
                      <EmptyTitle>No hay cierres</EmptyTitle>
                      <EmptyDescription>
                        Cuando cierres turnos, aparecerán aquí para generar pedidos.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </main>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <TableRow key={index} className="h-[76px] hover:bg-transparent">
      <TableCell className="pl-7 pr-7" colSpan={4}>
        <div className="h-4 w-full max-w-[680px] animate-pulse rounded bg-muted" />
      </TableCell>
    </TableRow>
  ));
}

function getErrorMessage(error: ApiError) {
  if (error.status >= 500) {
    return "El servidor no está disponible. Inténtalo de nuevo en unos momentos.";
  }

  return "Verifica tu conexión e inténtalo de nuevo.";
}
