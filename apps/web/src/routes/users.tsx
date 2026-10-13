import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/features/layout/placeholder-page";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <PlaceholderPage
      title="Usuarios"
      description="Administra usuarios, accesos y responsabilidades del equipo."
    />
  );
}
