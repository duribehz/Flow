import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  open: "Abierto",
  closed: "Cerrado",
  draft: "En captura",
  submitted: "Enviado",
  reviewed: "Revisado",
  rejected: "Rechazado",
  fulfilled: "Completado",
  cancelled: "Cancelado",
  dispatched: "Despachado",
  delivered: "Entregado",
  pending: "Pendiente",
  in_progress: "En recepción",
  completed: "Completado",
  investigating: "En investigación",
  resolved: "Resuelto",
};

const tones: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  open: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  submitted: "bg-amber-50 text-amber-800 ring-amber-200",
  in_progress: "bg-violet-50 text-violet-700 ring-violet-200",
  dispatched: "bg-sky-50 text-sky-700 ring-sky-200",
  investigating: "bg-amber-50 text-amber-800 ring-amber-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  reviewed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  fulfilled: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[status] ?? "bg-neutral-100 text-neutral-700 ring-neutral-200",
      )}
    >
      {labels[status] ?? status.replaceAll("_", " ")}
    </span>
  );
}
