import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Save, Settings2 } from "lucide-react";

import type {
  BranchSupplySetting,
  Supply,
  UpsertBranchSupplySetting,
  UsagePurpose,
} from "@/api/generated/models";
import { useGetBranches } from "@/api/generated/branches/branches";
import {
  useGetBranchSupplySettings,
  usePutBranchSupplySetting,
} from "@/api/generated/branch-supply-settings/branch-supply-settings";
import { useGetSupplies } from "@/api/generated/supplies/supplies";
import { useGetUsagePurposes } from "@/api/generated/usage-purposes/usage-purposes";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatMoney, parseStoredQuantity, storedQuantityToInput } from "@/lib/operational-format";

const weekdays = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

export function BranchSupplySettingsPage() {
  const { branchId } = useParams({ from: "/branches/$branchId/supply-settings" });
  const navigate = useNavigate();
  const branchesQuery = useGetBranches<ApiError>();
  const suppliesQuery = useGetSupplies<ApiError>();
  const purposesQuery = useGetUsagePurposes<ApiError>();
  const settingsQuery = useGetBranchSupplySettings<ApiError>(branchId);
  const branch =
    branchesQuery.data?.status === 200
      ? branchesQuery.data.data.data.find((candidate) => candidate.id === branchId)
      : undefined;
  const supplies = suppliesQuery.data?.status === 200 ? suppliesQuery.data.data.data : [];
  const purposes = purposesQuery.data?.status === 200 ? purposesQuery.data.data.data : [];
  const settings = settingsQuery.data?.status === 200 ? settingsQuery.data.data.data : [];
  const isLoading =
    branchesQuery.isLoading ||
    suppliesQuery.isLoading ||
    purposesQuery.isLoading ||
    settingsQuery.isLoading;
  const error =
    branchesQuery.error ?? suppliesQuery.error ?? purposesQuery.error ?? settingsQuery.error;

  async function refresh() {
    await Promise.all([
      branchesQuery.mutate(),
      suppliesQuery.mutate(),
      purposesQuery.mutate(),
      settingsQuery.mutate(),
    ]);
  }

  return (
    <PageFrame>
      <Button variant="ghost" className="w-fit" onClick={() => void navigate({ to: "/branches" })}>
        <ArrowLeft /> Volver a sucursales
      </Button>
      <PageHeader
        eyebrow="Configuración de operación"
        title={branch?.name ?? "Artículos por sucursal"}
        description="Activa los artículos que se cuentan en esta sucursal y define su modo y su stock objetivo."
        actions={
          <Link
            to="/usage-purposes"
            className="inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            Administrar propósitos
          </Link>
        }
      />

      {isLoading && (
        <Card className="p-8 text-center text-muted-foreground">Cargando configuración…</Card>
      )}
      {!isLoading && error && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <p>No pudimos cargar la configuración de la sucursal.</p>
          <Button variant="outline" onClick={() => void refresh()}>
            Intentar de nuevo
          </Button>
        </Card>
      )}
      {!isLoading && !error && purposes.filter((purpose) => purpose.active).length === 0 && (
        <Card className="border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          Crea al menos un propósito activo antes de configurar artículos.{" "}
          <Link to="/usage-purposes" className="font-semibold underline">
            Crear propósito
          </Link>
        </Card>
      )}
      {!isLoading && !error && supplies.length === 0 && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <Settings2 className="size-8 text-muted-foreground" />
          <h2 className="font-semibold">No hay artículos en el catálogo</h2>
          <p className="text-sm text-muted-foreground">
            Primero registra los artículos que manejará la sucursal.
          </p>
          <Link to="/articles" className="text-sm font-semibold underline">
            Ir a artículos
          </Link>
        </Card>
      )}
      {!isLoading && !error && supplies.length > 0 && (
        <section className="space-y-4" aria-label="Configuración por artículo">
          {supplies.map((supply) => (
            <SupplySettingCard
              key={supply.id}
              branchId={branchId}
              supply={supply}
              setting={settings.find((setting) => setting.supplyId === supply.id)}
              purposes={purposes}
              onSaved={() => settingsQuery.mutate()}
            />
          ))}
        </section>
      )}
    </PageFrame>
  );
}

