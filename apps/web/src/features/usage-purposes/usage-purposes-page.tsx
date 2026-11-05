import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, RefreshCw, Save, Sparkles } from "lucide-react";

import type { UsagePurpose } from "@/api/generated/models";
import {
  useGetUsagePurposes,
  usePatchUsagePurposesUsagePurposeId,
  usePostUsagePurposes,
} from "@/api/generated/usage-purposes/usage-purposes";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";

export function UsagePurposesPage() {
  const query = useGetUsagePurposes<ApiError>();
  const create = usePostUsagePurposes<ApiError>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const purposes = query.data?.status === 200 ? query.data.data.data : [];

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await create.trigger({
        name: name.trim(),
        description: description.trim() || null,
        active: true,
      });
      setName("");
      setDescription("");
      await query.mutate();
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
    <PageFrame>
      <PageHeader
        eyebrow="Administración de catálogo"
        title="Propósitos de uso"
        description="Define los destinos que se asignan a cada partida de un pedido, como operación, limpieza o promoción."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" /> Crear propósito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreate}
            className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto] md:items-end"
          >
            <label className="grid gap-2 text-sm font-medium" htmlFor="purpose-name">
              Nombre
              <Input
                id="purpose-name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="Ej. Operación"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium" htmlFor="purpose-description">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
              <Input
                id="purpose-description"
                maxLength={500}
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
                placeholder="Describe cuándo se usa"
              />
            </label>
            <Button type="submit" disabled={create.isMutating || !name.trim()}>
              {create.isMutating ? <Loader2 className="animate-spin" /> : <Plus />}
              Agregar propósito
            </Button>
          </form>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {query.isLoading && (
        <Card className="p-8 text-center text-muted-foreground">Cargando propósitos…</Card>
      )}
      {!query.isLoading && query.error && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <p>No pudimos cargar los propósitos.</p>
          <Button variant="outline" onClick={() => void query.mutate()}>
            <RefreshCw /> Intentar de nuevo
          </Button>
        </Card>
      )}
      {!query.isLoading && !query.error && purposes.length === 0 && (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Sparkles className="size-8 text-muted-foreground" />
          <h2 className="font-semibold">Todavía no hay propósitos</h2>
          <p className="text-sm text-muted-foreground">
            Crea el primero para configurar las sucursales.
          </p>
        </Card>
      )}
      {!query.isLoading && !query.error && purposes.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Propósitos existentes">
          {purposes.map((purpose) => (
            <PurposeCard key={purpose.id} purpose={purpose} onSaved={() => query.mutate()} />
          ))}
        </section>
      )}
    </PageFrame>
  );
}

function PurposeCard({
  purpose,
  onSaved,
}: {
  purpose: UsagePurpose;
  onSaved: () => Promise<unknown>;
}) {
  const update = usePatchUsagePurposesUsagePurposeId<ApiError>(purpose.id);
  const [name, setName] = useState(purpose.name);
  const [description, setDescription] = useState(purpose.description ?? "");
  const [active, setActive] = useState(purpose.active);
  const [error, setError] = useState("");
  useEffect(() => {
    setName(purpose.name);
    setDescription(purpose.description ?? "");
    setActive(purpose.active);
  }, [purpose.name, purpose.description, purpose.active]);
  const dirty =
    name.trim() !== purpose.name ||
    (description.trim() || null) !== purpose.description ||
    active !== purpose.active;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await update.trigger({
        name: name.trim(),
        description: description.trim() || null,
        active,
      });
      await onSaved();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          { USAGE_PURPOSE_NAME_CONFLICT: "Ya existe un propósito con ese nombre." },
          "No pudimos guardar los cambios.",
        ),
      );
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">{purpose.name}</CardTitle>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            purpose.active ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
          }`}
        >
          {purpose.active ? "Activo" : "Inactivo"}
        </span>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="grid gap-2 text-sm font-medium">
            Nombre
            <Input
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Descripción
            <Input
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Sin descripción"
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-4 accent-foreground"
            />
            Propósito activo
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="outline" disabled={!dirty || update.isMutating}>
            {update.isMutating ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar cambios
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
