import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Plus, RefreshCw, Save, Search, Send, Trash2, X } from "lucide-react";

import { useGetBranchSupplySettings } from "@/api/generated/branch-supply-settings/branch-supply-settings";
import { useGetInventoryLastReports } from "@/api/generated/inventory/inventory";
import type {
  BranchSupplySetting,
  InventoryLastReport,
  ReplenishmentItem,
  Supply,
  UsagePurpose,
} from "@/api/generated/models";
import {
  useDeleteReplenishmentsReplenishmentIdItemsItemId,
  useGetReplenishmentsReplenishmentId,
  usePatchReplenishmentsReplenishmentId,
  usePatchReplenishmentsReplenishmentIdItemsItemId,
  usePostReplenishmentsReplenishmentIdItems,
  usePostReplenishmentsReplenishmentIdSubmit,
} from "@/api/generated/replenishments/replenishments";
import { useGetSupplies } from "@/api/generated/supplies/supplies";
import { useGetUsagePurposes } from "@/api/generated/usage-purposes/usage-purposes";
import { useGetReceipts } from "@/api/generated/receipts/receipts";
import { useGetShipments } from "@/api/generated/shipments/shipments";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  formatDateTime,
  formatMoney,
  formatStoredQuantity,
  parseStoredQuantity,
  storedQuantityToInput,
  todayIsoDate,
} from "@/lib/operational-format";

