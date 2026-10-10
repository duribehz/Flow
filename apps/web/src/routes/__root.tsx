import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <main>Page not found</main>,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  )
}
