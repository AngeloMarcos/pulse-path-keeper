import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/transfusoes")({ component: TransfusoesPage });

function TransfusoesPage() {
  const { data } = useQuery({
    queryKey: ["transfusoes"],
    queryFn: async () => {
      const { data } = await supabase.from("transfusions")
        .select("*, patients(full_name, mrn), blood_units(bag_number, component_type)")
        .order("started_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Transfusões</h1>
      <Card>
        <CardHeader><CardTitle>Transfusões recentes</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground"><tr className="border-b">
              <th className="text-left p-2">Paciente</th><th className="text-left p-2">Bolsa</th>
              <th className="text-left p-2">Início</th><th className="text-left p-2">Status</th>
            </tr></thead>
            <tbody>
              {data?.map((t: any) => (
                <tr key={t.id} className="border-b">
                  <td className="p-2">{t.patients?.full_name}</td>
                  <td className="p-2 font-mono text-xs">{t.blood_units?.bag_number}</td>
                  <td className="p-2">{new Date(t.started_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2">{t.completed ? <span className="text-success">Concluída</span> : <span className="text-warning">Em andamento</span>}</td>
                </tr>
              ))}
              {data?.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma transfusão registrada</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
