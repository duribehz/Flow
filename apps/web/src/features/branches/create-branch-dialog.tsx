import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { usePostBranches } from "@/api/generated/branches/branches";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CreateBranchDialogProps = {
  onClose: () => void;
  onCreated: () => Promise<unknown>;
};

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Ingresa un nombre válido para la sucursal.",
};

export function CreateBranchDialog({ onClose, onCreated }: CreateBranchDialogProps) {
  const [submissionError, setSubmissionError] = useState<string>();
  const { trigger, isMutating } = usePostBranches<ApiError>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(undefined);

    const formData = new FormData(event.currentTarget);

    try {
      await trigger({ name: String(formData.get("name") ?? "").trim() });
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
        aria-labelledby="create-branch-title"
        className="w-full max-w-md rounded-xl bg-background shadow-xl ring-1 ring-foreground/10"
      >
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 id="create-branch-title" className="text-xl font-semibold">
              Agregar sucursal
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registra una nueva sucursal para la operación.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
            <X />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label htmlFor="branch-name" className="mb-2 block text-sm font-medium">
              Nombre
            </label>
            <Input
              id="branch-name"
              name="name"
              required
              maxLength={50}
              autoFocus
              placeholder="Ej. Sucursal Centro"
              className="h-11"
            />
          </div>

          {submissionError && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {submissionError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-10 px-4" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-10 px-4" disabled={isMutating}>
              {isMutating ? "Guardando..." : "Guardar sucursal"}
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

  return "No fue posible guardar la sucursal. Inténtalo de nuevo.";
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
