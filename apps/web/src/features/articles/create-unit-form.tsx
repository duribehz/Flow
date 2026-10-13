import { useState, type FormEvent } from "react";

import { usePostUnits } from "@/api/generated/units/units";
import type { Unit } from "@/api/generated/models/unit";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CreateUnitFormProps = {
  onCancel: () => void;
  onCreated: (unit: Unit) => void | Promise<unknown>;
};

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Ingresa un nombre y un símbolo válidos para la unidad.",
  UNIT_CONFLICT: "Ya existe una unidad con ese nombre o símbolo.",
};

export function CreateUnitForm({ onCancel, onCreated }: CreateUnitFormProps) {
  const [submissionError, setSubmissionError] = useState<string>();
  const { trigger, isMutating } = usePostUnits<ApiError>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(undefined);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await trigger({
        name: String(formData.get("name") ?? "").trim(),
        symbol: String(formData.get("symbol") ?? "").trim(),
      });

      if (response.status !== 201) {
        throw new Error("Unexpected response status");
      }

      await onCreated(response.data.data);
    } catch (error) {
      setSubmissionError(getErrorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="unit-name" className="mb-2 block text-sm font-medium">
          Nombre
        </label>
        <Input
          id="unit-name"
          name="name"
          required
          maxLength={100}
          autoFocus
          disabled={isMutating}
          placeholder="Ej. Kilogramo"
          className="h-11"
        />
      </div>

      <div>
        <label htmlFor="unit-symbol" className="mb-2 block text-sm font-medium">
          Símbolo
        </label>
        <Input
          id="unit-symbol"
          name="symbol"
          required
          maxLength={20}
          disabled={isMutating}
          placeholder="Ej. kg"
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
          onClick={onCancel}
          disabled={isMutating}
        >
          Cancelar
        </Button>
        <Button type="submit" className="h-10 px-4" disabled={isMutating}>
          {isMutating ? "Guardando..." : "Guardar unidad"}
        </Button>
      </div>
    </form>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && isApiErrorData(error.data)) {
    return errorMessages[error.data.error.code] ?? "No fue posible guardar la unidad.";
  }

  return "No fue posible guardar la unidad. Inténtalo de nuevo.";
}

function isApiErrorData(value: unknown): value is { error: { code: string } } {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return false;
  }

  const error = value.error;
  return Boolean(
    error && typeof error === "object" && "code" in error && typeof error.code === "string",
  );
}
