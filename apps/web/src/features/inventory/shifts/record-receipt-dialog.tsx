import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { usePostInventoryShiftsShiftIdReceipts } from "@/api/generated/inventory/inventory";
import { RecordInventoryReceiptIncidentType } from "@/api/generated/models/recordInventoryReceiptIncidentType";
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
import { incidentOptions } from "@/features/inventory/inventory-labels";

type RecordReceiptDialogProps = {
  shiftId: string;
  onClose: () => void;
  onCreated: () => Promise<unknown>;
};

type IncidentValue =
  (typeof RecordInventoryReceiptIncidentType)[keyof typeof RecordInventoryReceiptIncidentType];

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Revisa los datos ingresados e inténtalo de nuevo.",
  INVENTORY_SHIFT_NOT_FOUND: "El turno ya no está disponible.",
  SHIFT_CLOSED: "El turno está cerrado y no admite más recepciones.",
};

export function RecordReceiptDialog({ shiftId, onClose, onCreated }: RecordReceiptDialogProps) {
  const [submissionError, setSubmissionError] = useState<string>();
  const [supplyId, setSupplyId] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentValue>("none");
  const { trigger, isMutating } = usePostInventoryShiftsShiftIdReceipts<ApiError>(shiftId);
  const { data: suppliesData } = useGetSupplies<ApiError>();
  const supplies = suppliesData?.data.data ?? [];

  useEffect(() => {
    if (!supplyId && supplies[0]) setSupplyId(supplies[0].id);
  }, [supplies, supplyId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(undefined);

    const formData = new FormData(event.currentTarget);
    const expected = String(formData.get("expectedQuantity") ?? "").trim();
    const received = String(formData.get("receivedQuantity") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const receivedQuantity = Number(received);
    if (!Number.isFinite(receivedQuantity) || receivedQuantity < 0) {
      setSubmissionError("La cantidad recibida debe ser un número mayor o igual a cero.");
      return;
    }

    try {
      await trigger({
        supplyId,
        receivedQuantity,
        incidentType,
        ...(expected ? { expectedQuantity: Number(expected) } : {}),
        ...(notes ? { notes } : {}),
      });
      await onCreated();
      onClose();
    } catch (error) {
      setSubmissionError(getErrorMessage(error));
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/35 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-receipt-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-background shadow-xl ring-1 ring-foreground/10"
      >
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 id="record-receipt-title" className="text-xl font-semibold">
              Registrar recepción
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Captura la cantidad recibida y, si aplica, la incidencia.
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
          <div>
            <label htmlFor="receipt-supply" className="mb-2 block text-sm font-medium">
              Artículo
            </label>
            <Select value={supplyId} onValueChange={(value) => setSupplyId(value ?? "")}>
              <SelectTrigger
                id="receipt-supply"
                className="h-11 w-full px-3"
                disabled={supplies.length === 0}
              >
                <SelectValue placeholder="Selecciona un artículo">
                  {supplies.find((supply) => supply.id === supplyId)?.name}
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
            {supplies.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Primero registra al menos un artículo.
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="receipt-expected" className="mb-2 block text-sm font-medium">
                Esperado <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Input
                id="receipt-expected"
                name="expectedQuantity"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className="h-11"
              />
            </div>
            <div>
              <label htmlFor="receipt-received" className="mb-2 block text-sm font-medium">
                Recibido
              </label>
              <Input
                id="receipt-received"
                name="receivedQuantity"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                required
                className="h-11"
              />
            </div>
          </div>

          <div>
            <label htmlFor="receipt-incident" className="mb-2 block text-sm font-medium">
              Incidencia
            </label>
            <Select
              value={incidentType}
              onValueChange={(value) => setIncidentType((value ?? "none") as IncidentValue)}
            >
              <SelectTrigger id="receipt-incident" className="h-11 w-full px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {incidentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="receipt-notes" className="mb-2 block text-sm font-medium">
              Notas <span className="text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              id="receipt-notes"
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="Detalle adicional sobre la recepción"
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
            <Button type="submit" className="h-10 px-4" disabled={isMutating || !supplyId}>
              {isMutating ? "Guardando..." : "Guardar recepción"}
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

  return "No fue posible registrar la recepción. Inténtalo de nuevo.";
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
