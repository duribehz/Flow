import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/features/layout/placeholder-page";

export const Route = createFileRoute("/branches")({
  component: BranchesPage,
});

function BranchesPage() {
  return (
    <PlaceholderPage
      title="Sucursales"
      description="Configura las sucursales y sus datos operativos."
    />
  );
}
