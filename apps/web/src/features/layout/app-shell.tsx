import { useEffect, useState, type ComponentType } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Bell,
  Box,
  Boxes,
  Building2,
  CircleHelp,
  ClipboardList,
  FileChartColumn,
  Menu,
  Store,
  Truck,
  UsersRound,
  X,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

type NavigationItem = {
  label: string;
  path: "/reports" | "/inventory" | "/orders" | "/catalog" | "/suppliers" | "/branches" | "/users";
  icon: ComponentType<{ className?: string }>;
};

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Operación",
    items: [
      { label: "Reportes", path: "/reports", icon: ClipboardList },
      { label: "Existencias", path: "/inventory", icon: FileChartColumn },
      { label: "Pedidos", path: "/orders", icon: Truck },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Catálogo", path: "/catalog", icon: Boxes },
      { label: "Proveedores", path: "/suppliers", icon: Store },
      { label: "Sucursales", path: "/branches", icon: Building2 },
      { label: "Usuarios", path: "/users", icon: UsersRound },
    ],
  },
];

const routeLabels: Record<string, string> = {
  reports: "Reportes",
  inventory: "Existencias",
  orders: "Pedidos",
  catalog: "Catálogo de artículos",
  suppliers: "Proveedores",
  branches: "Sucursales",
  users: "Usuarios",
};

export function AppShell() {
  const { pathname } = useLocation();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const routeSegment = pathname.split("/").filter(Boolean)[0] ?? "reports";
  const currentLabel = routeLabels[routeSegment] ?? "Flow";

  useEffect(() => {
    if (!isNavigationOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNavigationOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isNavigationOpen]);

  return (
    <div className="min-h-screen bg-[#fbfbfc] lg:pl-[304px]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[304px] lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {isNavigationOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar navegación"
            className="absolute inset-0 bg-foreground/45 backdrop-blur-[1px]"
            onClick={() => setIsNavigationOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navegación principal"
            className="relative h-full w-[min(304px,calc(100vw-48px))] shadow-2xl"
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar navegación"
              className="absolute top-5 right-4 z-10 text-neutral-400 hover:bg-white/10 hover:text-white"
              onClick={() => setIsNavigationOpen(false)}
            >
              <X className="size-5" />
            </Button>
            <SidebarContent pathname={pathname} onNavigate={() => setIsNavigationOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-h-screen">
        <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Abrir navegación"
              className="lg:hidden"
              onClick={() => setIsNavigationOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList className="text-sm sm:text-base">
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink render={<Link to="/reports" />}>Flow</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:inline-flex" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="max-w-[190px] truncate font-semibold sm:max-w-none">
                    {currentLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <Button variant="ghost" size="icon-lg" aria-label="Notificaciones" className="relative">
            <Bell className="size-6 text-muted-foreground" />
            <span className="absolute top-2 right-2 size-1.5 rounded-full bg-foreground ring-2 ring-background" />
          </Button>
        </header>

        <Outlet />
      </div>

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

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-[#08080a] text-neutral-400">
      <div className="flex h-[108px] items-center gap-4 px-8">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#111113]">
          <Box className="size-6" strokeWidth={2} />
        </div>
        <div>
          <p className="text-[26px] leading-7 font-semibold tracking-tight text-white">Flow</p>
          <p className="mt-1 text-xs font-medium tracking-[0.22em] text-neutral-500 uppercase">
            Supply Manager
          </p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-6 py-3">
        {navigationGroups.map((group) => (
          <div key={group.label} className="mb-7">
            <p className="mb-2 px-4 text-xs font-semibold tracking-[0.2em] text-neutral-600 uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.path ||
                  (item.path === "/reports" && pathname.startsWith("/reports/"));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onNavigate}
                    className={`flex h-14 items-center gap-4 rounded-xl px-4 text-lg transition-colors ${
                      isActive
                        ? "bg-[#2b2b2e] font-medium text-white"
                        : "hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-8 py-7">
        <div className="flex items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#29292c] text-sm font-semibold text-white">
            DU
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">Dario Uribe</p>
            <p className="truncate text-sm text-neutral-500">Administrador</p>
          </div>
        </div>
      </div>
    </div>
  );
}
