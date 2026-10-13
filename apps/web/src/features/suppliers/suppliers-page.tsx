import { useState } from "react";
import { Plus, RefreshCw, Truck } from "lucide-react";

import { useGetSuppliers } from "@/api/generated/suppliers/suppliers";
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
import { CreateSupplierDialog } from "./create-supplier-dialog";

export function SuppliersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, error, isLoading, mutate } = useGetSuppliers<ApiError>();
  const suppliers = data?.data.data ?? [];

  return (
    <>
      <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Proveedores</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Administra los proveedores que abastecen a tus sucursales.
            </p>
          </div>
          <Button
            className="h-[50px] w-full gap-3 px-5 text-base sm:w-auto"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-5" />
            Agregar proveedor
          </Button>
        </div>

        <Card className="gap-0 py-0 shadow-sm">
          <Table className="min-w-[680px]">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[50px] w-[300px] pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  NOMBRE
                </TableHead>
                <TableHead className="w-[190px] text-xs font-semibold tracking-wide text-muted-foreground">
                  TELÉFONO
                </TableHead>
                <TableHead className="pr-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  CORREO
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <LoadingRows />}
              {!isLoading && error && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <RefreshCw />
                        </EmptyMedia>
                        <EmptyTitle>No pudimos cargar los proveedores</EmptyTitle>
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
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="h-[76px] hover:bg-transparent">
                    <TableCell className="pl-7 text-base font-semibold">{supplier.name}</TableCell>
                    <TableCell className="text-base text-muted-foreground">
                      {supplier.phoneNumber ?? "No registrado"}
                    </TableCell>
                    <TableCell className="pr-7 text-base text-muted-foreground">
                      {supplier.email ?? "No registrado"}
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && suppliers.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Truck />
                        </EmptyMedia>
                        <EmptyTitle>No hay proveedores</EmptyTitle>
                        <EmptyDescription>
                          Los proveedores que registres aparecerán en este listado.
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
        <CreateSupplierDialog onClose={() => setIsCreateOpen(false)} onCreated={() => mutate()} />
      )}
    </>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <TableRow key={index} className="h-[76px] hover:bg-transparent">
      <TableCell className="pl-7" colSpan={3}>
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
