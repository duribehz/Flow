import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/inventory/closures")({
  component: Outlet,
});
