import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { useGetBranches } from "@/api/generated/branches/branches";
import { CreateInventoryShiftShiftName } from "@/api/generated/models/createInventoryShiftShiftName";
import { usePostInventoryShifts } from "@/api/generated/inventory/inventory";
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
import { shiftNameOptions } from "@/features/inventory/inventory-labels";

type OpenShiftDialogProps = {
  onClose: () => void;
  onCreated: () => Promise<unknown>;
  onShiftCreated: (shiftId: string) => void;
};

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Revisa los datos ingresados e inténtalo de nuevo.",
  SHIFT_ALREADY_OPEN: "Ya hay un turno abierto para esa sucursal, fecha y turno.",
  SHIFT_ALREADY_CLOSED: "Ya existe un turno cerrado para esa sucursal, fecha y turno.",
};

export function OpenShiftDialog({ onClose, onCreated, onShiftCreated }: OpenShiftDialogProps) {
  const [submissionError, setSubmissionError] = useState<string>();
  const [branchId, setBranchId] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [shiftName, setShiftName] = useState<"morning" | "afternoon" | "night">("morning");
  const { trigger, isMutating } = usePostInventoryShifts<ApiError>();
  const { data: branchesData } = useGetBranches<ApiError>();
  const branches = branchesData?.data.data ?? [];

  useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches, branchId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(undefined);

    const formData = new FormData(event.currentTarget);
    const notes = String(formData.get("notes") ?? "").trim();

    try {
      const result = await trigger({
        branchId,
        businessDate,
        shiftName: CreateInventoryShiftShiftName[shiftName],
        ...(notes ? { notes } : {}),
      });
      await onCreated();
      if (result.status === 201) {
        onShiftCreated(result.data.data.id);
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
        aria-labelledby="open-shift-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl bg-background shadow-xl ring-1 ring-foreground/10"
      >
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 id="open-shift-title" className="text-xl font-semibold">
              Abrir turno
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Define la sucursal, fecha y turno a levantar.
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
            <label htmlFor="open-shift-branch" className="mb-2 block text-sm font-medium">
              Sucursal
            </label>
            <Select value={branchId} onValueChange={(value) => setBranchId(value ?? "")}>
              <SelectTrigger
                id="open-shift-branch"
                className="h-11 w-full px-3"
                disabled={branches.length === 0}
              >
                <SelectValue placeholder="Selecciona una sucursal">
                  {branches.find((branch) => branch.id === branchId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {branches.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Primero registra al menos una sucursal.
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="open-shift-business-date" className="mb-2 block text-sm font-medium">
                Fecha
              </label>
              <Input
                id="open-shift-business-date"
                type="date"
                required
                value={businessDate}
                onChange={(event) => setBusinessDate(event.currentTarget.value)}
                className="h-11"
              />
            </div>
            <div>
              <label htmlFor="open-shift-name" className="mb-2 block text-sm font-medium">
                Turno
              </label>
              <Select
                value={shiftName}
                onValueChange={(value) =>
                  setShiftName((value ?? "morning") as "morning" | "afternoon" | "night")
                }
              >
                <SelectTrigger id="open-shift-name" className="h-11 w-full px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shiftNameOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="open-shift-notes" className="mb-2 block text-sm font-medium">
              Notas <span className="text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              id="open-shift-notes"
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="Notas sobre la apertura del turno"
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
              disabled={isMutating || !branchId || !businessDate}
            >
              {isMutating ? "Abriendo..." : "Abrir turno"}
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

  return "No fue posible abrir el turno. Inténtalo de nuevo.";
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