function SupplySettingCard({
  branchId,
  supply,
  setting,
  purposes,
  onSaved,
}: {
  branchId: string;
  supply: Supply;
  setting?: BranchSupplySetting;
  purposes: UsagePurpose[];
  onSaved: () => Promise<unknown>;
}) {
  const mutation = usePutBranchSupplySetting<ApiError>(branchId, supply.id);
  const activePurposes = purposes.filter((purpose) => purpose.active);
  const firstActivePurposeId = activePurposes[0]?.id ?? "";
  const purposeId = setting?.defaultUsagePurposeId ?? firstActivePurposeId;
  const [active, setActive] = useState(setting?.active ?? false);
  const [mode, setMode] = useState<UpsertBranchSupplySetting["mode"]>(setting?.mode ?? "on_demand");
  const [targets, setTargets] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      (setting?.weeklyTargets ?? []).map((target) => [
        target.weekday,
        storedQuantityToInput(target.targetQuantity),
      ]),
    ),
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setActive(setting?.active ?? false);
    setMode(setting?.mode ?? "on_demand");
    setTargets(
      Object.fromEntries(
        (setting?.weeklyTargets ?? []).map((target) => [
          target.weekday,
          storedQuantityToInput(target.targetQuantity),
        ]),
      ),
    );
  }, [
    setting?.id,
    setting?.updatedAt,
    setting?.active,
    setting?.mode,
    setting?.defaultUsagePurposeId,
    firstActivePurposeId,
  ]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const weeklyTargets =
      mode === "fixed"
        ? weekdays.flatMap(({ value }) => {
            const raw = targets[value]?.trim();
            if (!raw) return [];
            const targetQuantity = parseStoredQuantity(raw);
            return targetQuantity === null
              ? [{ weekday: value, targetQuantity: -1 }]
              : [{ weekday: value, targetQuantity }];
          })
        : [];
    if (!purposeId) {
      setError("Selecciona un propósito activo.");
      return;
    }
    if (weeklyTargets.some((target) => target.targetQuantity < 0)) {
      setError("Las metas deben ser cantidades válidas con máximo dos decimales.");
      return;
    }
    if (mode === "fixed" && weeklyTargets.length === 0) {
      setError("Agrega al menos una meta semanal para el modo fijo.");
      return;
    }

    try {
      await mutation.trigger({
        mode,
        defaultUsagePurposeId: purposeId,
        active,
        weeklyTargets,
      });
      await onSaved();
      setSaved(true);
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          { USAGE_PURPOSE_INACTIVE: "El propósito seleccionado está inactivo." },
          "No pudimos guardar la configuración.",
        ),
      );
    }
  }

  return (
    <Card className={!active ? "opacity-80" : undefined}>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{supply.name}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {supply.sku} · {supply.category.name} · {formatMoney(supply.unitCost)} /{" "}
            {supply.unit.symbol}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}
        >
          {active ? "Incluido en existencias" : "Fuera de existencias"}
        </span>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-4 accent-foreground"
            />
            Incluir artículo en las existencias de esta sucursal
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Modo de reposición
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as UpsertBranchSupplySetting["mode"])
                }
                className="h-10 rounded-lg border border-input bg-background px-3"
              >
                <option value="fixed">Fijo · sugerir stock</option>
                <option value="on_demand">Bajo demanda · editar manualmente</option>
              </select>
            </label>
          </div>

          {mode === "fixed" && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Stock objetivo por día</legend>
              <p className="text-xs text-muted-foreground">
                Stock que debe tener la sucursal cada día. Déjalo vacío si no aplica.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {weekdays.map(({ value, label }) => (
                  <label key={value} className="grid gap-1.5 text-xs font-medium">
                    {label} ({supply.unit.symbol})
                    <Input
                      inputMode="decimal"
                      placeholder="Sin stock objetivo"
                      value={targets[value] ?? ""}
                      onChange={(event) =>
                        setTargets((current) => ({ ...current, [value]: event.target.value }))
                      }
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="text-sm font-medium text-emerald-700">
              Configuración guardada.
            </p>
          )}
          {!supply.active && (
            <p className="text-xs text-amber-800">
              Este artículo está inactivo en el catálogo y no se incluirá en existencias aunque la
              configuración esté activa.
            </p>
          )}
          <Button
            type="submit"
            variant="default"
            disabled={mutation.isMutating || purposes.length === 0}
          >
            {mutation.isMutating ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar configuración
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
