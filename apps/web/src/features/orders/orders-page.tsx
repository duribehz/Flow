import { useNavigate } from "@tanstack/react-router";
import { ClipboardList, Loader2, RefreshCw } from "lucide-react";

import {
  useGetDraftReplenishments,
  useGetReplenishments,
} from "@/api/generated/replenishments/replenishments";
import { useGetShipments } from "@/api/generated/shipments/shipments";
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
import { formatDateTime } from "@/lib/operational-format";

type OrderSummary = {
  id: string;
  requestNumber: string;
  branch: { id: string; name: string };
  requestedBy: { id: string; userName: string };
  status: string;
  createdAt: string;
  shipmentNumber?: string;
};

export function OrdersPage() {
  const navigate = useNavigate();
  const draftsQuery = useGetDraftReplenishments<ApiError>();
  const submittedQuery = useGetReplenishments<ApiError>();
  const shipmentsQuery = useGetShipments<ApiError>();
  const drafts = draftsQuery.data?.status === 200 ? draftsQuery.data.data.data : [];
  const submitted = submittedQuery.data?.status === 200 ? submittedQuery.data.data.data : [];
  const shipments = shipmentsQuery.data?.status === 200 ? shipmentsQuery.data.data.data : [];
  const shipmentRequestIds = new Set(shipments.map((shipment) => shipment.replenishmentRequestId));

  const orders: OrderSummary[] = [
    ...drafts.map((order) => ({ ...order, requestedBy: order.requestedBy })),
    ...submitted
      .filter((order) => !shipmentRequestIds.has(order.id))
      .map((order) => ({ ...order, status: "submitted" })),
    ...shipments.map((shipment) => ({
      id: shipment.replenishmentRequestId,
      requestNumber: shipment.shipmentNumber,
      shipmentNumber: shipment.shipmentNumber,
      branch: shipment.branch,
      requestedBy: shipment.preparedBy,
      status: shipment.status,
      createdAt: shipment.createdAt,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const queries = [draftsQuery, submittedQuery, shipmentsQuery];
  const isLoading = queries.some((query) => query.isLoading);
  const error = queries.find((query) => query.error)?.error;

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Abastecimiento y logística"
        title="Pedidos"
        description="Consulta los pedidos enviados y su avance hasta la recepción."
      />

      {isLoading && (
        <Card className="flex min-h-64 items-center justify-center">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando pedidos...
          </p>
        </Card>
      )}

      {!isLoading && error && (
        <Card className="flex min-h-64 items-center justify-center p-6 text-center">
          <div>
            <RefreshCw className="mx-auto mb-3 size-6 text-muted-foreground" />
            <h2 className="font-semibold">No pudimos cargar los pedidos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.status >= 500
                ? "El servidor no está disponible. Inténtalo de nuevo más tarde."
                : "Verifica tu conexión y vuelve a intentarlo."}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => void Promise.all(queries.map((query) => query.mutate()))}
            >
              Intentar de nuevo
            </Button>
          </div>
        </Card>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <Card className="flex min-h-64 items-center justify-center p-6 text-center">
          <div>
            <ClipboardList className="mx-auto mb-3 size-7 text-muted-foreground" />
            <h2 className="font-semibold">No hay pedidos todavía</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Al enviar existencias, su pedido aparecerá aquí listo para completar y enviar.
            </p>
          </div>
        </Card>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <>
          <Card className="hidden gap-0 overflow-hidden py-0 shadow-sm md:flex">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PEDIDO</TableHead>
                  <TableHead>SUCURSAL</TableHead>
                  <TableHead>SOLICITÓ / ENVIÓ</TableHead>
                  <TableHead>ACTUALIZADO</TableHead>
                  <TableHead>ETAPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={`${order.id}-${order.status}`}
                    tabIndex={0}
                    className="h-18 cursor-pointer"
                    onClick={() =>
                      void navigate({ to: "/orders/$orderId", params: { orderId: order.id } })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
                      }
                    }}
                  >
                    <TableCell className="font-mono">
                      {order.shipmentNumber ?? order.requestNumber}
                    </TableCell>
                    <TableCell>{order.branch.name}</TableCell>
                    <TableCell>{order.requestedBy.userName}</TableCell>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 md:hidden">
            {orders.map((order) => (
              <button
                key={`${order.id}-${order.status}`}
                type="button"
                onClick={() =>
                  void navigate({ to: "/orders/$orderId", params: { orderId: order.id } })
                }
                className="rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono font-semibold">
                    {order.shipmentNumber ?? order.requestNumber}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-3 font-medium">{order.branch.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(order.createdAt)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </PageFrame>
  );
}
