import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck } from "lucide-react";

import { useGetReceipts } from "@/api/generated/receipts/receipts";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { StatusBadge } from "@/components/operational/status-badge";
import { formatDate, formatDateTime } from "@/lib/operational-format";
import { EmptyState, ErrorState, LoadingState } from "./logistics-ui";

export function ReceiptsPage() {
  const navigate = useNavigate();
  const query = useGetReceipts<ApiError>();
  const receipts = query.data?.status === 200 ? query.data.data.data : [];

  return (
    <PageFrame>
      <PageHeader
        eyebrow="Logística"
        title="Recepciones"
        description="Registra la revisión física de los pedidos enviados y sus incidencias."
      />
      {query.isLoading && <LoadingState label="Cargando recepciones…" />}
      {!query.isLoading && query.error && (
        <ErrorState error={query.error} onRetry={() => void query.mutate()} />
      )}
      {!query.isLoading && !query.error && receipts.length === 0 && (
        <EmptyState
          title="Aún no hay recepciones"
          description="Las recepciones aparecerán aquí al enviar un pedido."
        />
      )}
      {!query.isLoading && !query.error && receipts.length > 0 && (
        <div className="grid gap-3">
          {receipts.map((receipt) => (
            <button
              key={receipt.id}
              type="button"
              className="group flex w-full flex-col gap-4 rounded-xl border bg-card p-5 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:justify-between"
              onClick={() =>
                void navigate({ to: "/receipts/$receiptId", params: { receiptId: receipt.id } })
              }
            >
              <span className="flex items-center gap-4">
                <span className="rounded-lg bg-muted p-2.5">
                  <ClipboardCheck className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{receipt.receiptNumber}</span>
                  <span className="text-sm text-muted-foreground">
                    {receipt.branch.name} · Fecha operativa {formatDate(receipt.businessDate)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Iniciada {formatDateTime(receipt.startedAt)}
                  </span>
                </span>
              </span>
              <span className="flex items-center justify-between gap-4 sm:justify-end">
                <StatusBadge status={receipt.status} />
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
