import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS, type AppRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/usuarios")({ component: UsuariosPage });

const ROLES: AppRole[] = ["hemoterapeuta", "biomedico", "tecnico", "enfermeiro", "medico", "gestor"];

function UsuariosPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  if (!hasRole("gestor")) return <Navigate to="/dashboard" />;

  const { data } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const map: Record<string, AppRole[]> = {};
      (roles ?? []).forEach((r: any) => { (map[r.user_id] ??= []).push(r.role); });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: map[p.id] ?? [] }));
    },
  });

  const setActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("profiles").update({ active }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(active ? "Ativado" : "Desativado"); qc.invalidateQueries({ queryKey: ["users-admin"] }); }
  };

  const setRole = async (userId: string, role: AppRole, currentRoles: AppRole[]) => {
    // Replace all roles with the single selected role
    if (currentRoles.length > 0) {
      await supabase.from("user_roles").delete().eq("user_id", userId);
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error(error.message);
    else { toast.success("Cargo atribuído"); qc.invalidateQueries({ queryKey: ["users-admin"] }); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <Card>
        <CardHeader><CardTitle>Gerenciar acessos</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr className="border-b">
              <th className="text-left p-2">Nome</th><th className="text-left p-2">E-mail</th>
              <th className="text-left p-2">Cargo</th><th className="text-left p-2">Ativo</th>
            </tr></thead>
            <tbody>
              {data?.map((u: any) => (
                <tr key={u.id} className="border-b">
                  <td className="p-2">{u.full_name || "—"}</td>
                  <td className="p-2 text-muted-foreground">{u.email}</td>
                  <td className="p-2">
                    <Select value={u.roles[0] ?? ""} onValueChange={(r: AppRole) => setRole(u.id, r, u.roles)}>
                      <SelectTrigger className="w-44"><SelectValue placeholder="Sem cargo" /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-2"><Switch checked={u.active} onCheckedChange={(v) => setActive(u.id, v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
