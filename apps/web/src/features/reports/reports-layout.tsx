import { Link, Outlet } from "@tanstack/react-router";
import { Bell, ChevronDown, CircleHelp, Search, Settings, UserRound } from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export function ReportsLayout() {
  return (
    <div className="min-h-screen border-l-[3px] border-foreground bg-[#fbfbfc]">
      <header className="sticky top-0 z-40 flex h-[92px] items-center justify-between border-b bg-background/95 px-5 backdrop-blur sm:px-9">
        <Breadcrumb>
          <BreadcrumbList className="text-base">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/" />}>Flow</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">Reportes</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex h-full items-center gap-1 sm:gap-3">
          <Button variant="ghost" size="icon-lg" aria-label="Buscar">
            <Search className="size-6 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon-lg" aria-label="Notificaciones">
            <Bell className="size-6 text-muted-foreground" />
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
              <span className="hidden min-w-32 flex-col items-start sm:flex">
                <span className="text-base font-semibold leading-5">Andrea Gómez</span>
                <span className="text-sm font-normal text-muted-foreground">Administradora</span>
              </span>
              <ChevronDown className="hidden text-muted-foreground sm:block" />
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

      <Outlet />

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
