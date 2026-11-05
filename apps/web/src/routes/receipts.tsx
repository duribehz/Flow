import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/receipts")({
  component: Outlet,
});
