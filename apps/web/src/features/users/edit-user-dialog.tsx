import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import type { Branch, User, UserRole } from "@/api/generated/models";
import { usePatchUsersUserId } from "@/api/generated/users/users";
import { ApiError } from "@/api/http-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditUserDialogProps = {
  user: User;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => Promise<unknown>;
};

export function EditUserDialog({ user, branches, onClose, onSaved }: EditUserDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const update = usePatchUsersUserId<ApiError>(user.id);
  const [userName, setUserName] = useState(user.userName);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "super_admin">>(
    user.role === "admin" ? "admin" : "manager",
  );
  const [branchId, setBranchId] = useState(user.branch?.id ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (role === "manager" && !branchId) {
      setError("Selecciona la sucursal del gerente.");
      return;
    }
    if (password && password.length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    try {
      await update.trigger({
        userName: userName.trim(),
        role,
        branchId: role === "manager" ? branchId : null,
        ...(password ? { password } : {}),
      });
      await onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? "Ya existe un usuario con ese nombre."
          : cause instanceof ApiError && cause.status === 404
            ? "La sucursal seleccionada ya no está disponible."
            : "No pudimos guardar los cambios. Inténtalo de nuevo.",
      );
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-user-title"
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md rounded-xl bg-background p-0 text-foreground shadow-xl ring-1 ring-foreground/10 backdrop:bg-foreground/35"
      onCancel={(event) => {
        event.preventDefault();
        if (!update.isMutating) onClose();
      }}
    >
      <div className="flex items-start justify-between border-b px-6 py-5">
        <div>
          <h2 id="edit-user-title" className="text-xl font-semibold">
            Editar usuario
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{user.userName}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cerrar"
          disabled={update.isMutating}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <form className="space-y-5 p-6" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium">
          Nombre de usuario
          <Input
            value={userName}
            onChange={(event) => setUserName(event.currentTarget.value)}
            minLength={3}
            maxLength={100}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Rol
          <select
            value={role}
            onChange={(event) => setRole(event.currentTarget.value as "admin" | "manager")}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="admin">Administrador</option>
            <option value="manager">Gerente</option>
          </select>
        </label>
        {role === "manager" && (
          <label className="grid gap-2 text-sm font-medium">
            Sucursal
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.currentTarget.value)}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              required
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
        <label className="grid gap-2 text-sm font-medium">
          Nueva contraseña
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            placeholder="Déjala vacía para no cambiarla"
            maxLength={200}
          />
          <span className="text-xs font-normal text-muted-foreground">Mínimo 12 caracteres.</span>
        </label>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={update.isMutating} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="default" disabled={update.isMutating}>
            {update.isMutating ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
