import { useState } from "react";
import { Ellipsis, PackageOpen, Plus, RefreshCw, UsersRound } from "lucide-react";

import { useGetCategories } from "@/api/generated/categories/categories";
import { useGetSupplies } from "@/api/generated/supplies/supplies";
import { useGetSuppliers } from "@/api/generated/suppliers/suppliers";
import { useGetUnits } from "@/api/generated/units/units";
import type { Supply } from "@/api/generated/models";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ManageSuppliersDialog } from "./manage-suppliers-dialog";

type StatusFilter = "all" | "active" | "inactive";

export function ArticlesPage() {
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [managedSupply, setManagedSupply] = useState<Supply>();
  const {
    data: suppliesData,
    error: suppliesError,
    isLoading: suppliesLoading,
    mutate: mutateSupplies,
  } = useGetSupplies<ApiError>();
  const {
    data: categoriesData,
    error: categoriesError,
    isLoading: categoriesLoading,
    mutate: mutateCategories,
  } = useGetCategories<ApiError>();
  const {
    data: unitsData,
    error: unitsError,
    isLoading: unitsLoading,
    mutate: mutateUnits,
  } = useGetUnits<ApiError>();
  const {
    data: suppliersData,
    error: suppliersError,
    isLoading: suppliersLoading,
    mutate: mutateSuppliers,
  } = useGetSuppliers<ApiError>();
  const supplies = suppliesData?.data.data ?? [];
  const categories = categoriesData?.data.data ?? [];
  const units = (unitsData?.data.data ?? []).filter((unit) => unit.active);
  const suppliers = suppliersData?.data.data ?? [];
  const isLoading = suppliesLoading || categoriesLoading || unitsLoading || suppliersLoading;
  const error = suppliesError ?? categoriesError ?? unitsError ?? suppliersError;

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
            <h1 className="text-2xl font-semibold tracking-tight">Artículos</h1>
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
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:gap-5 sm:p-6">
            <div className="w-full sm:w-[280px]">
              <label
                htmlFor="catalog-category-filter"
                className="mb-2 block text-sm font-medium text-muted-foreground"
              >
                Categoría
              </label>
              <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "all")}>
                <SelectTrigger
                  id="catalog-category-filter"
                  className="h-[50px] w-full px-4 text-base"
                  aria-label="Filtrar por categoría"
                >
                  <SelectValue>
                    {categoryId === "all"
                      ? "Todas las categorías"
                      : categories.find((category) => category.id === categoryId)?.name}
                  </SelectValue>
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
            </div>

            <div className="w-full sm:w-[220px]">
              <label
                htmlFor="catalog-status-filter"
                className="mb-2 block text-sm font-medium text-muted-foreground"
              >
                Estado
              </label>
              <Select
                value={status}
                onValueChange={(value) => setStatus((value as StatusFilter | null) ?? "all")}
              >
                <SelectTrigger
                  id="catalog-status-filter"
                  className="h-[50px] w-full px-4 text-base"
                  aria-label="Filtrar por estado"
                >
                  <SelectValue>
                    {status === "all"
                      ? "Todos los estados"
                      : status === "active"
                        ? "Activos"
                        : "Inactivos"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table className="min-w-[1080px]">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[50px] w-[250px] pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  ARTÍCULO
                </TableHead>
                <TableHead className="w-[180px] text-xs font-semibold tracking-wide text-muted-foreground">
                  CATEGORÍA
                </TableHead>
                <TableHead className="w-[230px] text-xs font-semibold tracking-wide text-muted-foreground">
                  PROVEEDORES
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold tracking-wide text-muted-foreground">
                  UNIDAD
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold tracking-wide text-muted-foreground">
                  COSTO UNITARIO
                </TableHead>
                <TableHead className="w-[120px] text-xs font-semibold tracking-wide text-muted-foreground">
                  ESTADO
                </TableHead>
                <TableHead className="w-14 pr-5">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <LoadingRows />}
              {!isLoading && error && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <RefreshCw />
                        </EmptyMedia>
                        <EmptyTitle>No pudimos cargar el catálogo</EmptyTitle>
                        <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
                      </EmptyHeader>
                      <Button
                        variant="outline"
                        onClick={() =>
                          void Promise.all([
                            mutateSupplies(),
                            mutateCategories(),
                            mutateUnits(),
                            mutateSuppliers(),
                          ])
                        }
                      >
                        Intentar de nuevo
                      </Button>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                visibleSupplies.length > 0 &&
                visibleSupplies.map((supply) => (
                  <SupplyRow
                    key={supply.id}
                    supply={supply}
                    onManage={() => setManagedSupply(supply)}
                  />
                ))}
              {!isLoading && !error && visibleSupplies.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-[280px] p-6">
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
          units={units}
          suppliers={suppliers}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => mutateSupplies()}
          onUnitCreated={() => mutateUnits()}
        />
      )}

      {managedSupply && (
        <ManageSuppliersDialog
          supply={managedSupply}
          suppliers={suppliers}
          onClose={() => setManagedSupply(undefined)}
          onUpdated={() => mutateSupplies()}
        />
      )}
    </>
  );
}

function SupplyRow({ supply, onManage }: { supply: Supply; onManage: () => void }) {
  return (
    <TableRow className="h-[88px] hover:bg-transparent">
      <TableCell className="pl-7">
        <p className="text-base font-semibold">{supply.name}</p>
        <p className="mt-0.5 text-base text-muted-foreground">{supply.sku}</p>
      </TableCell>
      <TableCell className="text-base">{supply.category.name}</TableCell>
      <TableCell className="text-base text-muted-foreground">
        <span
          className="block max-w-[220px] truncate"
          title={supply.suppliers.map(({ name }) => name).join(", ")}
        >
          {supply.suppliers.map(({ name }) => name).join(", ")}
        </span>
      </TableCell>
      <TableCell className="text-base text-muted-foreground">
        {supply.unit.name} ({supply.unit.symbol})
      </TableCell>
      <TableCell className="text-base font-semibold">
        {new Intl.NumberFormat("es-MX").format(supply.unitCost)}
      </TableCell>
      <TableCell>
        <span className="inline-flex h-8 items-center rounded-full border bg-muted/70 px-3 text-sm font-semibold">
          {supply.active ? "Activo" : "Inactivo"}
        </span>
      </TableCell>
      <TableCell className="pr-5 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label={`Acciones para ${supply.name}`} />
            }
          >
            <Ellipsis className="size-5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onManage}>
              <UsersRound />
              Gestionar proveedores
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <TableRow key={index} className="h-[88px] hover:bg-transparent">
      <TableCell className="pl-7" colSpan={7}>
        <div className="h-4 w-full max-w-[720px] animate-pulse rounded bg-muted" />
      </TableCell>
    </TableRow>
  ));
}

function getErrorMessage(error: ApiError) {
  if (error.status >= 500) {
    return "El servidor no está disponible. Inténtalo de nuevo en unos momentos.";
  }

  return "Verifica tu conexión e inténtalo de nuevo.";
}
