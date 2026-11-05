import type { ReactNode } from "react";
import { AlertTriangle, Loader2, PackageOpen, RefreshCw } from "lucide-react";

import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const fieldClassName =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function LoadingState({ label = "Cargando información…" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 rounded-xl border bg-card text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "No pudimos cargar la información",
}: {
  error: ApiError;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <Card>
      <CardContent>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RefreshCw />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={onRetry}>
            Intentar de nuevo
          </Button>
        </Empty>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="min-h-56 rounded-xl border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PackageOpen />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function InlineMessage({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {children}
    </div>
  );
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const data = error.data as { message?: unknown } | null;
    if (typeof data?.message === "string") return data.message;
    if (error.status === 409) return "La operación ya fue realizada o el recurso cambió de estado.";
    if (error.status === 404) return "El recurso solicitado ya no está disponible.";
    if (error.status >= 500) return "El servidor no está disponible. Inténtalo de nuevo más tarde.";
  }

  return "No fue posible completar la operación. Verifica tu conexión e inténtalo de nuevo.";
}

export const incidentTypeLabels = {
  missing: "Faltante",
  damaged: "Dañado",
  excess: "Excedente",
  expired: "Caducado",
  incorrect: "Artículo incorrecto",
  other: "Otro",
} as const;

export const conditionLabels: Record<string, string> = {
  good: "Buen estado",
  damaged: "Dañado",
  expired: "Caducado",
  incorrect: "Incorrecto",
  not_arrived: "No llegó",
};

export const incidentStatusLabels: Record<string, string> = {
  open: "Abierto",
  investigating: "En investigación",
  resolved: "Resuelto",
  closed: "Cerrado",
};
