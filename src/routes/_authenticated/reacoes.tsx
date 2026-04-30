import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REACTION_TYPE_LABELS, SEVERITY_LABELS } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/reacoes")({ component: ReacoesPage });

function ReacoesPage() {
  const { data } = useQuery({
    queryKey: ["reactions"],
    queryFn: async () => {
      const { data } = await supabase.from("adverse_reactions")
        .select("*, patients(full_name, mrn)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reações Adversas</h1>
      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr className="border-b">
              <th className="text-left p-2">Paciente</th><th className="text-left p-2">Tipo</th>
              <th className="text-left p-2">Gravidade</th><th className="text-left p-2">Data</th>
            </tr></thead>
            <tbody>
              {data?.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.patients?.full_name}</td>
                  <td className="p-2">{REACTION_TYPE_LABELS[r.reaction_type]}</td>
                  <td className="p-2">
                    <span className={r.severity === "grave" || r.severity === "fatal" ? "text-destructive font-medium" : ""}>
                      {SEVERITY_LABELS[r.severity]}
                    </span>
                  </td>
                  <td className="p-2">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma reação registrada</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
