import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { usePostSupplies } from "@/api/generated/supplies/supplies";
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

type Option = {
  id: string;
  name: string;
  detail?: string;
};

type CreateSupplyDialogProps = {
  categories: Option[];
  units: Option[];
  onClose: () => void;
  onCreated: () => Promise<unknown>;
};

const errorMessages: Record<string, string> = {
  VALIDATION_ERROR: "Revisa los datos ingresados e inténtalo de nuevo.",
  CATEGORY_NOT_FOUND: "La categoría seleccionada ya no está disponible.",
  UNIT_NOT_FOUND: "La unidad seleccionada ya no está disponible.",
  SUPPLY_SKU_CONFLICT: "Ya existe un artículo con ese código.",
};

export function CreateSupplyDialog({
  categories,
  units,
  onClose,
  onCreated,
}: CreateSupplyDialogProps) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [submissionError, setSubmissionError] = useState<string>();
  const { trigger, isMutating } = usePostSupplies<ApiError>();
  const hasOptions = categories.length > 0 && units.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(undefined);

    const formData = new FormData(event.currentTarget);
    const description = String(formData.get("description") ?? "").trim();

    try {
      await trigger({
        sku: String(formData.get("sku") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
        description: description || null,
        categoryId,
        unitId,
        unitCost: Number(formData.get("unitCost") ?? 0),
        active: formData.get("active") === "on",
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
        aria-labelledby="create-supply-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-background shadow-xl ring-1 ring-foreground/10"
      >
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 id="create-supply-title" className="text-xl font-semibold">
              Agregar artículo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registra un nuevo artículo en el catálogo.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
            <X />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Código" htmlFor="supply-sku">
              <Input
                id="supply-sku"
                name="sku"
                required
                maxLength={100}
                autoFocus
                placeholder="COC-006"
                className="h-11"
              />
            </Field>
            <Field label="Nombre" htmlFor="supply-name">
              <Input
                id="supply-name"
                name="name"
                required
                maxLength={200}
                placeholder="Nombre del artículo"
                className="h-11"
              />
            </Field>
          </div>

          <Field label="Descripción" htmlFor="supply-description">
            <textarea
              id="supply-description"
              name="description"
              rows={3}
              placeholder="Descripción opcional"
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Categoría" htmlFor="supply-category">
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")}>
                <SelectTrigger id="supply-category" className="h-11 w-full px-3">
                  <SelectValue placeholder="Selecciona una categoría">
                    {categories.find((category) => category.id === categoryId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Unidad" htmlFor="supply-unit">
              <Select value={unitId} onValueChange={(value) => setUnitId(value ?? "")}>
                <SelectTrigger id="supply-unit" className="h-11 w-full px-3">
                  <SelectValue placeholder="Selecciona una unidad">
                    {units.find((unit) => unit.id === unitId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name} {unit.detail ? `(${unit.detail})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Costo unitario" htmlFor="supply-unit-cost">
            <Input
              id="supply-unit-cost"
              name="unitCost"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              required
              className="h-11"
            />
          </Field>

          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              name="active"
              defaultChecked
              className="size-4 rounded border-input accent-foreground"
            />
            Artículo activo
          </label>

          {!hasOptions && (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Se necesita al menos una categoría y una unidad existentes para registrar artículos.
            </p>
          )}
          {submissionError && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {submissionError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-10 px-4" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="h-10 px-4" disabled={!hasOptions || isMutating}>
              {isMutating ? "Guardando..." : "Guardar artículo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && isApiErrorData(error.data)) {
    return errorMessages[error.data.error.code] ?? error.data.error.message;
  }

  return "No fue posible guardar el artículo. Inténtalo de nuevo.";
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
