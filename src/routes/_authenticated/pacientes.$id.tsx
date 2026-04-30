import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BLOOD_TYPE_LABELS, bloodTypeBadgeClass, COMPONENT_LABELS } from "@/lib/domain";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({ component: PatientDetail });

function PatientDetail() {
  const { id } = useParams({ from: "/_authenticated/pacientes/$id" });
  const { data, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const [{ data: patient }, { data: trans }, { data: reactions }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).single(),
        supabase.from("transfusions").select("*, blood_units(bag_number, component_type)").eq("patient_id", id).order("started_at", { ascending: false }),
        supabase.from("adverse_reactions").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      ]);
      return { patient, trans: trans ?? [], reactions: reactions ?? [] };
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const p = data?.patient;
  if (!p) return <div>Paciente não encontrado</div>;

  return (
    <div className="space-y-4">
      <Link to="/pacientes" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>{p.full_name}</CardTitle>
            <span className={`px-2 py-0.5 rounded text-sm ${bloodTypeBadgeClass(p.blood_type)}`}>{BLOOD_TYPE_LABELS[p.blood_type]}</span>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Info label="Prontuário" value={p.mrn} />
          <Info label="CPF" value={p.cpf || "—"} />
          <Info label="Nascimento" value={p.birth_date ? new Date(p.birth_date).toLocaleDateString("pt-BR") : "—"} />
          <Info label="PAI" value={p.pai_status || "—"} />
          {(p.irradiation_required || p.cmv_negative_required || p.alerts) && (
            <div className="col-span-full bg-warning/10 border border-warning/30 rounded p-3 flex gap-2 text-warning">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                {p.irradiation_required && <div>• Requer hemocomponente irradiado</div>}
                {p.cmv_negative_required && <div>• Requer CMV negativo</div>}
                {p.alerts && <div>• {p.alerts}</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Histórico transfusional</CardTitle></CardHeader>
          <CardContent>
            {data?.trans.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma transfusão registrada</div>}
            <div className="space-y-2">
              {data?.trans.map((t: any) => (
                <div key={t.id} className="text-sm border-b pb-2">
                  <div className="font-medium">{new Date(t.started_at).toLocaleString("pt-BR")}</div>
                  <div className="text-muted-foreground">{COMPONENT_LABELS[t.blood_units?.component_type] ?? t.blood_units?.component_type} • {t.blood_units?.bag_number}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Histórico de reações</CardTitle></CardHeader>
          <CardContent>
            {data?.reactions.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma reação registrada</div>}
            <div className="space-y-2">
              {data?.reactions.map((r: any) => (
                <div key={r.id} className="text-sm border-b pb-2">
                  <div className="font-medium">{r.reaction_type} <span className="text-xs text-muted-foreground">({r.severity})</span></div>
                  <div className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}
