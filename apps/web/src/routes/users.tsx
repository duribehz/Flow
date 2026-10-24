import { createFileRoute } from "@tanstack/react-router";

import { ComingSoonPage } from "@/features/layout/coming-soon-page";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <ComingSoonPage
      title="Usuarios"
      description="Administra usuarios, accesos y responsabilidades del equipo."
    />
  );
}
