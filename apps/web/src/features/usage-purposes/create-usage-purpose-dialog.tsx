import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { usePostUsagePurposes } from "@/api/generated/usage-purposes/usage-purposes";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";

type CreateUsagePurposeDialogProps = {
  onClose: () => void;
  onCreated: () => Promise<unknown>;
};

export function CreateUsagePurposeDialog({ onClose, onCreated }: CreateUsagePurposeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const create = usePostUsagePurposes<ApiError>();

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const formData = new FormData(event.currentTarget);

    try {
      await create.trigger({
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim() || null,
        active: true,
      });
      await onCreated();
      onClose();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          { USAGE_PURPOSE_NAME_CONFLICT: "Ya existe un propósito con ese nombre." },
          "No pudimos crear el propósito.",
        ),
      );
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-usage-purpose-title"
      aria-describedby="create-usage-purpose-description"
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md rounded-xl bg-background p-0 text-foreground shadow-xl ring-1 ring-foreground/10 backdrop:bg-foreground/35"
      onCancel={(event) => {
        event.preventDefault();
        if (!create.isMutating) onClose();
      }}
    >
      <div className="flex items-start justify-between border-b px-6 py-5">
        <div>
          <h2 id="create-usage-purpose-title" className="text-xl font-semibold">
            Agregar propósito
          </h2>
          <p id="create-usage-purpose-description" className="mt-1 text-sm text-muted-foreground">
            Define un destino que puedas asignar a las partidas de un pedido.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cerrar"
          disabled={create.isMutating}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div>
          <label htmlFor="usage-purpose-name" className="mb-2 block text-sm font-medium">
            Nombre
          </label>
          <Input
            id="usage-purpose-name"
            name="name"
            required
            maxLength={100}
            autoFocus
            placeholder="Ej. Operación"
            className="h-11"
          />
        </div>

        <div>
          <label htmlFor="usage-purpose-description" className="mb-2 block text-sm font-medium">
            Descripción <span className="text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="usage-purpose-description"
            name="description"
            maxLength={500}
            placeholder="Describe cuándo se usa"
            className="h-11"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            disabled={create.isMutating}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" className="h-10 px-4" disabled={create.isMutating}>
            {create.isMutating ? "Guardando..." : "Guardar propósito"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
