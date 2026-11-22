import { createFileRoute, redirect } from "@tanstack/react-router";

import { getAuthMe } from "@/api/generated/authentication/authentication";

// Anonymous visitors go to /login; signed-in users go straight to Existencias.
export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    let hasSession = false;
    try {
      await getAuthMe();
      hasSession = true;
    } catch {
      hasSession = false;
    }
    throw redirect({ to: hasSession ? "/inventory" : "/login" });
  },
});
