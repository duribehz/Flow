import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import type { Branch } from "@/api/generated/models";
import { usePostUsers } from "@/api/generated/users/users";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRole } from "@/api/generated/models";

type CreateUserDialogProps = {
  branches: Branch[];
  onClose: () => void;
  onCreated: () => Promise<unknown>;
};

export function CreateUserDialog({ branches, onClose, onCreated }: CreateUserDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const create = usePostUsers<ApiError>();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("manager");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await create.trigger({
        userName: userName.trim(),
        password,
        role,
        branchId: role === "manager" ? branchId : null,
      });
      await onCreated();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? "Ya existe un usuario con ese nombre."
          : cause instanceof ApiError && cause.status === 404
            ? "La sucursal seleccionada ya no está disponible."
            : "No pudimos crear el usuario. Revisa los datos e inténtalo de nuevo.",
      );
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="create-user-title"
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md rounded-xl bg-background p-0 text-foreground shadow-xl ring-1 ring-foreground/10 backdrop:bg-foreground/35"
      onCancel={(event) => {
        event.preventDefault();
        if (!create.isMutating) onClose();
      }}
    >
      <div className="flex items-start justify-between border-b px-6 py-5">
        <div>
          <h2 id="create-user-title" className="text-xl font-semibold">
            Crear usuario
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define sus credenciales, rol y sucursal si es gerente.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cerrar"
          disabled={create.isMutating}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <label htmlFor="new-user-name" className="grid gap-2 text-sm font-medium">
          Usuario
          <Input
            id="new-user-name"
            required
            minLength={3}
            maxLength={100}
            autoComplete="username"
            autoFocus
            value={userName}
            onChange={(event) => setUserName(event.currentTarget.value)}
            className="h-11"
          />
        </label>

        <label htmlFor="new-user-password" className="grid gap-2 text-sm font-medium">
          Contraseña inicial
          <Input
            id="new-user-password"
            type="password"
            required
            minLength={12}
            maxLength={200}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            className="h-11"
          />
          <span className="text-xs font-normal text-muted-foreground">
            Debe tener al menos 12 caracteres.
          </span>
        </label>

        <label htmlFor="new-user-role" className="grid gap-2 text-sm font-medium">
          Rol
          <select
            id="new-user-role"
            value={role}
            onChange={(event) => setRole(event.currentTarget.value as UserRole)}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="manager">Gerente</option>
            <option value="admin">Administrador</option>
            <option value="super_admin">Super admin</option>
          </select>
        </label>

        {role === "manager" && (
          <label htmlFor="new-user-branch" className="grid gap-2 text-sm font-medium">
            Sucursal asignada
            <select
              id="new-user-branch"
              required
              value={branchId}
              onChange={(event) => setBranchId(event.currentTarget.value)}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={create.isMutating} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isMutating || (role === "manager" && !branchId)}>
            {create.isMutating ? "Creando…" : "Crear usuario"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
