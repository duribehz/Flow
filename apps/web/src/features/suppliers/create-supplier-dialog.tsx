import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { usePostSuppliers } from "@/api/generated/suppliers/suppliers";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CreateSupplierDialogProps = {
  onClose: () => void;
  onCreated: () => Promise<unknown>;
};

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Revisa los datos ingresados e inténtalo de nuevo.",
  SUPPLIER_NAME_CONFLICT: "Ya existe un proveedor con ese nombre.",
};

export function CreateSupplierDialog({ onClose, onCreated }: CreateSupplierDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const { trigger, isMutating } = usePostSuppliers<ApiError>();

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(undefined);

    const formData = new FormData(event.currentTarget);
    const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    try {
      await trigger({
        name: String(formData.get("name") ?? "").trim(),
        phoneNumber: phoneNumber || null,
        email: email || null,
      });
      await onCreated();
      onClose();
    } catch (error) {
      setSubmissionError(getErrorMessage(error));
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-supplier-title"
      aria-describedby="create-supplier-description"
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md rounded-xl bg-background p-0 text-foreground shadow-xl ring-1 ring-foreground/10 backdrop:bg-foreground/35"
      onCancel={(event) => {
        event.preventDefault();
        if (!isMutating) onClose();
      }}
    >
      <div className="flex items-start justify-between border-b px-6 py-5">
        <div>
          <h2 id="create-supplier-title" className="text-xl font-semibold">
            Agregar proveedor
          </h2>
          <p id="create-supplier-description" className="mt-1 text-sm text-muted-foreground">
            Registra los datos de contacto del proveedor.
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
          <label htmlFor="supplier-name" className="mb-2 block text-sm font-medium">
            Nombre
          </label>
          <Input
            id="supplier-name"
            name="name"
            required
            maxLength={200}
            autoFocus
            placeholder="Ej. Distribuidora Central"
            className="h-11"
          />
        </div>

        <div>
          <label htmlFor="supplier-phone-number" className="mb-2 block text-sm font-medium">
            Teléfono <span className="text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="supplier-phone-number"
            name="phoneNumber"
            type="tel"
            maxLength={30}
            autoComplete="tel"
            placeholder="Ej. 555 123 4567"
            className="h-11"
          />
        </div>

        <div>
          <label htmlFor="supplier-email" className="mb-2 block text-sm font-medium">
            Correo <span className="text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="supplier-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Ej. contacto@proveedor.com"
            className="h-11"
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
          <Button type="submit" className="h-10 px-4" disabled={isMutating}>
            {isMutating ? "Guardando..." : "Guardar proveedor"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && isApiErrorData(error.data)) {
    return errorMessages[error.data.error.code] ?? error.data.error.message;
  }

  return "No fue posible guardar el proveedor. Inténtalo de nuevo.";
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
