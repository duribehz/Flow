import { useState } from "react";
import { Plus, RefreshCw, Tags } from "lucide-react";

import { useGetCategories } from "@/api/generated/categories/categories";
import { useGetSupplies } from "@/api/generated/supplies/supplies";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCategoryDialog } from "./create-category-dialog";

export function CategoriesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, error, isLoading, mutate } = useGetCategories<ApiError>();
  const { data: suppliesData } = useGetSupplies<ApiError>();
  const categories = data?.data.data ?? [];
  const supplies = suppliesData?.data.data ?? [];

  return (
    <>
      <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Organiza los artículos del catálogo en categorías.
            </p>
          </div>
          <Button
            className="h-[50px] w-full gap-3 px-5 text-base sm:w-auto"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-5" />
            Agregar categoría
          </Button>
        </div>

        <Card className="gap-0 py-0 shadow-sm">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[50px] pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  CATEGORÍA
                </TableHead>
                <TableHead className="w-[180px] pr-7 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                  ARTÍCULOS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <LoadingRows />}
              {!isLoading && error && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <RefreshCw />
                        </EmptyMedia>
                        <EmptyTitle>No pudimos cargar las categorías</EmptyTitle>
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
                categories.length > 0 &&
                categories.map((category) => (
                  <TableRow key={category.id} className="h-[76px] hover:bg-transparent">
                    <TableCell className="pl-7 text-base font-semibold">{category.name}</TableCell>
                    <TableCell className="pr-7 text-right text-base text-muted-foreground">
                      {supplies.filter((supply) => supply.category.id === category.id).length}
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && categories.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={2} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Tags />
                        </EmptyMedia>
                        <EmptyTitle>No hay categorías</EmptyTitle>
                        <EmptyDescription>
                          Las categorías que registres aparecerán en este listado.
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
        <CreateCategoryDialog onClose={() => setIsCreateOpen(false)} onCreated={() => mutate()} />
      )}
    </>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <TableRow key={index} className="h-[76px] hover:bg-transparent">
      <TableCell className="pl-7" colSpan={2}>
        <div className="h-4 w-full max-w-[560px] animate-pulse rounded bg-muted" />
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
