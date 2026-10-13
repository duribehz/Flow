import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  Ellipsis,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type CategoryId = "oils" | "grains" | "dry-goods" | "proteins" | "vegetables";
type SupplierId = "central-market" | "kitchen-supplies" | "gourmet-distributor" | "fresh-foods";
type StockStatus = "available" | "low-stock";
type UnitId = "liter" | "kilogram";

type CatalogItem = {
  id: string;
  name: string;
  code: string;
  category: CategoryId;
  supplier: SupplierId;
  stock: number;
  unit: UnitId;
  status: StockStatus;
};

const categoryLabels: Record<CategoryId, string> = {
  oils: "Aceites",
  grains: "Granos",
  "dry-goods": "Secos",
  proteins: "Proteínas",
  vegetables: "Verduras",
};

const supplierLabels: Record<SupplierId, string> = {
  "central-market": "Central de Abastos MX",
  "kitchen-supplies": "Insumos de Cocina Mayoreo",
  "gourmet-distributor": "Distribuidora Gourmet",
  "fresh-foods": "Alimentos Frescos del Centro",
};

const unitLabels: Record<UnitId, string> = {
  liter: "Litro",
  kilogram: "Kilogramo",
};

const statusLabels: Record<StockStatus, string> = {
  available: "Disponible",
  "low-stock": "Stock bajo",
};

const catalogItems: CatalogItem[] = [
  {
    id: "1",
    name: "Aceite vegetal",
    code: "COC-001",
    category: "oils",
    supplier: "central-market",
    stock: 24,
    unit: "liter",
    status: "available",
  },
  {
    id: "2",
    name: "Arroz blanco",
    code: "COC-002",
    category: "grains",
    supplier: "kitchen-supplies",
    stock: 38,
    unit: "kilogram",
    status: "available",
  },
  {
    id: "3",
    name: "Harina de trigo",
    code: "COC-003",
    category: "dry-goods",
    supplier: "gourmet-distributor",
    stock: 16,
    unit: "kilogram",
    status: "available",
  },
  {
    id: "4",
    name: "Pechuga de pollo",
    code: "COC-004",
    category: "proteins",
    supplier: "fresh-foods",
    stock: 8,
    unit: "kilogram",
    status: "low-stock",
  },
  {
    id: "5",
    name: "Jitomate saladet",
    code: "COC-005",
    category: "vegetables",
    supplier: "central-market",
    stock: 14,
    unit: "kilogram",
    status: "available",
  },
];

export function CatalogPage() {
  const [category, setCategory] = useState("all");
  const [supplier, setSupplier] = useState("all");

  const visibleItems = catalogItems.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (supplier === "all" || item.supplier === supplier),
  );

  return (
    <div className="min-h-screen border-l-[4px] border-foreground bg-[#fbfbfc]">
      <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b bg-background/95 px-5 backdrop-blur sm:px-9">
        <Breadcrumb>
          <BreadcrumbList className="text-base">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/" />}>Flow</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">Catálogo de artículos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex h-full items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="icon-lg" aria-label="Buscar">
            <Search className="size-6 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-lg" aria-label="Notificaciones" className="relative">
            <Bell className="size-6 text-muted-foreground" />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-foreground ring-2 ring-background" />
          </Button>
          <Separator orientation="vertical" className="mx-1 hidden max-h-11 sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-auto gap-3 px-1.5 py-1 sm:pr-2"
                  aria-label="Abrir menú de usuario"
                />
              }
            >
              <Avatar size="lg">
                <AvatarFallback className="font-semibold text-foreground">AG</AvatarFallback>
              </Avatar>
              <span className="hidden min-w-32 flex-col items-start md:flex">
                <span className="text-base leading-5 font-semibold">Andrea Gómez</span>
                <span className="text-sm font-normal text-muted-foreground">Administradora</span>
              </span>
              <ChevronDown className="hidden text-muted-foreground md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem>
                <UserRound />
                Mi perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1088px] px-5 py-10 sm:px-8 sm:py-11">
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Catálogo de artículos</h1>
            <p className="mt-2 text-base text-muted-foreground">
              Administra el inventario disponible para todas las sucursales.
            </p>
          </div>
          <Button className="h-[50px] w-full gap-3 px-5 text-base sm:w-auto">
            <Plus className="size-5" />
            Agregar artículo
          </Button>
        </div>

        <Card className="gap-0 py-0 shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:p-6">
            <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
              <SelectTrigger
                className="h-[50px] w-full px-4 text-base sm:w-[260px]"
                aria-label="Filtrar por categoría"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supplier} onValueChange={(value) => setSupplier(value ?? "all")}>
              <SelectTrigger
                className="h-[50px] w-full px-4 text-base sm:w-[320px]"
                aria-label="Filtrar por proveedor"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(supplierLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table className="min-w-[960px]">
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[50px] w-[210px] pl-7 text-xs font-semibold tracking-wide text-muted-foreground">
                  ARTÍCULO
                </TableHead>
                <TableHead className="w-[130px] text-xs font-semibold tracking-wide text-muted-foreground">
                  CATEGORÍA
                </TableHead>
                <TableHead className="w-[310px] text-xs font-semibold tracking-wide text-muted-foreground">
                  PROVEEDOR
                </TableHead>
                <TableHead className="w-[135px] text-xs font-semibold tracking-wide text-muted-foreground">
                  EXISTENCIAS
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold tracking-wide text-muted-foreground">
                  ESTADO
                </TableHead>
                <TableHead className="w-14 pr-5">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => (
                <TableRow key={item.id} className="h-[88px] hover:bg-transparent">
                  <TableCell className="pl-7">
                    <p className="text-base font-semibold">{item.name}</p>
                    <p className="mt-0.5 text-base text-muted-foreground">{item.code}</p>
                  </TableCell>
                  <TableCell className="text-base">{categoryLabels[item.category]}</TableCell>
                  <TableCell className="text-base text-muted-foreground">
                    {supplierLabels[item.supplier]}
                  </TableCell>
                  <TableCell className="text-base font-semibold">
                    {item.stock}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {unitLabels[item.unit]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex h-8 items-center rounded-full border bg-muted/70 px-3 text-sm font-semibold">
                      {statusLabels[item.status]}
                    </span>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Acciones para ${item.name}`}
                          />
                        }
                      >
                        <Ellipsis className="size-5 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive">
                          <Trash2 />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {visibleItems.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="h-[200px] text-center text-base text-muted-foreground"
                  >
                    No hay artículos que coincidan con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      <Button
        variant="outline"
        size="icon-lg"
        className="fixed right-3 bottom-3 z-50 rounded-full bg-background shadow-md"
        aria-label="Ayuda"
      >
        <CircleHelp className="size-5" />
      </Button>
    </div>
  );
}
