import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, CircleAlert, Loader2, Save, Send } from "lucide-react";

import { useGetBranches } from "@/api/generated/branches/branches";
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
  const suppliesQuery = useGetSupplies<ApiError>();
  const branchesQuery = useGetBranches<ApiError>();
  const updateCount = usePatchInventoryCountsCountId<ApiError>(countId);
  const submitCount = usePostInventoryCountsCountIdSubmit<ApiError>(countId);
  const reviewCount = usePostInventoryCountsCountIdReview<ApiError>(countId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [baselineValues, setBaselineValues] = useState<Record<string, string>>({});
  const [touchedSupplyIds, setTouchedSupplyIds] = useState<Set<string>>(() => new Set());
  const [notes, setNotes] = useState("");
  const [baselineNotes, setBaselineNotes] = useState("");
  const [formCountId, setFormCountId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [showQuantityValidation, setShowQuantityValidation] = useState(false);
  const [saved, setSaved] = useState(false);

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
  const isBusy = updateCount.isMutating || submitCount.isMutating || reviewCount.isMutating;

  async function saveDraft() {
    if (!count || !parsedValues) return false;
    if (invalidSupplyIds.size) {
      setShowQuantityValidation(true);
      return false;
    }
    setActionError(undefined);
    setSaved(false);
    try {
      const items = parsedValues
        .filter((item) => item.value !== (baselineValues[item.supplyId] ?? ""))
        .map((item) => ({
          supplyId: item.supplyId,
          closingQuantity: item.quantity,
        }));
      const normalizedNotes = notes.trim() || null;
      const notesChanged = normalizedNotes !== (baselineNotes.trim() || null);
      if (items.length || notesChanged) {
        await updateCount.trigger({
          ...(notesChanged ? { notes: normalizedNotes } : {}),
          ...(items.length ? { items } : {}),
        });
      }
      setBaselineValues({ ...values });
      setBaselineNotes(notes);
      await countQuery.mutate();
      setSaved(true);
      return true;
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, {}, "No pudimos guardar el avance. Inténtalo de nuevo."),
      );
      return false;
    }
  }

  async function handleSubmit() {
    if (!window.confirm("¿Enviar este conteo a revisión? Después ya no podrás editarlo.")) return;
    if (!(await saveDraft())) return;
    try {
      await submitCount.trigger();
      await countQuery.mutate();
    } catch (error) {
      setActionError(
        getApiErrorMessage(
          error,
          { INVENTORY_COUNT_INCOMPLETE: "Completa todos los artículos antes de enviar el conteo." },
          "No pudimos enviar el conteo a revisión.",
        ),
      );
    }
  }

  async function handleReview() {
    if (!window.confirm("¿Marcar este conteo como revisado?")) return;
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
          <Loader2 className="animate-spin" /> Cargando conteo...
        </div>
      </PageFrame>
    );
  }

  if (loadError || !count) {
    return (
      <PageFrame>
        <Card className="items-center p-8 text-center">
          <CircleAlert className="size-8 text-destructive" />
          <h1 className="text-xl font-semibold">No pudimos cargar el conteo</h1>
          <p className="max-w-md text-muted-foreground">
            {getApiErrorMessage(loadError, {}, "El conteo no está disponible o no tienes acceso.")}
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
        eyebrow={day ? formatDate(day.businessDate) : "Conteo de inventario"}
        title={branchName ?? "Detalle de conteo"}
        description="Registra cada cantidad. Un campo vacío significa No contado; escribe 0 para registrar cero."
        actions={
          <>
            <Button variant="outline" onClick={() => void navigate({ to: "/inventory" })}>
              <ArrowLeft /> Inventario
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
            aria-label="Progreso del conteo"
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
        <p className="text-sm text-muted-foreground">
          Los cambios solo se envían al presionar Guardar avance.
        </p>
      </section>

      <section aria-labelledby="items-title" className="space-y-3">
        <h2 id="items-title" className="text-lg font-semibold">
          Artículos del snapshot
        </h2>
        {count.items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Este conteo no contiene artículos para registrar.
          </Card>
        ) : (
          <div className="grid gap-3">
            {count.items.map((item) => {
              const supply = supplyById.get(item.supplyId);
              const inputId = `quantity-${item.id}`;
              const value = values[item.supplyId] ?? "";
              const showItemError =
                invalidSupplyIds.has(item.supplyId) &&
                (showQuantityValidation || touchedSupplyIds.has(item.supplyId));
              return (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(150px,0.35fr)] sm:items-center sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {supply?.name ?? "Artículo no disponible"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {supply ? `${supply.sku} · ${supply.category.name}` : item.supplyId}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-5 text-sm sm:min-w-52">
                    <div>
                      <p className="text-xs text-muted-foreground">Apertura</p>
                      <p className="mt-1 font-medium tabular-nums">
                        {formatStoredQuantity(item.openingQuantity)} {supply?.unit.symbol}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Recibido</p>
                      <p className="mt-1 font-medium tabular-nums">
                        {formatStoredQuantity(item.receivedQuantity)} {supply?.unit.symbol}
                      </p>
                    </div>
                  </div>
                  <label htmlFor={inputId} className="grid gap-1.5 text-sm font-medium">
                    Cierre ({supply?.unit.symbol ?? "unidad"})
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
                            setTouchedSupplyIds((current) => {
                              const next = new Set(current);
                              next.delete(item.supplyId);
                              return next;
                            });
                            setValues((current) => ({
                              ...current,
                              [item.supplyId]: inputValue,
                            }));
                          }}
                          onBlur={() =>
                            setTouchedSupplyIds((current) => new Set(current).add(item.supplyId))
                          }
                        />
                        {showItemError && (
                          <span id={`${inputId}-error`} className="text-xs text-destructive">
                            Usa un número no negativo con máximo 2 decimales.
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="rounded-lg bg-muted px-3 py-2 tabular-nums">
                        {formatStoredQuantity(item.closingQuantity)}
                      </p>
                    )}
                  </label>
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
          placeholder="Observaciones del conteo"
          className="mt-2 w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-muted/50"
        />
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm">
            {actionError && <span className="font-medium text-destructive">{actionError}</span>}
            {saved && !actionError && (
              <span className="font-medium text-emerald-700">Avance guardado.</span>
            )}
          </div>
          {isDraft && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                disabled={isBusy || invalidSupplyIds.size > 0}
                onClick={() => void saveDraft()}
              >
                {updateCount.isMutating ? <Loader2 className="animate-spin" /> : <Save />}
                Guardar avance
              </Button>
              <Button
                disabled={isBusy || invalidSupplyIds.size > 0}
                onClick={() => void handleSubmit()}
              >
                {submitCount.isMutating ? <Loader2 className="animate-spin" /> : <Send />}
                Enviar a revisión
              </Button>
            </div>
          )}
          {count.status === "submitted" && (
            <Button disabled={isBusy} onClick={() => void handleReview()}>
              {reviewCount.isMutating ? <Loader2 className="animate-spin" /> : <Check />}
              Marcar como revisado
            </Button>
          )}
        </div>
      </section>
    </PageFrame>
  );
}
