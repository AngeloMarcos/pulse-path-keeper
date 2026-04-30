import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUEST_STATUS_LABELS, statusBadgeClass } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/testes")({ component: TestesPage });

function TestesPage() {
  const { data } = useQuery({
    queryKey: ["testes-list"],
    queryFn: async () => {
      const { data } = await supabase.from("transfusion_requests")
        .select("*, patients(full_name, mrn)")
        .in("status", ["em_analise", "aguardando_amostra"])
        .order("created_at");
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Testes Pré-Transfusionais</h1>
      <Card>
        <CardHeader><CardTitle>Solicitações em análise</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Para cada solicitação, registre tipagem, PAI e prova cruzada antes de liberar a bolsa. Bolsas com prova cruzada incompatível são bloqueadas automaticamente.
          </p>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left p-2">Paciente</th>
                <th className="text-left p-2">Componente</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.patients?.full_name} <span className="text-xs text-muted-foreground">{r.patients?.mrn}</span></td>
                  <td className="p-2">{r.component_type}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${statusBadgeClass(r.status)}`}>{REQUEST_STATUS_LABELS[r.status]}</span></td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Nenhuma solicitação em análise</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
