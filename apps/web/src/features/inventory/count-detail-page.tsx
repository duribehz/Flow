import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, CircleAlert, Loader2, Plus, Save, Search, Send, X } from "lucide-react";

import { useGetBranches } from "@/api/generated/branches/branches";
import { useGetInventoryLastReports } from "@/api/generated/inventory/inventory";
import { useGetTransfers } from "@/api/generated/transfers/transfers";
import {
  useGetInventoryCountsCountId,
  useGetInventoryDaysDayId,
  usePatchInventoryCountsCountId,
  usePostInventoryCountsCountIdReview,
  usePostInventoryCountsCountIdSubmit,
} from "@/api/generated/inventory/inventory";
import { useGetSupplies } from "@/api/generated/supplies/supplies";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  formatDate,
  formatStoredQuantity,
  parseStoredQuantity,
  storedQuantityToInput,
} from "@/lib/operational-format";

export function CountDetailPage() {
  const { countId } = useParams({ from: "/inventory/counts/$countId" });
  const navigate = useNavigate();
  const countQuery = useGetInventoryCountsCountId<ApiError>(countId);
  const count = countQuery.data?.status === 200 ? countQuery.data.data.data : undefined;
  const dayQuery = useGetInventoryDaysDayId<ApiError>(count?.inventoryDayId ?? "", {
    swr: { enabled: Boolean(count) },
  });
  const lastReportsQuery = useGetInventoryLastReports<ApiError>(
    { branchId: count?.branchId ?? "" },
    { swr: { enabled: Boolean(count) } },
  );
  const suppliesQuery = useGetSupplies<ApiError>();
  const branchesQuery = useGetBranches<ApiError>();
  const updateCount = usePatchInventoryCountsCountId<ApiError>(countId);
  const submitCount = usePostInventoryCountsCountIdSubmit<ApiError>(countId);
  const reviewCount = usePostInventoryCountsCountIdReview<ApiError>(countId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [baselineValues, setBaselineValues] = useState<Record<string, string>>({});
  const [savingSupplyId, setSavingSupplyId] = useState<string>();
  const [notes, setNotes] = useState("");
  const [baselineNotes, setBaselineNotes] = useState("");
  const [formCountId, setFormCountId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [showQuantityValidation, setShowQuantityValidation] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addingSupplyId, setAddingSupplyId] = useState<string>();
  const pendingTransfersQuery = useGetTransfers<ApiError>({ direction: "sent", status: "pending" });

  useEffect(() => {
    if (!count || formCountId === count.id) return;
    const nextValues = Object.fromEntries(
      count.items.map((item) => [item.supplyId, storedQuantityToInput(item.closingQuantity)]),
    );
    setValues(nextValues);
    setBaselineValues(nextValues);
    setNotes(count.notes ?? "");
    setBaselineNotes(count.notes ?? "");
    setFormCountId(count.id);
  }, [count, formCountId]);

  const supplies = suppliesQuery.data?.data.data ?? [];
  const branches = branchesQuery.data?.data.data ?? [];
  const supplyById = new Map(supplies.map((supply) => [supply.id, supply]));
  const lastReports = lastReportsQuery.data?.status === 200 ? lastReportsQuery.data.data.data : [];
  const lastReportBySupply = new Map(lastReports.map((report) => [report.supplyId, report]));
  const branchName = branches.find((branch) => branch.id === count?.branchId)?.name;
  const day = dayQuery.data?.status === 200 ? dayQuery.data.data.data : undefined;
  const isDraft = count?.status === "draft";
  const parsedValues = count?.items.map((item) => ({
    supplyId: item.supplyId,
    value: values[item.supplyId] ?? "",
    quantity: values[item.supplyId]?.trim() ? parseStoredQuantity(values[item.supplyId]) : null,
  }));
  const invalidSupplyIds = new Set(
    parsedValues
      ?.filter((item) => item.value.trim() && item.quantity === null)
      .map((item) => item.supplyId),
  );
  const counted =
    parsedValues?.filter((item) => item.value.trim() && item.quantity !== null).length ?? 0;
  const total = count?.items.length ?? 0;
  const progress = total ? Math.round((counted / total) * 100) : 0;
  const loadError =
    countQuery.error ?? suppliesQuery.error ?? branchesQuery.error ?? dayQuery.error;
  const isBusy =
    updateCount.isMutating ||
    submitCount.isMutating ||
    reviewCount.isMutating ||
    savingSupplyId !== undefined;
  const notesDirty = notes.trim() !== baselineNotes.trim();
  const pendingOutgoing =
    pendingTransfersQuery.data?.status === 200 && count
      ? pendingTransfersQuery.data.data.data.filter(
          (transfer) => transfer.fromBranch.id === count.branchId,
        )
      : [];
  const normalizedSearch = search.trim().toLowerCase();
  const visibleItems = (count?.items ?? []).filter((item) => {
    if (!normalizedSearch) return true;
    const supply = supplyById.get(item.supplyId);
    return `${supply?.name ?? ""} ${supply?.sku ?? ""}`.toLowerCase().includes(normalizedSearch);
  });
  const addableSupplies = supplies.filter(
    (supply) =>
      supply.active &&
      !(count?.items ?? []).some((item) => item.supplyId === supply.id) &&
      `${supply.name} ${supply.sku}`.toLowerCase().includes(addSearch.trim().toLowerCase()),
  );

  function pendingFor(supplyId: string) {
    return pendingOutgoing.flatMap((transfer) =>
      transfer.items
        .filter((item) => item.supply.id === supplyId)
        .map((item) => ({
          key: `${transfer.id}-${item.id}`,
          toBranch: transfer.toBranch.name,
          quantity: item.quantity,
          unit: item.supply.unit.symbol,
        })),
    );
  }

  async function addSupply(supplyId: string) {
    setActionError(undefined);
    setAddingSupplyId(supplyId);
    try {
      await updateCount.trigger({ items: [{ supplyId, closingQuantity: null }] });
      await countQuery.mutate();
    } catch (error) {
      setActionError(getApiErrorMessage(error, {}, "No pudimos agregar el artículo."));
    } finally {
      setAddingSupplyId(undefined);
    }
  }

  function isRowDirty(supplyId: string) {
    return (values[supplyId] ?? "") !== (baselineValues[supplyId] ?? "");
  }

  async function saveRow(supplyId: string) {
    if (!count) return false;
    const raw = values[supplyId] ?? "";
    const quantity = raw.trim() ? parseStoredQuantity(raw) : null;
    if (raw.trim() && quantity === null) {
      setShowQuantityValidation(true);
      return false;
    }
    setActionError(undefined);
    setSaved(false);
    setSavingSupplyId(supplyId);
    try {
      await updateCount.trigger({ items: [{ supplyId, closingQuantity: quantity }] });
      setBaselineValues((current) => ({ ...current, [supplyId]: raw }));
      await Promise.all([countQuery.mutate(), lastReportsQuery.mutate()]);
      setSaved(true);
      return true;
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, {}, "No pudimos guardar esta existencia. Inténtalo de nuevo."),
      );
      return false;
    } finally {
      setSavingSupplyId(undefined);
    }
  }

  async function saveNotes() {
    if (!count) return;
    const normalizedNotes = notes.trim() || null;
    setActionError(undefined);
    setSaved(false);
    try {
      await updateCount.trigger({ notes: normalizedNotes });
      setBaselineNotes(notes);
      await countQuery.mutate();
      setSaved(true);
    } catch (error) {
      setActionError(getApiErrorMessage(error, {}, "No pudimos guardar las notas."));
    }
  }

  async function saveAllPending() {
    if (!count || !parsedValues) return false;
    if (invalidSupplyIds.size) {
      setShowQuantityValidation(true);
      return false;
    }
    const pending = parsedValues.filter((item) => isRowDirty(item.supplyId));
    if (pending.length === 0) return true;
    setActionError(undefined);
    try {
      await updateCount.trigger({
        items: pending.map((item) => ({ supplyId: item.supplyId, closingQuantity: item.quantity })),
      });
      setBaselineValues({ ...values });
      await Promise.all([countQuery.mutate(), lastReportsQuery.mutate()]);
      return true;
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, {}, "No pudimos guardar las existencias pendientes."),
      );
      return false;
    }
  }

  async function handleSubmit() {
    if (!window.confirm("¿Enviar estas existencias a revisión? Después ya no podrás editarlas.")) {
      return;
    }
    if (!(await saveAllPending())) return;
    if (notesDirty) await saveNotes();
    try {
      await submitCount.trigger();
      await countQuery.mutate();
    } catch (error) {
      setActionError(
        getApiErrorMessage(
          error,
          {
            INVENTORY_COUNT_INCOMPLETE:
              "Completa todos los artículos antes de enviar las existencias.",
          },
          "No pudimos enviar las existencias a revisión.",
        ),
      );
    }
  }

  async function handleReview() {
    if (!window.confirm("¿Marcar estas existencias como revisadas?")) return;
    setActionError(undefined);
    try {
      await reviewCount.trigger();
      await countQuery.mutate();
    } catch (error) {
      setActionError(getApiErrorMessage(error, {}, "No pudimos completar la revisión."));
    }
  }

  if (countQuery.isLoading) {
    return (
      <PageFrame>
        <div className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" /> Cargando existencias...
        </div>
      </PageFrame>
    );
  }

  if (loadError || !count) {
    return (
      <PageFrame>
        <Card className="items-center p-8 text-center">
          <CircleAlert className="size-8 text-destructive" />
          <h1 className="text-xl font-semibold">No pudimos cargar las existencias</h1>
          <p className="max-w-md text-muted-foreground">
            {getApiErrorMessage(
              loadError,
              {},
              "Las existencias no están disponibles o no tienes acceso.",
            )}
          </p>
          <Button variant="outline" onClick={() => void countQuery.mutate()}>
            Intentar de nuevo
          </Button>
        </Card>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeader
        eyebrow={day ? formatDate(day.businessDate) : "Existencias de inventario"}
        title={branchName ?? "Detalle de existencias"}
        description="Guarda cada artículo con su botón Guardar. Un campo vacío significa No contado; escribe 0 para registrar cero."
        actions={
          <>
            <Button variant="outline" onClick={() => void navigate({ to: "/inventory" })}>
              <ArrowLeft /> Existencias
            </Button>
            <StatusBadge status={count.status} />
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Progreso</span>
            <span className="tabular-nums text-muted-foreground">
              {counted} de {total} · {progress}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progreso de existencias"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={counted}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="items-title" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="items-title" className="text-lg font-semibold">
            Artículos
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar artículo en existencias"
                placeholder="Buscar por nombre o SKU"
                className="h-10 pl-8 sm:w-72"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
            </div>
            {isDraft && (
              <Button
                variant="default"
                disabled={isBusy}
                onClick={() => {
                  setIsAdding((open) => !open);
                  setAddSearch("");
                }}
              >
                {isAdding ? <X /> : <Plus />}
                {isAdding ? "Cerrar" : "Agregar artículo"}
              </Button>
            )}
          </div>
        </div>
        {isAdding && isDraft && (
          <Card className="space-y-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar artículo para agregar"
                placeholder="Buscar artículo que no está en existencias"
                className="h-10 pl-8"
                value={addSearch}
                onChange={(event) => setAddSearch(event.currentTarget.value)}
              />
            </div>
            <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border">
              {addableSupplies.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">
                  No hay artículos disponibles para agregar.
                </li>
              )}
              {addableSupplies.slice(0, 50).map((supply) => (
                <li key={supply.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{supply.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {supply.sku} · {supply.unit.symbol}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={isBusy || addingSupplyId !== undefined}
                    onClick={() => void addSupply(supply.id)}
                  >
                    {addingSupplyId === supply.id ? <Loader2 className="animate-spin" /> : <Plus />}
                    Agregar
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {count.items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Estas existencias no contienen artículos para registrar.
          </Card>
        ) : (
          <div className="grid gap-3">
            {visibleItems.map((item) => {
              const supply = supplyById.get(item.supplyId);
              const inputId = `quantity-${item.id}`;
              const value = values[item.supplyId] ?? "";
              const report = lastReportBySupply.get(item.supplyId);
              const unit = supply?.unit.symbol ?? "unidad";
              const dirty = isRowDirty(item.supplyId);
              const showItemError = invalidSupplyIds.has(item.supplyId) && showQuantityValidation;
              return (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-xl border bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(180px,0.8fr)_auto] lg:items-end"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {supply?.name ?? "Artículo no disponible"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {supply ? `${supply.sku} · ${supply.category.name}` : item.supplyId}
                    </p>
                    {pendingFor(item.supplyId).map((pending) => (
                      <p key={pending.key} className="mt-1 text-xs font-medium text-sky-700">
                        Enviado: {formatStoredQuantity(pending.quantity)} {pending.unit} a{" "}
                        {pending.toBranch} (pendiente)
                      </p>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Último reporte</p>
                      {report && report.closingQuantity !== null ? (
                        <>
                          <p className="mt-1 font-medium tabular-nums">
                            {formatStoredQuantity(report.closingQuantity)} {unit}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(report.businessDate)}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Sin reporte de existencias para este artículo
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stock actual</p>
                      {report && report.currentQuantity !== null ? (
                        <p
                          className="mt-1 font-semibold tabular-nums"
                          title="Último reporte más envíos y recepciones posteriores"
                        >
                          {formatStoredQuantity(report.currentQuantity)} {unit}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">Sin reporte</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Apertura</p>
                      <p className="mt-1 font-medium tabular-nums">
                        {displayQuantity(item.openingQuantity, supply?.unit.symbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Recibido</p>
                      <p className="mt-1 font-medium tabular-nums">
                        {displayQuantity(item.receivedQuantity, supply?.unit.symbol)}
                      </p>
                    </div>
                  </div>
                  <label htmlFor={inputId} className="grid gap-1.5 text-sm font-medium">
                    Cierre ({unit})
                    {isDraft ? (
                      <>
                        <Input
                          id={inputId}
                          inputMode="decimal"
                          placeholder="No contado"
                          value={value}
                          aria-invalid={showItemError}
                          aria-describedby={showItemError ? `${inputId}-error` : undefined}
                          onChange={(event) => {
                            const inputValue = event.currentTarget.value;
                            setSaved(false);
                            setShowQuantityValidation(false);
                            setValues((current) => ({
                              ...current,
                              [item.supplyId]: inputValue,
                            }));
                          }}
                        />
                        {showItemError && (
                          <span id={`${inputId}-error`} className="text-xs text-destructive">
                            Usa un número no negativo con máximo 2 decimales.
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="rounded-lg bg-muted px-3 py-2 tabular-nums">
                        {displayQuantity(item.closingQuantity)}
                      </p>
                    )}
                  </label>
                  {isDraft && (
                    <Button
                      variant="default"
                      className="bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-900 disabled:text-white/60 disabled:opacity-100"
                      disabled={!dirty || invalidSupplyIds.has(item.supplyId) || isBusy}
                      onClick={() => void saveRow(item.supplyId)}
                    >
                      {savingSupplyId === item.supplyId ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Save />
                      )}
                      Guardar
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <label htmlFor="count-notes" className="text-sm font-semibold">
          Notas generales
        </label>
        <textarea
          id="count-notes"
          value={notes}
          disabled={!isDraft}
          onChange={(event) => {
            setSaved(false);
            setNotes(event.currentTarget.value);
          }}
          maxLength={1000}
          rows={4}
          placeholder="Observaciones de existencias"
          className="mt-2 w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-muted/50"
        />
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm">
            {actionError && <span className="font-medium text-destructive">{actionError}</span>}
            {saved && !actionError && (
              <span className="font-medium text-emerald-700">Guardado.</span>
            )}
          </div>
          {isDraft && (
            <div className="flex flex-col gap-2 sm:flex-row">
              {notesDirty && (
                <Button variant="default" disabled={isBusy} onClick={() => void saveNotes()}>
                  <Save /> Guardar notas
                </Button>
              )}
              <Button
                variant="default"
                disabled={isBusy || invalidSupplyIds.size > 0}
                onClick={() => void handleSubmit()}
              >
                {submitCount.isMutating ? <Loader2 className="animate-spin" /> : <Send />}
                Enviar a revisión
              </Button>
            </div>
          )}
          {count.status === "submitted" && (
            <Button variant="default" disabled={isBusy} onClick={() => void handleReview()}>
              {reviewCount.isMutating ? <Loader2 className="animate-spin" /> : <Check />}
              Marcar como revisado
            </Button>
          )}
        </div>
      </section>
    </PageFrame>
  );
}

function displayQuantity(value: number | null | undefined, unit?: string) {
  if (value === null || value === undefined) return "—";
  return unit ? `${formatStoredQuantity(value)} ${unit}` : formatStoredQuantity(value);
}
