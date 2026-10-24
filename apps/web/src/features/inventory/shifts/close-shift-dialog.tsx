import { useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { usePostInventoryShiftsShiftIdClose } from "@/api/generated/inventory/inventory";
import { useGetSupplies } from "@/api/generated/supplies/supplies";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CloseShiftDialogProps = {
  shiftId: string;
  branchId: string;
  onClose: () => void;
  onClosed: (closureId: string) => void;
};

type ClosingRow = {
  id: number;
  supplyId: string;
  closingQuantity: string;
};

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Revisa los datos ingresados e inténtalo de nuevo.",
  INVENTORY_SHIFT_NOT_FOUND: "El turno ya no está disponible.",
  SHIFT_CLOSED: "El turno ya está cerrado.",
  DUPLICATE_SUPPLY_ITEMS: "No puedes repetir el mismo artículo en el cierre.",
};

export function CloseShiftDialog({
  shiftId,
  branchId: _branchId,
  onClose,
  onClosed,
}: CloseShiftDialogProps) {
  const [submissionError, setSubmissionError] = useState<string>();
  const [rows, setRows] = useState<ClosingRow[]>(() => [
    { id: 1, supplyId: "", closingQuantity: "0" },
  ]);
  const [notes, setNotes] = useState("");
  const { trigger, isMutating } = usePostInventoryShiftsShiftIdClose<ApiError>(shiftId);
  const { data: suppliesData } = useGetSupplies<ApiError>();
  const supplies = suppliesData?.data.data ?? [];

  function ensureSupplyInitialized(value: string, rowId: number) {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, supplyId: value || row.supplyId } : row)),
    );
    if (!value && supplies[0]) {
      setRows((current) =>
        current.map((row) => (row.id === rowId ? { ...row, supplyId: supplies[0].id } : row)),
      );
    }
  }

  function addRow() {
    setRows((current) => {
      const nextId = current.reduce((max, row) => Math.max(max, row.id), 0) + 1;
      return [...current, { id: nextId, supplyId: supplies[0]?.id ?? "", closingQuantity: "0" }];
    });
  }

  function removeRow(rowId: number) {
    setRows((current) =>
      current.length <= 1 ? current : current.filter((row) => row.id !== rowId),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(undefined);

    if (rows.length === 0) {
      setSubmissionError("Agrega al menos un artículo para cerrar el turno.");
      return;
    }

    const closingItems = rows
      .map((row) => ({
        supplyId: row.supplyId || supplies[0]?.id || "",
        closingQuantity: Number(row.closingQuantity),
      }))
      .filter(
        (item, index, array) =>
          item.supplyId &&
          Number.isFinite(item.closingQuantity) &&
          item.closingQuantity >= 0 &&
          array.findIndex((other) => other.supplyId === item.supplyId) === index,
      );

    if (closingItems.length === 0) {
      setSubmissionError("Verifica que los artículos tengan cantidades válidas.");
      return;
    }

    try {
      const result = await trigger({
        closingItems,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      if (result.status === 201) {
        onClosed(result.data.data.closure.id);
      } else {
        onClose();
      }
    } catch (error) {
      setSubmissionError(getErrorMessage(error));
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/35 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-shift-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-background shadow-xl ring-1 ring-foreground/10"
      >
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 id="close-shift-title" className="text-xl font-semibold">
              Cerrar turno
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Captura el conteo final de cada artículo para cerrar el turno.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerrar"
            disabled={isMutating}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {supplies.length === 0 ? (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Primero registra al menos un artículo en la sucursal.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_140px_auto] items-end gap-3 rounded-lg border p-3"
                >
                  <div>
                    <label
                      htmlFor={`close-supply-${row.id}`}
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                      Artículo #{index + 1}
                    </label>
                    <Select
                      value={row.supplyId || supplies[0]?.id || ""}
                      onValueChange={(value) => ensureSupplyInitialized(value ?? "", row.id)}
                    >
                      <SelectTrigger id={`close-supply-${row.id}`} className="h-10 w-full px-3">
                        <SelectValue placeholder="Selecciona un artículo">
                          {
                            supplies.find(
                              (supply) => supply.id === (row.supplyId || supplies[0]?.id),
                            )?.name
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {supplies.map((supply) => (
                          <SelectItem key={supply.id} value={supply.id}>
                            {supply.name} ({supply.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label
                      htmlFor={`close-qty-${row.id}`}
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                      Cierre
                    </label>
                    <Input
                      id={`close-qty-${row.id}`}
                      type="number"
                      min={0}
                      step={1}
                      value={row.closingQuantity}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((currentRow) =>
                            currentRow.id === row.id
                              ? { ...currentRow, closingQuantity: event.currentTarget.value }
                              : currentRow,
                          ),
                        )
                      }
                      className="h-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar artículo #${index + 1}`}
                    disabled={rows.length <= 1}
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full gap-2 text-sm"
                onClick={addRow}
              >
                <Plus className="size-4" />
                Agregar artículo
              </Button>
            </div>
          )}

          <div>
            <label htmlFor="close-notes" className="mb-2 block text-sm font-medium">
              Notas <span className="text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              id="close-notes"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
              placeholder="Notas sobre el cierre del turno"
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {submissionError && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {submissionError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              disabled={isMutating}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-10 px-4"
              disabled={isMutating || supplies.length === 0}
            >
              {isMutating ? "Cerrando..." : "Cerrar turno"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && isApiErrorData(error.data)) {
    return errorMessages[error.data.error.code] ?? error.data.error.message;
  }

  return "No fue posible cerrar el turno. Inténtalo de nuevo.";
}

function isApiErrorData(value: unknown): value is { error: { code: string; message: string } } {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return false;
  }

  const error = value.error;
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string",
  );
}
