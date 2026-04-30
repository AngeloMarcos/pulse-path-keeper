import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/relatorios")({ component: RelatoriosPage });

function RelatoriosPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [units, transf, reactions] = await Promise.all([
        supabase.from("blood_units").select("status,component_type"),
        supabase.from("transfusions").select("started_at"),
        supabase.from("adverse_reactions").select("severity,reaction_type"),
      ]);
      return { units: units.data ?? [], transf: transf.data ?? [], reactions: reactions.data ?? [] };
    },
  });
  const discardRate = data ? Math.round(100 * data.units.filter((u: any) => u.status === "descartado").length / Math.max(1, data.units.length)) : 0;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Total de bolsas</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{data?.units.length ?? 0}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Taxa de descarte</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{discardRate}%</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Reações totais</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{data?.reactions.length ?? 0}</CardContent></Card>
      </div>
    </div>
  );
}
