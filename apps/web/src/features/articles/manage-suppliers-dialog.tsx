import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { usePutSuppliesSupplyIdSuppliers } from "@/api/generated/supplies/supplies";
import type { Supplier, Supply } from "@/api/generated/models";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { SupplierChecklist } from "./supplier-checklist";

type ManageSuppliersDialogProps = {
  supply: Supply;
  suppliers: Supplier[];
  onClose: () => void;
  onUpdated: () => Promise<unknown>;
};

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Selecciona al menos un proveedor.",
  SUPPLIER_REQUIRED: "Selecciona al menos un proveedor.",
  DUPLICATE_SUPPLIER_IDS: "No puedes seleccionar el mismo proveedor más de una vez.",
  SUPPLIER_NOT_FOUND: "Uno de los proveedores seleccionados ya no está disponible.",
  SUPPLY_NOT_FOUND: "El artículo ya no está disponible.",
};

export function ManageSuppliersDialog({
  supply,
  suppliers,
  onClose,
  onUpdated,
}: ManageSuppliersDialogProps) {
  const [selectedIds, setSelectedIds] = useState(supply.suppliers.map((supplier) => supplier.id));
  const [submissionError, setSubmissionError] = useState<string>();
  const { trigger, isMutating } = usePutSuppliesSupplyIdSuppliers<ApiError>(supply.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(undefined);

    if (selectedIds.length === 0) {
      setSubmissionError("Selecciona al menos un proveedor.");
      return;
    }

    try {
      await trigger({ supplierIds: selectedIds });
      await onUpdated();
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
        aria-labelledby="manage-suppliers-title"
        className="w-full max-w-md rounded-xl bg-background shadow-xl ring-1 ring-foreground/10"
      >
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 id="manage-suppliers-title" className="text-xl font-semibold">
              Gestionar proveedores
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{supply.name}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
            <X />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Proveedores</span>
              <span className="text-xs text-muted-foreground">
                {selectedIds.length} seleccionados
              </span>
            </div>
            <SupplierChecklist
              suppliers={suppliers}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
            />
          </div>

          {submissionError && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {submissionError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isMutating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={selectedIds.length === 0 || isMutating}>
              {isMutating ? "Guardando..." : "Guardar proveedores"}
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

  return "No fue posible actualizar los proveedores. Inténtalo de nuevo.";
}

function isApiErrorData(value: unknown): value is { error: { code: string; message: string } } {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
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
