import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Bell,
  Box,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  CircleHelp,
  ClipboardCheck,
  Layers,
  LogOut,
  Menu,
  Store,
  Tags,
  TriangleAlert,
  Truck,
  UsersRound,
  Warehouse,
  Sparkles,
  X,
} from "lucide-react";

import { useGetAuthMe, usePostAuthLogout } from "@/api/generated/authentication/authentication";
import { ApiError } from "@/api/http-client";
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
  path:
    | "/inventory"
    | "/inventory/review"
    | "/orders"
    | "/receipts"
    | "/transfers"
    | "/incidents"
    | "/analytics"
    | "/usage-purposes"
    | "/articles"
    | "/categories"
    | "/suppliers"
    | "/branches"
    | "/users";
  icon: ComponentType<{ className?: string }>;
};

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Análisis",
    items: [{ label: "Analítica", path: "/analytics", icon: ChartNoAxesCombined }],
  },
  {
    label: "Operación",
    items: [
      { label: "Existencias", path: "/inventory", icon: Layers },
      { label: "Bandeja", path: "/inventory/review", icon: Warehouse },
      { label: "Pedidos", path: "/orders", icon: Truck },
      { label: "Recepciones", path: "/receipts", icon: ClipboardCheck },
      { label: "Transferencias", path: "/transfers", icon: ArrowLeftRight },
      { label: "Incidencias", path: "/incidents", icon: TriangleAlert },
    ],
  },
  {
    label: "Administración",
    items: [
      { label: "Artículos", path: "/articles", icon: Boxes },
      { label: "Propósitos de uso", path: "/usage-purposes", icon: Sparkles },
      { label: "Categorías", path: "/categories", icon: Tags },
      { label: "Proveedores", path: "/suppliers", icon: Store },
      { label: "Sucursales", path: "/branches", icon: Building2 },
      { label: "Usuarios", path: "/users", icon: UsersRound },
    ],
  },
];

