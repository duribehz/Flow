import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/features/layout/placeholder-page";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <PlaceholderPage
      title="Existencias"
      description="Consulta y administra las existencias disponibles en cada sucursal."
    />
  );
}
