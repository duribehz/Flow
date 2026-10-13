import { useState } from "react";
import { PackageOpen, Plus, RefreshCw } from "lucide-react";

import { useGetSupplies } from "@/api/generated/supplies/supplies";
import type { Supply } from "@/api/generated/models";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateSupplyDialog } from "./create-supply-dialog";

type StatusFilter = "all" | "active" | "inactive";

export function CatalogPage() {
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, error, isLoading, mutate } = useGetSupplies<ApiError>();
  const supplies = data?.data.data ?? [];
  const categories = uniqueById(supplies.map((supply) => supply.category));
  const units = uniqueById(supplies.map((supply) => supply.unit));

  const visibleSupplies = supplies.filter(
    (supply) =>
      (categoryId === "all" || supply.category.id === categoryId) &&
      (status === "all" || supply.active === (status === "active")),
  );

  return (
    <>
      <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Catálogo de artículos</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Administra los artículos disponibles para todas las sucursales.
            </p>
          </div>
          <Button
            className="h-[50px] w-full gap-3 px-5 text-base sm:w-auto"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-5" />
            Agregar artículo
          </Button>
        </div>

        <Card className="gap-0 py-0 shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:p-6">
            <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "all")}>
              <SelectTrigger
                className="h-[50px] w-full px-4 text-base sm:w-[280px]"
                aria-label="Filtrar por categoría"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => setStatus((value as StatusFilter | null) ?? "all")}
            >
              <SelectTrigger
                className="h-[50px] w-full px-4 text-base sm:w-[220px]"
                aria-label="Filtrar por estado"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table className="min-w-[850px]">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[50px] w-[250px] pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  ARTÍCULO
                </TableHead>
                <TableHead className="w-[180px] text-xs font-semibold tracking-wide text-muted-foreground">
                  CATEGORÍA
                </TableHead>
                <TableHead className="w-[190px] text-xs font-semibold tracking-wide text-muted-foreground">
                  UNIDAD
                </TableHead>
                <TableHead className="w-[170px] text-xs font-semibold tracking-wide text-muted-foreground">
                  COSTO UNITARIO
                </TableHead>
                <TableHead className="w-[130px] pr-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  ESTADO
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <LoadingRows />}
              {!isLoading && error && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <RefreshCw />
                        </EmptyMedia>
                        <EmptyTitle>No pudimos cargar el catálogo</EmptyTitle>
                        <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
                      </EmptyHeader>
                      <Button variant="outline" onClick={() => void mutate()}>
                        Intentar de nuevo
                      </Button>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                visibleSupplies.length > 0 &&
                visibleSupplies.map((supply) => <SupplyRow key={supply.id} supply={supply} />)}
              {!isLoading && !error && visibleSupplies.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <PackageOpen />
                        </EmptyMedia>
                        <EmptyTitle>
                          {supplies.length === 0 ? "No hay artículos" : "No encontramos resultados"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {supplies.length === 0
                            ? "Los artículos que registres aparecerán en este catálogo."
                            : "No hay artículos que coincidan con los filtros seleccionados."}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {isCreateOpen && (
        <CreateSupplyDialog
          categories={categories}
          units={units.map((unit) => ({ ...unit, detail: unit.symbol }))}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => mutate()}
        />
      )}
    </>
  );
}

function SupplyRow({ supply }: { supply: Supply }) {
  return (
    <TableRow className="h-[88px] hover:bg-transparent">
      <TableCell className="pl-7">
        <p className="text-base font-semibold">{supply.name}</p>
        <p className="mt-0.5 text-base text-muted-foreground">{supply.sku}</p>
      </TableCell>
      <TableCell className="text-base">{supply.category.name}</TableCell>
      <TableCell className="text-base text-muted-foreground">
        {supply.unit.name} ({supply.unit.symbol})
      </TableCell>
      <TableCell className="text-base font-semibold">
        {new Intl.NumberFormat("es-MX").format(supply.unitCost)}
      </TableCell>
      <TableCell className="pr-7">
        <span className="inline-flex h-8 items-center rounded-full border bg-muted/70 px-3 text-sm font-semibold">
          {supply.active ? "Activo" : "Inactivo"}
        </span>
      </TableCell>
    </TableRow>
  );
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <TableRow key={index} className="h-[88px] hover:bg-transparent">
      <TableCell className="pl-7" colSpan={5}>
        <div className="h-4 w-full max-w-[720px] animate-pulse rounded bg-muted" />
      </TableCell>
    </TableRow>
  ));
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values()).sort((a, b) =>
    "name" in a && "name" in b && typeof a.name === "string" && typeof b.name === "string"
      ? a.name.localeCompare(b.name, "es")
      : 0,
  );
}

function getErrorMessage(error: ApiError) {
  if (error.status >= 500) {
    return "El servidor no está disponible. Inténtalo de nuevo en unos momentos.";
  }

  return "Verifica tu conexión e inténtalo de nuevo.";
}
