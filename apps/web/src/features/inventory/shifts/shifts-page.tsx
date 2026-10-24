import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, Plus, RefreshCw } from "lucide-react";

import { useGetInventoryShifts } from "@/api/generated/inventory/inventory";
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
import {
  formatDate,
  formatDateTime,
  shiftNameLabels,
  type ShiftNameValue,
} from "@/features/inventory/inventory-labels";
import { OpenShiftDialog } from "./open-shift-dialog";

const statusLabels: Record<"open" | "closed", string> = {
  open: "Abierto",
  closed: "Cerrado",
};

export function InventoryShiftsPage() {
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, error, isLoading, mutate } = useGetInventoryShifts<ApiError>();
  const shifts = data && data.status === 200 ? data.data.data : [];

  return (
    <>
      <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Turnos</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Abre turnos para registrar recepciones y cierres por sucursal.
            </p>
          </div>
          <Button
            className="h-[50px] w-full gap-3 px-5 text-base sm:w-auto"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-5" />
            Abrir turno
          </Button>
        </div>

        <Card className="gap-0 py-0 shadow-sm">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[50px] pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  FECHA
                </TableHead>
                <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                  TURNO
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold tracking-wide text-muted-foreground">
                  ESTADO
                </TableHead>
                <TableHead className="pr-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  ABIERTO
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
                        <EmptyTitle>No pudimos cargar los turnos</EmptyTitle>
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
                shifts.length > 0 &&
                shifts.map((shift) => (
                  <TableRow
                    key={shift.id}
                    tabIndex={0}
                    className="h-[76px] cursor-pointer hover:bg-transparent"
                    onClick={() =>
                      void navigate({
                        to: "/inventory/shifts/$shiftId",
                        params: { shiftId: shift.id },
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void navigate({
                          to: "/inventory/shifts/$shiftId",
                          params: { shiftId: shift.id },
                        });
                      }
                    }}
                  >
                    <TableCell className="pl-7 text-base font-semibold">
                      {formatDate(shift.businessDate)}
                    </TableCell>
                    <TableCell className="text-base text-muted-foreground">
                      {shiftNameLabels[shift.shiftName as ShiftNameValue] ?? shift.shiftName}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex h-8 items-center rounded-full border bg-muted/70 px-3 text-sm font-semibold">
                        {statusLabels[shift.status]}
                      </span>
                    </TableCell>
                    <TableCell className="pr-7 text-base text-muted-foreground">
                      {formatDateTime(shift.openedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && shifts.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <CalendarClock />
                        </EmptyMedia>
                        <EmptyTitle>No hay turnos</EmptyTitle>
                        <EmptyDescription>
                          Los turnos que abras aparecerán en este listado.
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

      {isCreateOpen && (
        <OpenShiftDialog
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            await mutate();
          }}
          onShiftCreated={(shiftId) => {
            setIsCreateOpen(false);
            void navigate({
              to: "/inventory/shifts/$shiftId",
              params: { shiftId },
            });
          }}
        />
      )}
    </>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <TableRow key={index} className="h-[76px] hover:bg-transparent">
      <TableCell className="pl-7 pr-7" colSpan={4}>
        <div className="h-4 w-full max-w-[640px] animate-pulse rounded bg-muted" />
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
