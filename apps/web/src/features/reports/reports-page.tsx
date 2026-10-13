import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

type Report = {
  id: string;
  name: string;
  branch: string;
  date: string;
  articleCount: number;
  status: "open" | "closed";
};

const reports: Report[] = [];
const statusLabels: Record<Report["status"], string> = {
  open: "Abierto",
  closed: "Cerrado",
};

export function ReportsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const visibleReports = reports.filter((report) => {
    const matchesQuery = `${report.name} ${report.branch}`
      .toLocaleLowerCase("es")
      .includes(query.toLocaleLowerCase("es"));
    const matchesStatus = status === "all" || report.status === status;

    return matchesQuery && matchesStatus;
  });

  return (
    <main className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:px-8 sm:py-12">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Consulta las existencias, movimientos y necesidades de stock de tus sucursales.
        </p>
      </div>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar reporte o sucursal"
              aria-label="Buscar reportes"
              className="h-12 pl-10 text-base md:text-base"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value ?? "all")}>
            <SelectTrigger className="h-12 w-full px-4 text-base sm:w-56">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="open">Abiertos</SelectItem>
              <SelectItem value="closed">Cerrados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table className="min-w-[760px]">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                REPORTE
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                SUCURSAL
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                FECHA
              </TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-muted-foreground">
                ARTÍCULOS
              </TableHead>
              <TableHead className="pr-7 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                ESTADO
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleReports.map((report) => (
              <TableRow
                key={report.id}
                tabIndex={0}
                className="h-[76px] cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/reports/$reportId",
                    params: { reportId: report.id },
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void navigate({
                      to: "/reports/$reportId",
                      params: { reportId: report.id },
                    });
                  }
                }}
              >
                <TableCell className="pl-7 font-medium">{report.name}</TableCell>
                <TableCell>{report.branch}</TableCell>
                <TableCell>{report.date}</TableCell>
                <TableCell>{report.articleCount}</TableCell>
                <TableCell className="pr-7 text-right">{statusLabels[report.status]}</TableCell>
              </TableRow>
            ))}
            {visibleReports.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-[330px] p-6">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <FileText />
                      </EmptyMedia>
                      <EmptyTitle>No hay reportes</EmptyTitle>
                      <EmptyDescription>
                        {query || status !== "all"
                          ? "No encontramos reportes que coincidan con los filtros seleccionados."
                          : "Los reportes generados aparecerán en este listado."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-4 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">0–0</span> de 0 reportes
          </p>
          <Pagination className="mx-0 w-auto justify-start sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text=""
                  aria-disabled="true"
                  tabIndex={-1}
                  className="pointer-events-none opacity-50"
                  onClick={(event) => event.preventDefault()}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text=""
                  aria-disabled="true"
                  tabIndex={-1}
                  className="pointer-events-none opacity-50"
                  onClick={(event) => event.preventDefault()}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Card>
    </main>
  );
}
