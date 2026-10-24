import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  CalendarClock,
  CircleCheck,
  ClipboardList,
  DoorOpen,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import { useGetInventoryShiftsShiftId } from "@/api/generated/inventory/inventory";
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
import { CloseShiftDialog } from "./close-shift-dialog";
import { RecordReceiptDialog } from "./record-receipt-dialog";

const statusLabels: Record<"open" | "closed", string> = {
  open: "Abierto",
  closed: "Cerrado",
};

export function ShiftDetailPage() {
  const { shiftId } = useParams({ from: "/inventory/shifts/$shiftId" });
  const navigate = useNavigate();
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const { data, error, isLoading, mutate } = useGetInventoryShiftsShiftId<ApiError>(shiftId);
  const shift = data && data.status === 200 ? data.data.data : undefined;

  return (
    <>
      <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Detalle de turno</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Registra recepciones y cierra el turno cuando finalices el conteo.
            </p>
          </div>
          {shift && shift.status === "open" && (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="h-[50px] w-full gap-3 px-5 text-base sm:w-auto"
                onClick={() => setIsReceiptOpen(true)}
              >
                <ClipboardList className="size-5" />
                Registrar recepción
              </Button>
              <Button
                className="h-[50px] w-full gap-3 px-5 text-base sm:w-auto"
                onClick={() => setIsCloseOpen(true)}
              >
                <CircleCheck className="size-5" />
                Cerrar turno
              </Button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 rounded-lg border bg-background p-6 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Cargando información del turno…
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
                  <EmptyTitle>No pudimos cargar el turno</EmptyTitle>
                  <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
                </EmptyHeader>
                <Button variant="outline" onClick={() => void mutate()}>
                  Intentar de nuevo
                </Button>
              </Empty>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && shift && (
          <>
            <Card className="gap-0 py-0 shadow-sm">
              <CardHeader className="border-b p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">
                      {formatDate(shift.businessDate)} ·{" "}
                      {shiftNameLabels[shift.shiftName as ShiftNameValue] ?? shift.shiftName}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sucursal: <span className="font-mono text-xs">{shift.branchId}</span>
                    </p>
                  </div>
                  <span className="inline-flex h-8 items-center rounded-full border bg-muted/70 px-3 text-sm font-semibold">
                    {statusLabels[shift.status]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Abierto"
                  value={formatDateTime(shift.openedAt)}
                  icon={<CalendarClock className="size-4" />}
                />
                <Field
                  label="Cerrado"
                  value={shift.closedAt ? formatDateTime(shift.closedAt) : "—"}
                  icon={<CircleCheck className="size-4" />}
                />
                <Field
                  label="Abierto por"
                  value={shift.openedBy}
                  icon={<DoorOpen className="size-4" />}
                />
                <Field
                  label="Cerrado por"
                  value={shift.closedBy ?? "—"}
                  icon={<X className="size-4" />}
                />
                {shift.notes && (
                  <div className="sm:col-span-2 lg:col-span-4">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Notas
                    </p>
                    <p className="mt-2 text-sm">{shift.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6 gap-0 py-0 shadow-sm">
              <CardHeader className="border-b p-6">
                <CardTitle className="text-base">Recepciones registradas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-[50px] pl-6 text-xs font-semibold tracking-wide text-muted-foreground">
                        ARTÍCULO
                      </TableHead>
                      <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                        ESPERADO
                      </TableHead>
                      <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                        RECIBIDO
                      </TableHead>
                      <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                        INCIDENCIA
                      </TableHead>
                      <TableHead className="pr-6 text-xs font-semibold tracking-wide text-muted-foreground">
                        REGISTRADO
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="h-[200px] p-6">
                        <Empty>
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <ClipboardList />
                            </EmptyMedia>
                            <EmptyTitle>Aún no hay recepciones</EmptyTitle>
                            <EmptyDescription>
                              Las recepciones que registres aparecerán en este listado.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {shift && (
        <>
          {isReceiptOpen && (
            <RecordReceiptDialog
              shiftId={shiftId}
              onClose={() => setIsReceiptOpen(false)}
              onCreated={async () => {
                await mutate();
              }}
            />
          )}
          {isCloseOpen && (
            <CloseShiftDialog
              shiftId={shiftId}
              branchId={shift.branchId}
              onClose={() => setIsCloseOpen(false)}
              onClosed={(closureId) => {
                setIsCloseOpen(false);
                void navigate({
                  to: "/inventory/closures/$closureId",
                  params: { closureId },
                });
              }}
            />
          )}
        </>
      )}
    </>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </div>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}

function getErrorMessage(error: ApiError) {
  if (error.status === 404) {
    return "El turno ya no está disponible.";
  }

  if (error.status >= 500) {
    return "El servidor no está disponible. Inténtalo de nuevo en unos momentos.";
  }

  return "Verifica tu conexión e inténtalo de nuevo.";
}
