import { useState } from "react";
import { Pencil, Plus, RefreshCw, RotateCcw, Trash2, UsersRound } from "lucide-react";

import type { User } from "@/api/generated/models";
import { deleteUsersUserId, patchUsersUserId, useGetUsers } from "@/api/generated/users/users";
import { useGetBranches } from "@/api/generated/branches/branches";
import { ApiError } from "@/api/http-client";
import { PageFrame, PageHeader } from "@/components/operational/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";

export function UsersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User>();
  const [actionError, setActionError] = useState("");
  const usersQuery = useGetUsers<ApiError>();
  const branchesQuery = useGetBranches<ApiError>();
  const users = usersQuery.data?.status === 200 ? usersQuery.data.data.data : [];
  const branches = branchesQuery.data?.data.data ?? [];
  const isLoading = usersQuery.isLoading || branchesQuery.isLoading;
  const error = usersQuery.error ?? branchesQuery.error;

  async function toggleActive(user: User) {
    const message = user.active
      ? `¿Desactivar a ${user.userName}? Ya no podrá iniciar sesión, pero su historial se conserva.`
      : `¿Reactivar a ${user.userName}?`;
    if (!window.confirm(message)) return;
    setActionError("");
    try {
      if (user.active) {
        await deleteUsersUserId(user.id);
      } else {
        await patchUsersUserId(user.id, { active: true });
      }
      await usersQuery.mutate();
    } catch (cause) {
      setActionError(
        cause instanceof ApiError && cause.status === 400
          ? "No puedes desactivar tu propio usuario."
          : "No pudimos actualizar el usuario. Inténtalo de nuevo.",
      );
    }
  }

  return (
    <>
      <PageFrame>
        <PageHeader
          eyebrow="Administración"
          title="Usuarios"
          description="Administra las cuentas y los permisos de acceso de tu equipo."
          actions={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus /> Crear usuario
            </Button>
          }
        />

        {isLoading && (
          <Card className="p-8 text-center text-muted-foreground">Cargando usuarios…</Card>
        )}
        {!isLoading && error && (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <p>No pudimos cargar los usuarios.</p>
            <Button
              variant="outline"
              onClick={() => void Promise.all([usersQuery.mutate(), branchesQuery.mutate()])}
            >
              <RefreshCw /> Intentar de nuevo
            </Button>
          </Card>
        )}
        {!isLoading && !error && users.length === 0 && (
          <Card className="p-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersRound />
                </EmptyMedia>
                <EmptyTitle>Aún no hay usuarios</EmptyTitle>
                <EmptyDescription>Crea cuentas para el equipo de Flow.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Card>
        )}
        {actionError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {actionError}
          </p>
        )}
        {!isLoading && !error && users.length > 0 && (
          <Card className="gap-0 overflow-hidden py-0 shadow-sm">
            <div className="overflow-x-auto">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>USUARIO</TableHead>
                    <TableHead>ROL</TableHead>
                    <TableHead className="hidden md:table-cell">SUCURSAL</TableHead>
                    <TableHead>ESTADO</TableHead>
                    <TableHead className="text-right">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="h-16">
                      <TableCell className="font-medium">{user.userName}</TableCell>
                      <TableCell>{roleLabel(user.role)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.branch?.name ?? "Todas las sucursales"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {user.active ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role === "super_admin" ? (
                          <span className="text-xs text-muted-foreground">Protegido</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setEditingUser(user)}
                            >
                              <Pencil /> Editar
                            </Button>
                            {user.active ? (
                              <Button
                                size="sm"
                                className="bg-red-600 text-white hover:bg-red-700"
                                onClick={() => void toggleActive(user)}
                              >
                                <Trash2 /> Desactivar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void toggleActive(user)}
                              >
                                <RotateCcw /> Reactivar
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </PageFrame>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          branches={branches}
          onClose={() => setEditingUser(undefined)}
          onSaved={() => usersQuery.mutate()}
        />
      )}

      {isCreateOpen && (
        <CreateUserDialog
          branches={branches}
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => usersQuery.mutate()}
        />
      )}
    </>
  );
}

function roleLabel(role: string) {
  if (role === "manager") return "Gerente";
  if (role === "admin") return "Administrador";
  return "Super admin";
}
