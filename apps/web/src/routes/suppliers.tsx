import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/features/layout/placeholder-page";

export const Route = createFileRoute("/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  return (
    <PlaceholderPage
      title="Proveedores"
      description="Administra los proveedores que abastecen a tus sucursales."
    />
  );
}
