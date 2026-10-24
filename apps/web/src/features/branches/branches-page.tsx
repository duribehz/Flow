import { useState } from "react";
import { Building2, Plus, RefreshCw } from "lucide-react";

import { useGetBranches } from "@/api/generated/branches/branches";
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
import { CreateBranchDialog } from "./create-branch-dialog";

export function BranchesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, error, isLoading, mutate } = useGetBranches<ApiError>();
  const branches = data?.data.data ?? [];

  return (
    <>
      <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sucursales</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Administra las sucursales donde opera la operación.
            </p>
          </div>
          <Button
            className="h-[50px] w-full gap-3 px-5 text-base sm:w-auto"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="size-5" />
            Agregar sucursal
          </Button>
        </div>

        <Card className="gap-0 py-0 shadow-sm">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[50px] pl-7 pr-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  SUCURSAL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <LoadingRows />}
              {!isLoading && error && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={1} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <RefreshCw />
                        </EmptyMedia>
                        <EmptyTitle>No pudimos cargar las sucursales</EmptyTitle>
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
                branches.length > 0 &&
                branches.map((branch) => (
                  <TableRow key={branch.id} className="h-[76px] hover:bg-transparent">
                    <TableCell className="pl-7 pr-7 text-base font-semibold">
                      {branch.name}
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && branches.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={1} className="h-[280px] p-6">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Building2 />
                        </EmptyMedia>
                        <EmptyTitle>No hay sucursales</EmptyTitle>
                        <EmptyDescription>
                          Las sucursales que registres aparecerán en este listado.
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
        <CreateBranchDialog onClose={() => setIsCreateOpen(false)} onCreated={() => mutate()} />
      )}
    </>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <TableRow key={index} className="h-[76px] hover:bg-transparent">
      <TableCell className="pl-7 pr-7" colSpan={1}>
        <div className="h-4 w-full max-w-[320px] animate-pulse rounded bg-muted" />
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
