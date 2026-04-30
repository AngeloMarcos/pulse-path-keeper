import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BLOOD_TYPES, BLOOD_TYPE_LABELS, COMPONENT_MAIN, COMPONENT_LABELS, REQUEST_STATUS_LABELS,
  urgencyBadgeClass, URGENCY_LABELS,
} from "@/lib/domain";
import { Droplet, ClipboardList, PackageCheck, Activity, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const expLimit = new Date(Date.now() + 48 * 36e5).toISOString().slice(0, 10);
      const [units, pending, ready, transf, allReqs, expiring, urgent] = await Promise.all([
        supabase.from("blood_units").select("component_type,blood_type,id").eq("status", "disponivel"),
        supabase.from("transfusion_requests").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("transfusion_requests").select("id", { count: "exact", head: true }).eq("status", "pronto_dispensar"),
        supabase.from("transfusions").select("id", { count: "exact", head: true }).gte("started_at", todayIso),
        supabase.from("transfusion_requests").select("status"),
        supabase.from("blood_units").select("id", { count: "exact", head: true }).eq("status", "disponivel").lte("expiration_date", expLimit),
        supabase.from("transfusion_requests").select("id, urgency, created_at, patients(full_name, mrn), component_type, quantity")
          .in("urgency", ["urgencia","emergencia","emergencia_absoluta"])
          .order("created_at", { ascending: false }).limit(5),
      ]);
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
        expiring: expiring.count ?? 0,
        matrix, statusCounts,
        urgent: urgent.data ?? [],
      };
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da agência transfusional</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI title="Bolsas Disponíveis" value={data?.totalAvail} icon={Droplet} color="text-primary" loading={isLoading} />
        <KPI title="Solicitações Pendentes" value={data?.pending} icon={ClipboardList} color="text-warning" loading={isLoading} />
        <KPI title="Pronto p/ Dispensar" value={data?.ready} icon={PackageCheck} color="text-success" loading={isLoading} />
        <KPI title="Transfusões Hoje" value={data?.transfToday} icon={Activity} color="text-destructive" loading={isLoading} />
        <KPI title="Vencendo em 48h" value={data?.expiring} icon={AlertTriangle} color="text-warning" loading={isLoading} alert={(data?.expiring ?? 0) > 0} />
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

      <Card>
        <CardHeader><CardTitle>Solicitações urgentes / emergência</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-24 w-full" /> : data?.urgent.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma solicitação urgente no momento.</div>
          ) : (
            <div className="space-y-2">
              {data?.urgent.map((r: any) => (
                <Link key={r.id} to="/solicitacoes" className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/40 text-sm">
                  <div>
                    <div className="font-medium">{r.patients?.full_name} <span className="text-xs text-muted-foreground">{r.patients?.mrn}</span></div>
                    <div className="text-xs text-muted-foreground">{r.component_type} × {r.quantity} • {new Date(r.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${urgencyBadgeClass(r.urgency)}`}>{URGENCY_LABELS[r.urgency]}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ title, value, icon: Icon, color, loading, alert }: { title: string; value?: number; icon: any; color: string; loading: boolean; alert?: boolean }) {
  return (
    <Card className={alert ? "border-warning/60 bg-warning/5" : ""}>
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
