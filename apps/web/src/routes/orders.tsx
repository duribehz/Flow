import { createFileRoute } from "@tanstack/react-router";

import { ComingSoonPage } from "@/features/layout/coming-soon-page";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <ComingSoonPage
      title="Pedidos"
      description="Gestiona pedidos, recepciones y necesidades de abastecimiento."
    />
  );
}
