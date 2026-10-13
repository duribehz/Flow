import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/features/layout/placeholder-page";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <PlaceholderPage
      title="Pedidos"
      description="Gestiona pedidos, recepciones y necesidades de abastecimiento."
    />
  );
}
