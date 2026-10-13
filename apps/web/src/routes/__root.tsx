import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createRootRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/layout/app-shell";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <main>Página no encontrada</main>,
});

function RootLayout() {
  return (
    <>
      <AppShell />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  );
}
