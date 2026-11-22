import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2, Plus, RefreshCw, Send, X } from "lucide-react";

import { useGetAuthMe } from "@/api/generated/authentication/authentication";
import { useGetInventorySupplies } from "@/api/generated/inventory/inventory";
import {
  useGetTransferBranches,
  useGetTransfers,
  usePostTransfers,
  usePostTransfersTransferIdAccept,
  usePostTransfersTransferIdCancel,
} from "@/api/generated/transfers/transfers";
import type { Transfer } from "@/api/generated/models";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  formatDate,
  formatDateTime,
  formatStoredQuantity,
  parseStoredQuantity,
  todayIsoDate,
} from "@/lib/operational-format";

type TransferDirection = "sent" | "received";

export function TransfersPage() {
  const [direction, setDirection] = useState<TransferDirection>("sent");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const currentUserQuery = useGetAuthMe<ApiError>();
  const branchesQuery = useGetTransferBranches<ApiError>();
  const suppliesQuery = useGetInventorySupplies<ApiError>();
  const transfersQuery = useGetTransfers({ direction }, { swr: { revalidateOnFocus: true } });
  const currentUser =
    currentUserQuery.data?.status === 200 ? currentUserQuery.data.data.data : null;
  const branches = branchesQuery.data?.status === 200 ? branchesQuery.data.data.data : [];
  const supplies =
    suppliesQuery.data?.status === 200
      ? suppliesQuery.data.data.data.filter((item) => item.active)
      : [];
  const transfers = transfersQuery.data?.status === 200 ? transfersQuery.data.data.data : [];
  const isLoading =
    currentUserQuery.isLoading ||
    branchesQuery.isLoading ||
    suppliesQuery.isLoading ||
    transfersQuery.isLoading;
  const loadError =
    currentUserQuery.error ?? branchesQuery.error ?? suppliesQuery.error ?? transfersQuery.error;

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Operación"
        title="Transferencias"
        description="Envía artículos a otra sucursal o acepta las transferencias que llegaron a la tuya."
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus /> Enviar transferencia
          </Button>
        }
      />

      <div className="flex w-fit gap-1 rounded-xl border bg-card p-1">
        <Button
          variant={direction === "sent" ? "secondary" : "ghost"}
          onClick={() => setDirection("sent")}
        >
          Enviadas
        </Button>
        <Button
          variant={direction === "received" ? "secondary" : "ghost"}
          onClick={() => setDirection("received")}
        >
          Recibidas
        </Button>
      </div>

      {isLoading && (
        <Card className="p-8 text-center text-muted-foreground">Cargando transferencias…</Card>
      )}
      {!isLoading && loadError && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <p>No pudimos cargar las transferencias.</p>
          <Button
            variant="outline"
            onClick={() =>
              void Promise.all([
                currentUserQuery.mutate(),
                branchesQuery.mutate(),
                suppliesQuery.mutate(),
                transfersQuery.mutate(),
              ])
            }
          >
            <RefreshCw /> Intentar de nuevo
          </Button>
        </Card>
      )}
      {!isLoading && !loadError && transfers.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          {direction === "sent"
            ? "Aún no hay transferencias enviadas."
            : "No hay transferencias recibidas para mostrar."}
        </Card>
      )}
      {!isLoading && !loadError && transfers.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Número</TableHead>
                <TableHead>{direction === "sent" ? "Destino" : "Origen"}</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead>Artículos</TableHead>
                <TableHead className="hidden lg:table-cell">Responsable</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TransferCard
                  key={transfer.id}
                  transfer={transfer}
                  direction={direction}
                  currentBranchId={
                    currentUser?.role === "manager" ? currentUser.branch?.id : undefined
                  }
                  onAccepted={() => transfersQuery.mutate()}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {isCreateOpen && currentUser && (
        <CreateTransferDialog
          branches={branches}
          supplies={supplies}
          user={currentUser}
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            setDirection("sent");
            await transfersQuery.mutate();
          }}
        />
      )}
    </PageFrame>
  );
}

