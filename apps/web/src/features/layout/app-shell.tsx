import { useEffect, useState, type ComponentType } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Bell,
  Box,
  Boxes,
  Building2,
  CircleHelp,
  ClipboardCheck,
  FileChartColumn,
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
    items: [{ label: "Analítica", path: "/analytics", icon: FileChartColumn }],
  },
  {
    label: "Operación",
    items: [
      { label: "Existencias", path: "/inventory", icon: FileChartColumn },
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
  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando sesión…
      </main>
    );
  }

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

  return (
    <div
      className={`min-h-screen bg-[#fbfbfc] transition-[padding] duration-200 ${
        isSidebarVisible ? "lg:pl-[248px]" : "lg:pl-0"
      }`}
    >
      {isSidebarVisible && (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] lg:flex">
          <SidebarContent
            pathname={pathname}
            groups={visibleNavigationGroups}
            userName={currentUser.userName}
            userRole={userRoleLabel}
            userInitials={userInitials}
            isLoggingOut={logout.isMutating}
            onLogout={() => void handleLogout()}
          />
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
            className="relative h-full w-[min(248px,calc(100vw-48px))] shadow-2xl"
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
              userName={currentUser.userName}
              userRole={userRoleLabel}
              userInitials={userInitials}
              isLoggingOut={logout.isMutating}
              onNavigate={() => setIsNavigationOpen(false)}
              onLogout={() => void handleLogout()}
            />
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

function SidebarContent({
  pathname,
  groups,
  userName,
  userRole,
  userInitials,
  isLoggingOut,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  groups: Array<{ label: string; items: NavigationItem[] }>;
  userName: string;
  userRole: string;
  userInitials: string;
  isLoggingOut: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-[#08080a] text-neutral-400">
      <div className="flex h-[92px] items-center gap-3 px-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#111113]">
          <Box className="size-5" strokeWidth={2} />
        </div>
        <div>
          <p className="text-xl leading-6 font-semibold tracking-tight text-white">Flow</p>
          <p className="mt-1 text-[10px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
            Supply Manager
          </p>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-4 py-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-neutral-600 uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.path ||
                  (item.path === "/inventory" &&
                    pathname.startsWith("/inventory/") &&
                    !pathname.startsWith("/inventory/review")) ||
                  (item.path !== "/inventory" && pathname.startsWith(`${item.path}/`));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onNavigate}
                    className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
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

      <ProfileMenu
        userName={userName}
        userRole={userRole}
        userInitials={userInitials}
        isLoggingOut={isLoggingOut}
        onLogout={onLogout}
      />
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

  return (
    <div className="relative border-t border-white/10 px-4 py-4">
      {isOpen && (
        <div className="absolute inset-x-4 bottom-full mb-2 rounded-xl border border-white/10 bg-[#18181b] p-2 shadow-xl">
          <Button
            variant="ghost"
            className="w-full justify-start text-neutral-300 hover:bg-white/10 hover:text-white"
            disabled={isLoggingOut}
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
          >
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </div>
      )}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#29292c] text-sm font-semibold text-white">
          {userInitials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{userName}</p>
          <p className="truncate text-xs text-neutral-500">{userRole}</p>
        </div>
      </button>
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