export function OrderDetailPage() {
  const { orderId } = useParams({ from: "/orders/$orderId" });
  const navigate = useNavigate();
  const detailQuery = useGetReplenishmentsReplenishmentId<ApiError>(orderId);
  const suppliesQuery = useGetSupplies<ApiError>();
  const purposesQuery = useGetUsagePurposes({ active: "true" });
  const notesMutation = usePatchReplenishmentsReplenishmentId(orderId);
  const addMutation = usePostReplenishmentsReplenishmentIdItems(orderId);
  const submitMutation = usePostReplenishmentsReplenishmentIdSubmit(orderId);
  const shipmentsQuery = useGetShipments<ApiError>();
  const receiptsQuery = useGetReceipts<ApiError>();
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState("");
  const [dirtyLineIds, setDirtyLineIds] = useState<Set<string>>(() => new Set());

  const order = detailQuery.data?.status === 200 ? detailQuery.data.data.data : undefined;
  const supplies = suppliesQuery.data?.status === 200 ? suppliesQuery.data.data.data : [];
  const purposes = purposesQuery.data?.status === 200 ? purposesQuery.data.data.data : [];
  const shipments = shipmentsQuery.data?.status === 200 ? shipmentsQuery.data.data.data : [];
  const receipts = receiptsQuery.data?.status === 200 ? receiptsQuery.data.data.data : [];
  const branchId =
    detailQuery.data?.status === 200 ? detailQuery.data.data.data.branch.id : undefined;
  const lastReportsQuery = useGetInventoryLastReports<ApiError>(
    { branchId: branchId ?? "" },
    { swr: { enabled: Boolean(branchId) } },
  );
  const settingsQuery = useGetBranchSupplySettings<ApiError>(branchId ?? "", {
    swr: { enabled: Boolean(branchId) },
  });
  const lastReports = lastReportsQuery.data?.status === 200 ? lastReportsQuery.data.data.data : [];
  const branchSettings = settingsQuery.data?.status === 200 ? settingsQuery.data.data.data : [];
  const shipment = shipments.find((candidate) => candidate.replenishmentRequestId === orderId);
  const receipt = shipment
    ? receipts.find((candidate) => candidate.shipmentId === shipment.id)
    : undefined;

  useEffect(() => {
    if (order) setNotes(order.notes ?? "");
  }, [order?.id, order?.notes]);

  async function runAction(action: () => Promise<unknown>) {
    setActionError("");
    try {
      await action();
      await detailQuery.mutate();
      return true;
    } catch (error) {
      setActionError(mutationErrorMessage(error));
      return false;
    }
  }

  async function handleSendOrder() {
    if (!order || hasUnsavedChanges) return;
    if (order.items.some((item) => item.requestedQuantity <= 0)) {
      setActionError("Corrige o elimina las partidas con cantidad cero antes de enviar el pedido.");
      return;
    }
    if (!window.confirm("¿Enviar el pedido e iniciar su recepción?")) return;
    setActionError("");
    try {
      await submitMutation.trigger({ businessDate: todayIsoDate() });
      await receiptsQuery.mutate();
      void navigate({ to: "/receipts" });
    } catch (error) {
      setActionError(mutationErrorMessage(error));
    }
  }

  if (detailQuery.isLoading || shipmentsQuery.isLoading || receiptsQuery.isLoading) {
    return (
      <CenteredState icon={<Loader2 className="size-5 animate-spin" />} text="Cargando pedido..." />
    );
  }

  if (detailQuery.error || shipmentsQuery.error || receiptsQuery.error || !order) {
    return (
      <CenteredState
        icon={<RefreshCw className="size-5" />}
        text={
          detailQuery.error?.status === 404
            ? "El pedido no existe o ya no está disponible."
            : "No pudimos cargar el pedido."
        }
        action={<Button onClick={() => void detailQuery.mutate()}>Intentar de nuevo</Button>}
      />
    );
  }

  const isDraft = order.status === "draft";
  const total = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const hasUnsavedChanges = notes.trim() !== (order.notes ?? "") || dirtyLineIds.size > 0;
  const zeroQuantityItems = order.items.filter((item) => item.requestedQuantity <= 0);
  const hasZeroQuantityItems = zeroQuantityItems.length > 0;

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Pedido de abastecimiento"
        title={order.requestNumber}
        description={`${order.branch.name} · Solicitado por ${order.requestedBy.userName}`}
        actions={
          <>
            <Button variant="outline" onClick={() => void navigate({ to: "/orders" })}>
              <ArrowLeft /> Volver
            </Button>
            {isDraft && (
              <Button
                disabled={
                  submitMutation.isMutating ||
                  order.items.length === 0 ||
                  hasUnsavedChanges ||
                  hasZeroQuantityItems
                }
                title={
                  hasUnsavedChanges
                    ? "Guarda los cambios antes de enviar"
                    : hasZeroQuantityItems
                      ? "Corrige o elimina las partidas con cantidad cero"
                      : undefined
                }
                onClick={() => void handleSendOrder()}
              >
                {submitMutation.isMutating ? <Loader2 className="animate-spin" /> : <Send />}
                Enviar pedido
              </Button>
            )}
          </>
        }
      />

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </p>
      )}
      {isDraft && hasUnsavedChanges && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Guarda las notas y cada partida modificada antes de enviar el pedido.
        </p>
      )}
      {isDraft && hasZeroQuantityItems && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-semibold">
            {zeroQuantityItems.length === 1
              ? "Hay una partida con cantidad cero."
              : `Hay ${zeroQuantityItems.length} partidas con cantidad cero.`}
          </p>
          <p className="mt-1">
            Corrige la cantidad o elimina{" "}
            {zeroQuantityItems.length === 1 ? "la partida" : "las partidas"} antes de enviar:{" "}
            {zeroQuantityItems.map((item) => item.supply.name).join(", ")}.
          </p>
        </div>
      )}
      {isDraft && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Al enviar, el pedido aparecerá directamente en Recepciones.
        </p>
      )}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Información general</CardTitle>
            <StatusBadge status={shipment?.status ?? order.status} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Sucursal" value={order.branch.name} />
          <Detail label="Creado" value={formatDateTime(order.createdAt)} />
          <Detail label="Enviado" value={formatDateTime(order.submittedAt)} />
          <div className="sm:col-span-2 lg:col-span-4">
            <label
              htmlFor="order-notes"
              className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Notas generales
            </label>
            {isDraft ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                <textarea
                  id="order-notes"
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  placeholder="Indicaciones para envío o recepción"
                  className="min-h-20 flex-1 resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <Button
                  variant="default"
                  disabled={notesMutation.isMutating || notes.trim() === (order.notes ?? "")}
                  onClick={() => {
                    const normalizedNotes = notes.trim();
                    void runAction(() =>
                      notesMutation.trigger({ notes: normalizedNotes || null }),
                    ).then((saved) => {
                      if (saved) setNotes(normalizedNotes);
                    });
                  }}
                >
                  {notesMutation.isMutating ? <Loader2 className="animate-spin" /> : <Save />}
                  Guardar notas
                </Button>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {order.notes || "Sin notas generales."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="order-lines-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="order-lines-title" className="text-xl font-semibold">
              Artículos solicitados
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Los costos son estimados con el costo unitario vigente.
            </p>
          </div>
          <p className="text-right text-sm text-muted-foreground">
            Total estimado
            <br />
            <strong className="text-xl text-foreground">{formatMoney(total)}</strong>
          </p>
        </div>

        {isDraft && (
          <AddLineForm
            supplies={supplies.filter((supply) => supply.active)}
            purposes={purposes}
            existingItems={order.items}
            lastReports={lastReports}
            settings={branchSettings}
            isLoading={suppliesQuery.isLoading || purposesQuery.isLoading}
            hasCatalogError={Boolean(suppliesQuery.error || purposesQuery.error)}
            isSubmitting={addMutation.isMutating}
            onAdd={(value) => runAction(() => addMutation.trigger(value))}
          />
        )}

        {order.items.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {isDraft
              ? "Agrega al menos un artículo antes de enviar el pedido."
              : "Este pedido no tiene artículos."}
          </Card>
        ) : (
          <div className="grid gap-3">
            {order.items.map((item) => (
              <OrderLine
                key={item.id}
                orderId={orderId}
                item={item}
                existingItems={order.items}
                purposes={purposes}
                editable={isDraft}
                hasInvalidQuantity={item.requestedQuantity <= 0}
                onChanged={async () => {
                  await detailQuery.mutate();
                }}
                onError={setActionError}
                onDirtyChange={(itemId, dirty) =>
                  setDirtyLineIds((current) => {
                    const next = new Set(current);
                    if (dirty) next.add(itemId);
                    else next.delete(itemId);
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      {shipment && shipment.status === "dispatched" && (
        <Card className="border-sky-200">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Pedido en recepción</CardTitle>
              <StatusBadge status={shipment.status} />
            </div>
          </CardHeader>
          <CardContent>
            {receipt ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Recepción {receipt.receiptNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Continúa registrando cantidades e incidencias.
                  </p>
                </div>
                <Button
                  variant="default"
                  onClick={() =>
                    void navigate({ to: "/receipts/$receiptId", params: { receiptId: receipt.id } })
                  }
                >
                  Abrir recepción
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                La recepción se está generando. Actualiza la página si no aparece en unos segundos.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {shipment?.status === "delivered" && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Flujo de pedido completado</p>
              <p className="text-sm text-muted-foreground">
                El envío fue recibido y las cantidades aceptadas se incorporaron al inventario.
              </p>
            </div>
            <StatusBadge status="delivered" />
          </CardContent>
        </Card>
      )}
    </PageFrame>
  );
}

function AddLineForm({
  supplies,
  purposes,
  existingItems,
  isLoading,
  hasCatalogError,
  isSubmitting,
  lastReports,
  settings,
  onAdd,
}: {
  supplies: Supply[];
  purposes: UsagePurpose[];
  existingItems: ReplenishmentItem[];
  isLoading: boolean;
  hasCatalogError: boolean;
  isSubmitting: boolean;
  lastReports: InventoryLastReport[];
  settings: BranchSupplySetting[];
  onAdd: (value: {
    supplyId: string;
    usagePurposeId: string;
    requestedQuantity: number;
  }) => Promise<boolean>;
}) {
  const [search, setSearch] = useState("");
  const [supplyId, setSupplyId] = useState("");
  const [purposeId, setPurposeId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");

  const normalizedSearch = search.trim().toLowerCase();
  const matches = normalizedSearch
    ? supplies
        .filter((supply) => `${supply.sku} ${supply.name}`.toLowerCase().includes(normalizedSearch))
        .slice(0, 8)
    : [];
  const selectedSupply = supplies.find((supply) => supply.id === supplyId);
  const report = selectedSupply
    ? lastReports.find((candidate) => candidate.supplyId === selectedSupply.id)
    : undefined;
  const setting = selectedSupply
    ? settings.find((candidate) => candidate.supplyId === selectedSupply.id)
    : undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const storedQuantity = parseStoredQuantity(quantity);
    if (!supplyId || !purposeId || storedQuantity === null || storedQuantity === 0) {
      setError(
        "Selecciona artículo y propósito, e ingresa una cantidad válida con hasta dos decimales.",
      );
      return;
    }
    if (
      existingItems.some((item) => item.supply.id === supplyId && item.usagePurposeId === purposeId)
    ) {
      setError("Ese artículo ya existe con el mismo propósito. Edita la partida existente.");
      return;
    }
    setError("");
    const wasAdded = await onAdd({
      supplyId,
      usagePurposeId: purposeId,
      requestedQuantity: storedQuantity,
    });
    if (wasAdded) {
      setQuantity("");
      setSearch("");
      setSupplyId("");
    }
  }

  const storedQuantity = parseStoredQuantity(quantity);
  const preview =
    selectedSupply && storedQuantity !== null
      ? Number((BigInt(selectedSupply.unitCost) * BigInt(storedQuantity) + 50n) / 100n)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar artículo</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 md:grid-cols-[2fr_1.4fr_1fr_auto] md:items-end"
        >
          <FormField label="Buscar artículo" htmlFor="new-supply-search">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-supply-search"
                autoComplete="off"
                placeholder="Nombre o SKU"
                className="pl-8"
                value={search}
                disabled={isLoading}
                onChange={(event) => {
                  setSearch(event.currentTarget.value);
                  setSupplyId("");
                }}
              />
            </div>
            {!selectedSupply && matches.length > 0 && (
              <ul className="mt-2 max-h-56 divide-y overflow-y-auto rounded-lg border bg-background">
                {matches.map((supply) => (
                  <li key={supply.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSupplyId(supply.id);
                        setSearch(`${supply.sku} · ${supply.name}`);
                      }}
                    >
                      <span className="font-medium">{supply.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {supply.sku} · {supply.unit.symbol}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!selectedSupply && normalizedSearch && matches.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Sin artículos con ese nombre.</p>
            )}
            {selectedSupply && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline"
                onClick={() => {
                  setSupplyId("");
                  setSearch("");
                }}
              >
                <X className="size-3" /> Cambiar artículo
              </button>
            )}
          </FormField>
          <FormField label="Propósito" htmlFor="new-purpose">
            <select
              id="new-purpose"
              value={purposeId}
              onChange={(e) => setPurposeId(e.currentTarget.value)}
              disabled={isLoading}
              className={selectClass}
            >
              <option value="">Seleccionar propósito</option>
              {purposes.map((purpose) => (
                <option key={purpose.id} value={purpose.id}>
                  {purpose.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Cantidad" htmlFor="new-quantity">
            <Input
              id="new-quantity"
              inputMode="decimal"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.currentTarget.value)}
              aria-describedby="new-line-help"
            />
          </FormField>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || supplies.length === 0 || purposes.length === 0}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} Agregar
          </Button>

          {selectedSupply && (
            <div className="grid gap-4 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2 md:col-span-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Último reporte de existencias
                </p>
                {report && report.closingQuantity !== null ? (
                  <p className="mt-1.5">
                    <strong>
                      {formatStoredQuantity(report.closingQuantity)} {selectedSupply.unit.symbol}
                    </strong>{" "}
                    · {formatReportDate(report.businessDate)}
                  </p>
                ) : (
                  <p className="mt-1.5">Sin reporte de existencias para este artículo</p>
                )}
                {report && report.currentQuantity !== null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stock actual estimado:{" "}
                    <strong className="text-foreground">
                      {formatStoredQuantity(report.currentQuantity)} {selectedSupply.unit.symbol}
                    </strong>{" "}
                    (incluye envíos y recepciones posteriores al reporte)
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Configuración de stock
                </p>
                {setting ? (
                  <>
                    <p className="mt-1.5">
                      {setting.mode === "fixed"
                        ? "Fijo · sugerir stock"
                        : "Bajo demanda · editar manualmente"}
                    </p>
                    {setting.mode === "fixed" && (
                      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {[...setting.weeklyTargets]
                          .sort((a, b) => a.weekday - b.weekday)
                          .map((target) => (
                            <li key={target.weekday}>
                              {weekdayShortNames[target.weekday]}{" "}
                              {formatStoredQuantity(target.targetQuantity)}{" "}
                              {selectedSupply.unit.symbol}
                            </li>
                          ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="mt-1.5">Sin configuración de stock en esta sucursal</p>
                )}
              </div>
            </div>
          )}

          <p id="new-line-help" className="text-xs text-muted-foreground md:col-span-3">
            {isLoading
              ? "Cargando artículos y propósitos..."
              : hasCatalogError
                ? "No pudimos cargar los artículos o propósitos. Actualiza la página para intentarlo de nuevo."
                : supplies.length === 0 || purposes.length === 0
                  ? "Se necesita al menos un artículo y un propósito activo para agregar líneas."
                  : "Hasta dos decimales."}
            {preview !== null && (
              <>
                {" "}
                Costo estimado: <strong>{formatMoney(preview)}</strong>.
              </>
            )}
          </p>
          {error && (
            <p role="alert" className="text-xs text-destructive md:col-span-4">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

const weekdayShortNames: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

function formatReportDate(businessDate: string) {
  return new Date(`${businessDate}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrderLine({
  orderId,
  item,
  existingItems,
  purposes,
  editable,
  hasInvalidQuantity,
  onChanged,
  onError,
  onDirtyChange,
}: {
  orderId: string;
  item: ReplenishmentItem;
  existingItems: ReplenishmentItem[];
  purposes: UsagePurpose[];
  editable: boolean;
  hasInvalidQuantity: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  onDirtyChange: (itemId: string, dirty: boolean) => void;
}) {
  const [purposeId, setPurposeId] = useState(item.usagePurposeId);
  const [quantity, setQuantity] = useState(storedQuantityToInput(item.requestedQuantity));
  const [validationError, setValidationError] = useState("");
  const updateMutation = usePatchReplenishmentsReplenishmentIdItemsItemId(orderId, item.id);
  const deleteMutation = useDeleteReplenishmentsReplenishmentIdItemsItemId(orderId, item.id);

  useEffect(() => {
    setPurposeId(item.usagePurposeId);
    setQuantity(storedQuantityToInput(item.requestedQuantity));
  }, [item.usagePurposeId, item.requestedQuantity]);

  async function updateLine() {
    const storedQuantity = parseStoredQuantity(quantity);
    if (!purposeId || storedQuantity === null || storedQuantity === 0) {
      setValidationError("Ingresa una cantidad válida con hasta dos decimales.");
      return;
    }
    if (
      existingItems.some(
        (candidate) =>
          candidate.id !== item.id &&
          candidate.supply.id === item.supply.id &&
          candidate.usagePurposeId === purposeId,
      )
    ) {
      setValidationError("Ese artículo ya existe con el mismo propósito.");
      return;
    }
    setValidationError("");
    onError("");
    try {
      await updateMutation.trigger({
        usagePurposeId: purposeId,
        requestedQuantity: storedQuantity,
      });
      onDirtyChange(item.id, false);
      await onChanged();
    } catch (error) {
      onError(mutationErrorMessage(error));
    }
  }

  async function removeLine() {
    onError("");
    try {
      await deleteMutation.trigger({});
      onDirtyChange(item.id, false);
      await onChanged();
    } catch (error) {
      onError(mutationErrorMessage(error));
    }
  }

  return (
    <Card className={hasInvalidQuantity ? "border-destructive/40 bg-destructive/5" : undefined}>
      <CardContent className="grid gap-4 pt-1 md:grid-cols-[2fr_1.3fr_1fr_1fr_auto] md:items-end">
        <div>
          <p className="font-semibold">{item.supply.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.supply.sku} · {item.category.name} · {formatMoney(item.unitCost)} /{" "}
            {item.unit.symbol}
          </p>
        </div>
        {editable ? (
          <FormField label="Propósito" htmlFor={`purpose-${item.id}`}>
            <select
              id={`purpose-${item.id}`}
              value={purposeId}
              onChange={(e) => {
                const nextPurposeId = e.currentTarget.value;
                setPurposeId(nextPurposeId);
                onDirtyChange(
                  item.id,
                  nextPurposeId !== item.usagePurposeId ||
                    quantity !== storedQuantityToInput(item.requestedQuantity),
                );
              }}
              className={selectClass}
            >
              {!purposes.some((purpose) => purpose.id === item.usagePurposeId) && (
                <option value={item.usagePurposeId}>{item.usagePurposeName}</option>
              )}
              {purposes.map((purpose) => (
                <option key={purpose.id} value={purpose.id}>
                  {purpose.name}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          <Detail label="Propósito" value={item.usagePurposeName} />
        )}
        {editable ? (
          <FormField label={`Cantidad (${item.unit.symbol})`} htmlFor={`quantity-${item.id}`}>
            <Input
              id={`quantity-${item.id}`}
              inputMode="decimal"
              value={quantity}
              onChange={(e) => {
                const nextQuantity = e.currentTarget.value;
                setQuantity(nextQuantity);
                onDirtyChange(
                  item.id,
                  purposeId !== item.usagePurposeId ||
                    nextQuantity !== storedQuantityToInput(item.requestedQuantity),
                );
              }}
            />
          </FormField>
        ) : (
          <Detail
            label={`Cantidad (${item.unit.symbol})`}
            value={formatStoredQuantity(item.requestedQuantity)}
          />
        )}
        <Detail label="Subtotal" value={formatMoney(item.lineTotal)} />
        {editable && (
          <div className="flex gap-2 md:justify-end">
            <Button
              size="icon"
              variant="default"
              aria-label={`Guardar ${item.supply.name}`}
              disabled={updateMutation.isMutating}
              onClick={() => void updateLine()}
            >
              {updateMutation.isMutating ? <Loader2 className="animate-spin" /> : <Save />}
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              aria-label={`Eliminar ${item.supply.name}`}
              disabled={deleteMutation.isMutating}
              onClick={() => void removeLine()}
            >
              {deleteMutation.isMutating ? <Loader2 className="animate-spin" /> : <Trash2 />}
            </Button>
          </div>
        )}
        {validationError && (
          <p role="alert" className="text-xs text-destructive md:col-span-5">
            {validationError}
          </p>
        )}
        {hasInvalidQuantity && !validationError && (
          <p role="alert" className="text-xs font-medium text-destructive md:col-span-5">
            La cantidad debe ser mayor que cero para poder enviar el pedido.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FormField({
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1.5 text-sm">{value}</p>
    </div>
  );
}

function CenteredState({
  icon,
  text,
  action,
}: {
  icon: React.ReactNode;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <PageFrame>
      <Card className="flex min-h-72 items-center justify-center p-8 text-center">
        <div>
          {<span className="mx-auto mb-3 flex justify-center text-muted-foreground">{icon}</span>}
          <p>{text}</p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </Card>
    </PageFrame>
  );
}

function mutationErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return getApiErrorMessage(
        error,
        {
          INVENTORY_DAY_CLOSED:
            "La fecha operativa de hoy está cerrada. No se puede iniciar la recepción.",
        },
        "El pedido cambió de estado. Actualiza la página e inténtalo de nuevo.",
      );
    }
    if (error.status === 400) {
      return getApiErrorMessage(
        error,
        {
          REPLENISHMENT_ITEMS_REQUIRE_POSITIVE_QUANTITY:
            "Corrige o elimina las partidas con cantidad cero antes de enviar el pedido.",
        },
        "Revisa la información capturada e inténtalo de nuevo.",
      );
    }
  }
  return "No pudimos guardar el cambio. Inténtalo de nuevo.";
}

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50";
