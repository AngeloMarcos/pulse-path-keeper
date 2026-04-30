import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BLOOD_TYPES, BLOOD_TYPE_LABELS, COMPONENT_MAIN, COMPONENT_LABELS, REQUEST_STATUS_LABELS,
} from "@/lib/domain";
import { Droplet, ClipboardList, PackageCheck, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const [units, pending, ready, transf, allReqs] = await Promise.all([
        supabase.from("blood_units").select("component_type,blood_type,id").eq("status", "disponivel"),
        supabase.from("transfusion_requests").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("transfusion_requests").select("id", { count: "exact", head: true }).eq("status", "pronto_dispensar"),
        supabase.from("transfusions").select("id", { count: "exact", head: true }).gte("started_at", todayIso),
        supabase.from("transfusion_requests").select("status"),
      ]);
      // Build matrix
      const matrix: Record<string, Record<string, number>> = {};
      for (const c of COMPONENT_MAIN) {
        matrix[c] = {};
        for (const b of BLOOD_TYPES) matrix[c][b] = 0;
      }
      (units.data ?? []).forEach((u: any) => {
        if (matrix[u.component_type] && u.blood_type in matrix[u.component_type])
          matrix[u.component_type][u.blood_type] += 1;
      });
      const statusCounts: Record<string, number> = {};
      (allReqs.data ?? []).forEach((r: any) => { statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1; });
      return {
        totalAvail: units.data?.length ?? 0,
        pending: pending.count ?? 0,
        ready: ready.count ?? 0,
        transfToday: transf.count ?? 0,
        matrix, statusCounts,
      };
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do banco de sangue</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Total em Estoque" value={data?.totalAvail} icon={Droplet} color="text-primary" loading={isLoading} />
        <KPI title="Solicitações Pendentes" value={data?.pending} icon={ClipboardList} color="text-warning" loading={isLoading} />
        <KPI title="Pronto para Dispensar" value={data?.ready} icon={PackageCheck} color="text-success" loading={isLoading} />
        <KPI title="Transfusões Hoje" value={data?.transfToday} icon={Activity} color="text-destructive" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Estoque por hemocomponente × tipo sanguíneo</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 text-muted-foreground font-medium">Componente</th>
                      {BLOOD_TYPES.map((b) => (
                        <th key={b} className="p-2 text-muted-foreground font-medium text-center">{BLOOD_TYPE_LABELS[b]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPONENT_MAIN.map((c) => (
                      <tr key={c} className="border-t">
                        <td className="p-2 font-medium" title={COMPONENT_LABELS[c]}>{c}</td>
                        {BLOOD_TYPES.map((b) => {
                          const n = data?.matrix[c]?.[b] ?? 0;
                          const cls = n === 0 ? "bg-muted text-muted-foreground"
                            : n <= 2 ? "bg-destructive/20 text-destructive"
                            : "bg-success/20 text-success";
                          return (
                            <td key={b} className="p-1">
                              <div className={`rounded-md py-2 text-center font-semibold ${cls}`}>{n}</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Solicitações por status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <Skeleton className="h-32 w-full" /> : Object.entries(REQUEST_STATUS_LABELS).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{data?.statusCounts[k] ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ title, value, icon: Icon, color, loading }: { title: string; value?: number; icon: any; color: string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{title}</div>
            {loading ? <Skeleton className="h-8 w-16 mt-2" /> : <div className="text-3xl font-bold mt-1">{value ?? 0}</div>}
          </div>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}
