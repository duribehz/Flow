import { useState } from "react";
import { Building2, MessageSquareText, PackageOpen, Search, Truck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Article = {
  id: string;
  name: string;
  code: string;
  category: string;
  initial: number;
  received: number;
  shift: number;
  final: number;
  unit: string;
};

type Comment = {
  id: string;
  initials: string;
  author: string;
  time: string;
  content: string;
};

const articles: Article[] = [];
const comments: Comment[] = [];

export function ReportDetailPage() {
  const [branch, setBranch] = useState("centro-historico");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const visibleArticles = articles.filter((article) => {
    const matchesQuery = `${article.name} ${article.code} ${article.category}`
      .toLocaleLowerCase("es")
      .includes(query.toLocaleLowerCase("es"));
    const matchesCategory = category === "all" || article.category === category;

    return matchesQuery && matchesCategory;
  });

  return (
    <main className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:px-8 sm:py-11">
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reporte de cocina</h1>
          <p className="mt-2 max-w-xl text-base leading-6 text-muted-foreground">
            Consulta las existencias, movimientos y necesidades de stock por artículo.
          </p>
        </div>
        <Button
          className="h-12 w-full gap-3 text-base lg:w-[408px]"
          title="Disponible próximamente"
        >
          <Truck className="size-5" />
          Crear pedido a partir de este reporte
        </Button>
      </div>

      <Card className="gap-0 py-0 shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-end">
          <div className="flex items-end gap-4 lg:flex-1">
            <div className="hidden size-[50px] shrink-0 items-center justify-center rounded-xl bg-muted sm:flex">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0 flex-1 lg:max-w-[260px]">
              <label className="mb-2 block text-sm text-muted-foreground" htmlFor="report-branch">
                Sucursal del reporte
              </label>
              <Select
                value={branch}
                onValueChange={(value) => setBranch(value ?? "centro-historico")}
              >
                <SelectTrigger id="report-branch" className="h-[50px] w-full px-4 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centro-historico">Centro Histórico</SelectItem>
                  <SelectItem value="roma-norte">Roma Norte</SelectItem>
                  <SelectItem value="condesa">Condesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative lg:w-[360px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar artículo, código o categoría"
              aria-label="Buscar artículos"
              className="h-[50px] pl-11 text-base md:text-base"
            />
          </div>

          <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
            <SelectTrigger className="h-[50px] w-full px-4 text-base lg:w-[220px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Aceites">Aceites</SelectItem>
              <SelectItem value="Granos">Granos</SelectItem>
              <SelectItem value="Proteínas">Proteínas</SelectItem>
              <SelectItem value="Verduras">Verduras</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table className="min-w-[900px]">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12 pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                ARTÍCULO
              </TableHead>
              <TableHead className="text-right text-xs font-semibold tracking-wide text-muted-foreground">
                CANTIDAD INICIAL
              </TableHead>
              <TableHead className="text-right text-xs font-semibold tracking-wide text-muted-foreground">
                CANTIDAD RECIBIDA
              </TableHead>
              <TableHead className="text-right text-xs font-semibold tracking-wide text-muted-foreground">
                CANTIDAD EN TURNO
              </TableHead>
              <TableHead className="pr-7 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                CANTIDAD FINAL
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleArticles.map((article) => (
              <TableRow key={article.id} className="h-[91px]">
                <TableCell className="pl-7">
                  <div className="flex items-center gap-4">
                    <div className="flex size-[50px] items-center justify-center rounded-xl bg-muted">
                      <PackageOpen className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{article.name}</p>
                      <p className="text-muted-foreground">
                        {article.code} · {article.category}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {article.initial} <span className="text-muted-foreground">{article.unit}</span>
                </TableCell>
                <TableCell className="text-right">
                  {article.received} <span className="text-muted-foreground">{article.unit}</span>
                </TableCell>
                <TableCell className="text-right">
                  {article.shift} <span className="text-muted-foreground">{article.unit}</span>
                </TableCell>
                <TableCell className="pr-7 text-right font-semibold">
                  {article.final}{" "}
                  <span className="font-normal text-muted-foreground">{article.unit}</span>
                </TableCell>
              </TableRow>
            ))}
            {visibleArticles.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-[260px] p-6">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <PackageOpen />
                      </EmptyMedia>
                      <EmptyTitle>No hay artículos en este reporte</EmptyTitle>
                      <EmptyDescription>
                        {query || category !== "all"
                          ? "No encontramos artículos que coincidan con los filtros seleccionados."
                          : "Los artículos registrados para esta sucursal aparecerán aquí."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-4 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">0–0</span> de 0 artículos
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

      <Card className="mt-8 gap-0 py-0 shadow-sm">
        <CardHeader className="px-7 pt-8 pb-5">
          <CardTitle className="text-2xl font-semibold">Comentarios del reporte</CardTitle>
          <CardDescription className="mt-1 text-base">
            Notas registradas por la sucursal y el equipo administrativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7">
          {comments.length > 0 ? (
            <div>
              {comments.map((comment, index) => (
                <div key={comment.id}>
                  {index > 0 && <Separator />}
                  <div className="flex gap-4 py-5">
                    <Avatar>
                      <AvatarFallback className="font-medium text-foreground">
                        {comment.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {comment.author}{" "}
                        <span className="ml-1 font-normal text-muted-foreground">
                          {comment.time}
                        </span>
                      </p>
                      <p className="mt-2 text-base text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty className="min-h-48 border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquareText />
                </EmptyMedia>
                <EmptyTitle>No hay comentarios</EmptyTitle>
                <EmptyDescription>
                  Las notas de la sucursal y del equipo administrativo aparecerán aquí.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