const routeLabels: Record<string, string> = {
  inventory: "Existencias",
  orders: "Pedidos",
  receipts: "Recepciones",
  transfers: "Transferencias",
  incidents: "Incidencias",
  analytics: "Analítica",
  "usage-purposes": "Propósitos de uso",
  articles: "Artículos",
  categories: "Categorías",
  suppliers: "Proveedores",
  branches: "Sucursales",
  users: "Usuarios",
};

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLoginPage = pathname === "/login";
  const currentUserQuery = useGetAuthMe<ApiError>({
    swr: { enabled: !isLoginPage, shouldRetryOnError: false },
  });
  const logout = usePostAuthLogout();
  const currentUser =
    currentUserQuery.data?.status === 200 ? currentUserQuery.data.data.data : undefined;
  const isUnauthenticated =
    currentUserQuery.error?.status === 401 ||
    (currentUserQuery.data !== undefined && currentUserQuery.data.status !== 200);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const routeSegment = pathname.split("/").filter(Boolean)[0] ?? "inventory";
  const currentLabel = pathname.startsWith("/inventory/review")
    ? "Bandeja"
    : (routeLabels[routeSegment] ?? "Flow");

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

  useEffect(() => {
    if (isLoginPage) return;
    if (isUnauthenticated) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (currentUser && !hasRouteAccess(currentUser.role, pathname)) {
      void navigate({ to: "/inventory", replace: true });
    }
  }, [currentUser, isUnauthenticated, isLoginPage, navigate, pathname]);

  if (isLoginPage) return <Outlet />;
  if (isUnauthenticated) return <Navigate to="/login" replace />;
  if (currentUserQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando sesión…
      </main>
    );
  }
  if (currentUserQuery.error && currentUserQuery.error.status !== 401) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="text-center">
          <p className="font-medium">No pudimos validar la sesión.</p>
          <Button className="mt-4" variant="outline" onClick={() => void currentUserQuery.mutate()}>
            Intentar de nuevo
          </Button>
        </div>
      </main>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;

  const visibleNavigationGroups = getNavigationGroups(currentUser.role);
  const userRoleLabel = getRoleLabel(currentUser.role);
  const userInitials = currentUser.userName.slice(0, 2).toUpperCase();

  async function handleLogout() {
    try {
      await logout.trigger();
    } finally {
      setIsNavigationOpen(false);
      void navigate({ to: "/login", replace: true });
    }
  }

  const visibleItems = visibleNavigationGroups.flatMap((group) => group.items);

  return (
    <div
      className={`min-h-screen bg-[#fbfbfc] transition-[padding] duration-200 ${
        isSidebarVisible ? "lg:pl-[232px]" : "lg:pl-16"
      }`}
    >
      {isSidebarVisible ? (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[232px] lg:flex">
          <SidebarContent pathname={pathname} groups={visibleNavigationGroups} />
        </aside>
      ) : (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-16 flex-col items-center gap-2 border-r border-white/10 bg-[#08080a] py-4 lg:flex">
          <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-white text-[#111113]">
            <Box className="size-4" strokeWidth={2} />
          </div>
          <nav aria-label="Navegación principal" className="flex flex-col items-center gap-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                    active
                      ? "bg-[#2b2b2e] text-white"
                      : "text-neutral-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="size-5" />
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

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
            className="relative h-full w-[min(232px,calc(100vw-48px))] shadow-2xl"
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
            <SidebarContent
              pathname={pathname}
              groups={visibleNavigationGroups}
              onNavigate={() => setIsNavigationOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="min-h-screen">
        <header className="sticky top-0 z-40 flex h-[64px] items-center justify-between gap-3 border-b bg-background/95 px-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Abrir navegación"
              className="lg:hidden"
              onClick={() => setIsNavigationOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={isSidebarVisible ? "Ocultar navegación" : "Mostrar navegación"}
              aria-expanded={isSidebarVisible}
              className="hidden lg:inline-flex"
              onClick={() => setIsSidebarVisible((visible) => !visible)}
            >
              <Menu className="size-5" />
            </Button>
            <Breadcrumb>
              <BreadcrumbList className="text-sm sm:text-base">
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink render={<Link to="/inventory" />}>Flow</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:inline-flex" />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="max-w-[160px] truncate font-semibold sm:max-w-none">
                    {currentLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon-lg" aria-label="Notificaciones" className="relative">
              <Bell className="size-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-foreground ring-2 ring-background" />
            </Button>
            <ProfileMenu
              userName={currentUser.userName}
              userRole={userRoleLabel}
              userInitials={userInitials}
              isLoggingOut={logout.isMutating}
              onLogout={() => void handleLogout()}
            />
          </div>
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

function isActivePath(pathname: string, path: NavigationItem["path"]) {
  return (
    pathname === path ||
    (path === "/inventory" &&
      pathname.startsWith("/inventory/") &&
      !pathname.startsWith("/inventory/review")) ||
    (path !== "/inventory" && pathname.startsWith(`${path}/`))
  );
}

function SidebarContent({
  pathname,
  groups,
  onNavigate,
}: {
  pathname: string;
  groups: Array<{ label: string; items: NavigationItem[] }>;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-[#08080a] text-neutral-400">
      <div className="flex h-[76px] items-center gap-3 px-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#111113]">
          <Box className="size-5" strokeWidth={2} />
        </div>
        <div>
          <p className="text-lg leading-6 font-semibold tracking-tight text-white">Flow</p>
          <p className="mt-1 text-[10px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
            Supply Manager
          </p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-neutral-600 uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(pathname, item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onNavigate}
                    className={`flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                      isActive
                        ? "bg-[#2b2b2e] font-medium text-white"
                        : "hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

function ProfileMenu({
  userName,
  userRole,
  userInitials,
  isLoggingOut,
  onLogout,
}: {
  userName: string;
  userRole: string;
  userInitials: string;
  isLoggingOut: boolean;
  onLogout: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Cuenta de ${userName}`}
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-muted sm:pr-3"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-[#1c1c1f] text-xs font-semibold text-white">
          {userInitials}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[140px] truncate text-sm font-semibold">{userName}</span>
          <span className="block text-xs text-muted-foreground">{userRole}</span>
        </span>
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border bg-popover shadow-lg"
        >
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={isLoggingOut}
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <LogOut className="size-4 text-muted-foreground" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getNavigationGroups(role: string) {
  if (role === "manager") {
    const managerPaths = new Set<NavigationItem["path"]>([
      "/inventory",
      "/receipts",
      "/transfers",
      "/incidents",
    ]);
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => managerPaths.has(item.path)),
      }))
      .filter((group) => group.items.length > 0);
  }

  if (role === "admin") {
    return navigationGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.path !== "/users") }))
      .filter((group) => group.items.length > 0);
  }

  return navigationGroups;
}

function getRoleLabel(role: string) {
  if (role === "manager") return "Gerente";
  if (role === "admin") return "Administrador";
  return "Super admin";
}

function hasRouteAccess(role: string, pathname: string) {
  if (role === "super_admin") return true;
  if (role === "admin") return !pathname.startsWith("/users");
  if (role === "manager") {
    return (
      pathname === "/inventory" ||
      pathname.startsWith("/inventory/counts/") ||
      pathname.startsWith("/receipts") ||
      pathname.startsWith("/transfers") ||
      pathname.startsWith("/incidents")
    );
  }
  return false;
}