function TransferCard({
  transfer,
  direction,
  currentBranchId,
  onAccepted,
}: {
  transfer: Transfer;
  direction: TransferDirection;
  currentBranchId?: string;
  onAccepted: () => Promise<unknown>;
}) {
  // Managers only accept transfers whose destination is their own branch.
  const canAccept =
    direction === "received" &&
    transfer.status === "pending" &&
    (!currentBranchId || transfer.toBranch.id === currentBranchId);
  const canCancel = direction === "sent" && transfer.status === "pending";
  const accept = usePostTransfersTransferIdAccept<ApiError>(transfer.id);
  const cancel = usePostTransfersTransferIdCancel<ApiError>(transfer.id);
  const [error, setError] = useState("");
  const otherBranch = direction === "sent" ? transfer.toBranch : transfer.fromBranch;

  async function handleAccept() {
    setError("");
    try {
      await accept.trigger({ businessDate: todayIsoDate() });
      await onAccepted();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          {
            INVENTORY_COUNT_IN_PROGRESS:
              "Acepta la transferencia antes de iniciar las existencias.",
            INVENTORY_DAY_CLOSED: "El día de existencias ya está cerrado.",
            TRANSFER_ALREADY_ACCEPTED: "Esta transferencia ya fue aceptada.",
          },
          "No pudimos aceptar la transferencia.",
        ),
      );
    }
  }

  async function handleCancel() {
    if (!window.confirm("¿Cancelar este envío? El stock regresará a la sucursal origen.")) return;
    setError("");
    try {
      await cancel.trigger();
      await onAccepted();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          { TRANSFER_NOT_PENDING: "Solo se pueden cancelar envíos pendientes." },
          "No pudimos cancelar el envío.",
        ),
      );
    }
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-mono font-semibold">{transfer.transferNumber}</TableCell>
        <TableCell>{otherBranch.name}</TableCell>
        <TableCell className="hidden md:table-cell">
          {formatDate(transfer.sentBusinessDate)}
        </TableCell>
        <TableCell className="min-w-0">
          <ul className="space-y-0.5 text-sm">
            {transfer.items.map((item) => (
              <li key={item.id}>
                {item.supply.name} · {formatStoredQuantity(item.quantity)} {item.supply.unit.symbol}
              </li>
            ))}
          </ul>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
          {transfer.sentBy.userName}
          {transfer.acceptedBy && ` · acepta ${transfer.acceptedBy.userName}`}
          <span className="block text-xs">{formatDateTime(transfer.sentAt)}</span>
        </TableCell>
        <TableCell>
          <StatusBadge status={transfer.status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {canAccept && (
              <Button size="sm" disabled={accept.isMutating} onClick={() => void handleAccept()}>
                {accept.isMutating ? <Loader2 className="animate-spin" /> : <Check />}
                Aceptar
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={cancel.isMutating}
                onClick={() => void handleCancel()}
              >
                {cancel.isMutating ? <Loader2 className="animate-spin" /> : null}
                Cancelar
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {error && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="text-sm font-medium text-destructive">
            {error}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function CreateTransferDialog({
  branches,
  supplies,
  user,
  onClose,
  onCreated,
}: {
  branches: Array<{ id: string; name: string }>;
  supplies: Array<{
    id: string;
    sku: string;
    name: string;
    active: boolean;
    category: { name: string };
    unit: { symbol: string };
  }>;
  user: { role: string; branch: { id: string; name: string } | null };
  onClose: () => void;
  onCreated: () => Promise<unknown>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const create = usePostTransfers<ApiError>();
  const isManager = user.role === "manager";
  const [fromBranchId, setFromBranchId] = useState(user.branch?.id ?? "");
  const [toBranchId, setToBranchId] = useState("");
  const [selectedSupplyId, setSelectedSupplyId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [items, setItems] = useState<Array<{ supplyId: string; quantity: number }>>([]);
  const [supplySearch, setSupplySearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  const availableSupplies = supplies.filter(
    (supply) => supply.active && !items.some((item) => item.supplyId === supply.id),
  );
  const normalizedSupplySearch = supplySearch.trim().toLowerCase();
  const matchingSupplies = availableSupplies.filter((supply) =>
    `${supply.name} ${supply.sku}`.toLowerCase().includes(normalizedSupplySearch),
  );

  function addLine() {
    const parsedQuantity = parseStoredQuantity(quantity);
    if (!selectedSupplyId || parsedQuantity === null || parsedQuantity <= 0) {
      setError("Selecciona un artículo e ingresa una cantidad mayor a cero.");
      return;
    }
    setItems((current) => [...current, { supplyId: selectedSupplyId, quantity: parsedQuantity }]);
    setSelectedSupplyId("");
    setQuantity("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isManager && !fromBranchId) {
      setError("Selecciona la sucursal de origen.");
      return;
    }
    if (!toBranchId || toBranchId === fromBranchId) {
      setError("Selecciona una sucursal destino diferente.");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un artículo a la transferencia.");
      return;
    }

    try {
      await create.trigger({
        ...(isManager ? {} : { fromBranchId }),
        toBranchId,
        businessDate: todayIsoDate(),
        items,
      });
      await onCreated();
      onClose();
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          {
            INVENTORY_COUNT_IN_PROGRESS: "Envía la transferencia antes de iniciar las existencias.",
            INVENTORY_DAY_CLOSED: "El día de existencias ya está cerrado.",
            SUPPLY_NOT_AVAILABLE: "Uno de los artículos ya no está disponible.",
          },
          "No pudimos enviar la transferencia.",
        ),
      );
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-transfer-title"
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl bg-background p-0 text-foreground shadow-xl ring-1 ring-foreground/10 backdrop:bg-foreground/35"
      onCancel={(event) => {
        event.preventDefault();
        if (!create.isMutating) onClose();
      }}
    >
      <div className="flex items-start justify-between border-b px-6 py-5">
        <div>
          <h2 id="create-transfer-title" className="text-xl font-semibold">
            Enviar transferencia
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            La sucursal destino recibirá los artículos para aceptarlos.
          </p>
        </div>
        <Button
          type="button"
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
        {!isManager && (
          <label className="grid gap-2 text-sm font-medium">
            Sucursal de origen
            <select
              required
              value={fromBranchId}
              onChange={(event) => setFromBranchId(event.currentTarget.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {isManager && (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            Sucursal de origen: <span className="font-semibold">{user.branch?.name}</span>
          </p>
        )}
        <label className="grid gap-2 text-sm font-medium">
          Enviar a
          <select
            required
            value={toBranchId}
            onChange={(event) => setToBranchId(event.currentTarget.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Selecciona una sucursal</option>
            {branches
              .filter((branch) => branch.id !== fromBranchId)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>
        </label>

        <div className="space-y-3 rounded-xl border p-4">
          <h3 className="text-sm font-semibold">Artículos</h3>
          <Input
            type="search"
            aria-label="Buscar artículo a transferir"
            placeholder="Buscar por nombre o SKU"
            value={supplySearch}
            onChange={(event) => {
              setSupplySearch(event.currentTarget.value);
              setSelectedSupplyId("");
            }}
            className="h-9"
          />
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
            <select
              aria-label="Artículo a transferir"
              value={selectedSupplyId}
              onChange={(event) => setSelectedSupplyId(event.currentTarget.value)}
              className="h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">
                {matchingSupplies.length === 0
                  ? "Sin artículos con esa búsqueda"
                  : "Selecciona un artículo"}
              </option>
              {matchingSupplies.map((supply) => (
                <option key={supply.id} value={supply.id}>
                  {supply.name} · {supply.sku}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              aria-label="Cantidad a transferir"
              placeholder="Cantidad"
              value={quantity}
              onChange={(event) => setQuantity(event.currentTarget.value)}
              className="h-9"
            />
            <Button type="button" size="sm" variant="default" onClick={addLine}>
              <Plus /> Agregar
            </Button>
          </div>
          {items.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {items.map((item) => {
                const supply = supplies.find((candidate) => candidate.id === item.supplyId);
                return (
                  <li
                    key={item.supplyId}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {supply?.name ?? item.supplyId}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatStoredQuantity(item.quantity)} {supply?.unit.symbol}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Quitar ${supply?.name ?? "artículo"}`}
                      onClick={() =>
                        setItems((current) =>
                          current.filter((line) => line.supplyId !== item.supplyId),
                        )
                      }
                    >
                      <X />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={create.isMutating} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isMutating || items.length === 0}>
            {create.isMutating ? <Loader2 className="animate-spin" /> : <Send />}
            {create.isMutating ? "Enviando…" : "Enviar transferencia"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
