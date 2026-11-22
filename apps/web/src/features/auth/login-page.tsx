import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Box, Loader2 } from "lucide-react";

import { useGetAuthMe, usePostAuthLogin } from "@/api/generated/authentication/authentication";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const navigate = useNavigate();
  const login = usePostAuthLogin<ApiError>();
  const currentUserQuery = useGetAuthMe<ApiError>({
    swr: { revalidateOnFocus: false, shouldRetryOnError: false },
  });
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      !currentUserQuery.isValidating &&
      !currentUserQuery.error &&
      currentUserQuery.data?.status === 200
    ) {
      void navigate({ to: "/inventory", replace: true });
    }
  }, [currentUserQuery.data, currentUserQuery.error, currentUserQuery.isValidating, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await login.trigger({ userName: userName.trim(), password });
      await currentUserQuery.mutate();
      void navigate({ to: "/inventory", replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 401
          ? "El usuario o la contraseña no son correctos."
          : "No pudimos iniciar sesión. Inténtalo de nuevo.",
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbfc] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-background p-7 shadow-sm sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <Box className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight">Flow</p>
            <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              Supply Manager
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresa con tu usuario y contraseña para continuar.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="grid gap-2 text-sm font-medium" htmlFor="login-user-name">
            Usuario
            <Input
              id="login-user-name"
              autoComplete="username"
              autoFocus
              required
              value={userName}
              onChange={(event) => setUserName(event.currentTarget.value)}
              className="h-11"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="login-password">
            Contraseña
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              className="h-11"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={login.isMutating}>
            {login.isMutating && <Loader2 className="animate-spin" />}
            {login.isMutating ? "Ingresando…" : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
