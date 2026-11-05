import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Save, X } from "lucide-react";

import { useGetIncidents, usePostIncidents } from "@/api/generated/incidents/incidents";
import type { IncidentType, ReceiptItem, UpdateReceiptItemCondition } from "@/api/generated/models";
import {
  useGetReceiptsReceiptId,
  usePatchReceiptsReceiptId,
  usePatchReceiptsReceiptIdItemsItemId,
  usePostReceiptsReceiptIdComplete,
} from "@/api/generated/receipts/receipts";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDate,
  formatStoredQuantity,
  parseStoredQuantity,
  storedQuantityToInput,
} from "@/lib/operational-format";
import {
  conditionLabels,
  EmptyState,
  ErrorState,
  fieldClassName,
  getErrorMessage,
  incidentTypeLabels,
  InlineMessage,
  LoadingState,
} from "./logistics-ui";

export function ReceiptDetailPage() {
  const { receiptId } = useParams({ from: "/receipts/$receiptId" });
  const navigate = useNavigate();
  const receiptQuery = useGetReceiptsReceiptId<ApiError>(receiptId);
  const incidentsQuery = useGetIncidents<ApiError>({ receiptId });
  const updateNotes = usePatchReceiptsReceiptId<ApiError>(receiptId);
  const complete = usePostReceiptsReceiptIdComplete<ApiError>(receiptId);
  const receipt = receiptQuery.data?.status === 200 ? receiptQuery.data.data.data : undefined;
  const incidents = incidentsQuery.data?.status === 200 ? incidentsQuery.data.data.data : [];
  const [notes, setNotes] = useState("");
  const [notesFeedback, setNotesFeedback] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [incidentDraft, setIncidentDraft] = useState<IncidentDraft>();

  useEffect(() => setNotes(receipt?.notes ?? ""), [receipt?.notes]);

  async function handleSaveNotes(event: React.FormEvent) {
    event.preventDefault();
    setNotesFeedback(undefined);
    try {
      await updateNotes.trigger({ notes: notes.trim() || null });
      await receiptQuery.mutate();
      setNotesFeedback("Notas guardadas.");
    } catch (error) {
      setNotesFeedback(getErrorMessage(error));
    }
  }

  async function handleComplete() {
    if (!receipt?.items.every((item) => item.checkedAt)) {
      setActionError("Guarda la revisión de todas las líneas antes de completar la recepción.");
      return;
    }
    setActionError(undefined);
    try {
      await complete.trigger();
      await receiptQuery.mutate();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  const isLoading = receiptQuery.isLoading || incidentsQuery.isLoading;
  const error = receiptQuery.error ?? incidentsQuery.error;
  const editable = receipt?.status === "in_progress" || receipt?.status === "pending";

  return (
    <PageFrame>
      <Button variant="ghost" className="w-fit" onClick={() => void navigate({ to: "/receipts" })}>
        <ArrowLeft /> Volver a recepciones
      </Button>
      {isLoading && <LoadingState label="Cargando recepción…" />}
      {!isLoading && error && (
        <ErrorState
          error={error}
          title="No pudimos cargar la recepción"
          onRetry={() => void Promise.all([receiptQuery.mutate(), incidentsQuery.mutate()])}
        />
      )}
      {!isLoading && !error && receipt && (
        <>
          <PageHeader
            eyebrow={receipt.receiptNumber}
            title={receipt.branch.name}
            description={`Fecha operativa ${formatDate(receipt.businessDate)} · ${receipt.items.length} líneas por revisar`}
            actions={<StatusBadge status={receipt.status} />}
          />
          {actionError && <InlineMessage>{actionError}</InlineMessage>}

          <Card>
            <CardHeader>
              <CardTitle>Notas de recepción</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleSaveNotes}>
                <label className="block text-sm font-medium" htmlFor="receipt-notes">
                  Observaciones generales
                </label>
                <textarea
                  id="receipt-notes"
                  className={`${fieldClassName} min-h-24 resize-y`}
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  disabled={!editable}
                  placeholder="Información relevante para la recepción"
                />
                <div className="flex flex-wrap items-center gap-3">
                  {editable && (
                    <Button type="submit" variant="outline" disabled={updateNotes.isMutating}>
                      {updateNotes.isMutating ? <Loader2 className="animate-spin" /> : <Save />}{" "}
                      Guardar notas
                    </Button>
                  )}
                  {notesFeedback && (
                    <span role="status" className="text-sm text-muted-foreground">
                      {notesFeedback}
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <section aria-labelledby="receipt-lines" className="space-y-4">
            <div>
              <h2 id="receipt-lines" className="text-lg font-semibold">
                Revisión de artículos
              </h2>
              <p className="text-sm text-muted-foreground">
                Las cantidades admiten hasta dos decimales.
              </p>
            </div>
            {receipt.items.map((item) => (
              <ReceiptItemEditor
                key={item.id}
                receiptId={receiptId}
                item={item}
                editable={editable}
                onSaved={() => receiptQuery.mutate()}
                onReport={setIncidentDraft}
              />
            ))}
          </section>

          <section aria-labelledby="incidents-title" className="space-y-4">
            <h2 id="incidents-title" className="text-lg font-semibold">
              Incidencias de esta recepción
            </h2>
            {incidents.length === 0 ? (
              <EmptyState
                title="Sin incidencias"
                description="No se han reportado problemas durante esta recepción."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {incidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    className="rounded-xl border bg-card p-5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    onClick={() =>
                      void navigate({
                        to: "/incidents/$incidentId",
                        params: { incidentId: incident.id },
                      })
                    }
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{incident.incidentNumber}</span>
                      <StatusBadge status={incident.status} />
                    </span>
                    <span className="mt-2 block text-sm font-medium">
                      {incidentTypeLabels[incident.type]}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                      {incident.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {editable && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold">Finalizar recepción</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Al completar, las cantidades recibidas en buen estado se incorporarán al
                    inventario.
                  </p>
                </div>
                <Button onClick={() => void handleComplete()} disabled={complete.isMutating}>
                  {complete.isMutating ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}{" "}
                  Completar recepción
                </Button>
              </CardContent>
            </Card>
          )}
          {incidentDraft && (
            <IncidentDialog
              receiptId={receiptId}
              draft={incidentDraft}
              onClose={() => setIncidentDraft(undefined)}
              onCreated={() => incidentsQuery.mutate()}
            />
          )}
        </>
      )}
    </PageFrame>
  );
}

function ReceiptItemEditor({
  receiptId,
  item,
  editable,
  onSaved,
  onReport,
}: {
  receiptId: string;
  item: ReceiptItem;
  editable: boolean;
  onSaved: () => Promise<unknown>;
  onReport: (draft: IncidentDraft) => void;
}) {
  const updateItem = usePatchReceiptsReceiptIdItemsItemId<ApiError>(receiptId, item.id);
  const [received, setReceived] = useState(storedQuantityToInput(item.receivedQuantity));
  const [condition, setCondition] = useState<UpdateReceiptItemCondition>(item.condition);
  const [feedback, setFeedback] = useState<string>();

  useEffect(() => {
    setReceived(storedQuantityToInput(item.receivedQuantity));
    setCondition(item.condition);
  }, [item]);

  async function saveLine() {
    const receivedQuantity = parseStoredQuantity(received);
    if (receivedQuantity == null) {
      setFeedback("Usa una cantidad válida con máximo dos decimales.");
      return false;
    }
    setFeedback(undefined);
    try {
      await updateItem.trigger({ receivedQuantity, condition });
      await onSaved();
      setFeedback("Línea guardada.");
      return true;
    } catch (error) {
      setFeedback(getErrorMessage(error));
      return false;
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    await saveLine();
  }

  async function handleReport() {
    const receivedQuantity = parseStoredQuantity(received);
    if (receivedQuantity == null || !(await saveLine())) return;
    onReport({
      itemId: item.id,
      itemName: item.supply.name,
    });
  }

  return (
    <Card className={item.checkedAt ? "border-emerald-200" : undefined}>
      <CardHeader className="border-b">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle>{item.supply.name}</CardTitle>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {item.supply.sku} · {item.usagePurposeName}
            </p>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Esperado: </span>
            <strong>{formatStoredQuantity(item.expectedQuantity)}</strong>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
          <QuantityInput
            label="Recibido"
            value={received}
            onChange={setReceived}
            disabled={!editable || condition === "not_arrived"}
          />
          <div>
            <label className="text-sm font-medium" htmlFor={`condition-${item.id}`}>
              Condición
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select
                id={`condition-${item.id}`}
                className={`${fieldClassName} h-9 flex-1`}
                value={condition}
                disabled={!editable}
                onChange={(event) => {
                  const nextCondition = event.target.value as UpdateReceiptItemCondition;
                  setCondition(nextCondition);
                  if (nextCondition === "not_arrived") setReceived("0");
                }}
              >
                {Object.entries(conditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {editable && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={updateItem.isMutating}
                  onClick={() => void handleReport()}
                >
                  <AlertTriangle /> Incidencia
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            {editable && (
              <Button type="submit" variant="outline" disabled={updateItem.isMutating}>
                {updateItem.isMutating ? <Loader2 className="animate-spin" /> : <Save />} Guardar
                línea
              </Button>
            )}
            {feedback && (
              <span role="status" className="text-sm text-muted-foreground">
                {feedback}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

type IncidentDraft = {
  itemId: string;
  itemName: string;
};

const incidentTypes = Object.keys(incidentTypeLabels) as IncidentType[];

function IncidentDialog({
  receiptId,
  draft,
  onClose,
  onCreated,
}: {
  receiptId: string;
  draft: IncidentDraft;
  onClose: () => void;
  onCreated: () => Promise<unknown>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createIncident = usePostIncidents<ApiError>();
  const [type, setType] = useState<IncidentType | "">("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!type || !description.trim()) return;
    setError(undefined);
    try {
      await createIncident.trigger({
        receiptId,
        receiptItemId: draft.itemId,
        type,
        description: description.trim(),
      });
      await onCreated();
      onClose();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="incident-dialog-title"
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-xl bg-background p-0 text-foreground shadow-xl ring-1 ring-foreground/10 backdrop:bg-foreground/35"
      onCancel={(event) => {
        event.preventDefault();
        if (!createIncident.isMutating) onClose();
      }}
    >
      <div className="flex items-start justify-between border-b px-6 py-5">
        <div>
          <h2 id="incident-dialog-title" className="flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="size-5" /> Registrar incidencia
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{draft.itemName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cerrar"
          disabled={createIncident.isMutating}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <form className="space-y-5 p-6" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="incident-type">
            Tipo de incidencia
          </label>
          <Select
            value={type}
            onValueChange={(value) => setType((value ?? "") as IncidentType | "")}
          >
            <SelectTrigger id="incident-type" className="h-11 w-full px-3">
              <SelectValue placeholder="Selecciona un tipo">
                {type ? incidentTypeLabels[type] : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {incidentTypes.map((incidentType) => (
                <SelectItem key={incidentType} value={incidentType}>
                  {incidentTypeLabels[incidentType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="block text-sm font-medium" htmlFor="incident-description">
          Descripción
        </label>
        <textarea
          id="incident-description"
          required
          maxLength={4000}
          className={`${fieldClassName} min-h-28 resize-y`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe lo ocurrido con esta partida"
        />
        {error && <InlineMessage>{error}</InlineMessage>}
        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={createIncident.isMutating}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createIncident.isMutating || !type || !description.trim()}
          >
            {createIncident.isMutating && <Loader2 className="animate-spin" />}
            Registrar incidencia
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function QuantityInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <Input
        className="mt-2"
        type="text"
        inputMode="decimal"
        required
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0.00"
      />
    </label>
  );
}
