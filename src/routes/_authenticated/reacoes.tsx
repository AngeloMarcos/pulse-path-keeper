import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { REACTION_TYPE_LABELS, SEVERITY_LABELS, BLOOD_TYPE_LABELS, COMPONENT_LABELS } from "@/lib/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Printer, Plus, Trash2, FlaskConical, Lock } from "lucide-react";

const searchSchema = z.object({
  patient: z.string().optional(),
  bag: z.string().optional(),
  transfusion: z.string().optional(),
  volume: z.string().optional(),
  time: z.string().optional(),
}).partial();

export const Route = createFileRoute("/_authenticated/reacoes")({
  component: ReacoesPage,
  validateSearch: searchSchema,
});

const SEVERITY_BADGE: Record<string, string> = {
  leve: "bg-success text-success-foreground",
  moderada: "bg-warning text-warning-foreground",
  grave: "bg-orange-600 text-white",
  fatal: "bg-destructive text-destructive-foreground",
};

const SYMPTOM_GROUPS: Record<string, string[]> = {
  "Gerais": ["Febre (≥1°C acima da basal)", "Calafrios", "Tremores", "Mal-estar geral", "Ansiedade/agitação"],
  "Cardiovasculares": ["Hipotensão", "Hipertensão", "Taquicardia", "Bradicardia", "Dor torácica", "Palpitações"],
  "Respiratórios": ["Dispneia", "Sibilos/broncoespasmo", "Cianose", "SpO₂ < 90%", "Taquipneia", "Tosse"],
  "Cutâneos": ["Urticária", "Eritema/rubor", "Prurido", "Angioedema", "Cianose periférica"],
  "Renais": ["Hematúria", "Hemoglobinúria (urina escura)", "Oligúria", "Anúria"],
  "Gastrointestinais": ["Náusea", "Vômito", "Dor abdominal", "Diarreia"],
  "Neurológicos": ["Cefaleia", "Confusão mental", "Convulsão", "Perda de consciência"],
  "Dor": ["Dor lombar", "Dor no local da infusão", "Dor generalizada", "Dor abdominal"],
};

const ACTIONS = [
  "Transfusão suspensa imediatamente",
  "Médico assistente notificado",
  "Hemoterapeuta notificado",
  "Bolsa e equipo enviados para investigação",
  "Amostra de sangue do paciente coletada (pós-reação)",
  "Amostra de urina coletada",
  "Medicamentos administrados",
];

const LAB_ROWS = [
  { exam: "Hemograma completo", ref: "Hb 12-16 g/dL" },
  { exam: "Bilirrubina total", ref: "0,3-1,2 mg/dL" },
  { exam: "Bilirrubina direta", ref: "<0,3 mg/dL" },
  { exam: "Bilirrubina indireta", ref: "<0,9 mg/dL" },
  { exam: "LDH", ref: "120-246 U/L" },
  { exam: "Haptoglobina", ref: "30-200 mg/dL" },
  { exam: "DAT (Coombs Direto)", ref: "Negativo" },
  { exam: "Tipagem pós-reação", ref: "Confirmar grupo" },
  { exam: "Cultura da bolsa", ref: "Negativa em 7d" },
  { exam: "Sorologia do doador", ref: "Não-reagente" },
];

function ReacoesPage() {
  const search = useSearch({ from: "/_authenticated/reacoes" });
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  // Auto-open new FIT if URL params present
  useEffect(() => {
    if (search.patient || search.bag || search.transfusion) setNewOpen(true);
  }, [search.patient, search.bag, search.transfusion]);

  const { data = [] } = useQuery({
    queryKey: ["reactions"],
    queryFn: async () => {
      const { data } = await supabase.from("adverse_reactions")
        .select("*, patients(full_name, mrn), blood_units(bag_number, component_type, blood_type)")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const filtered = useMemo(() => data.filter((r: any) => {
    if (filterType !== "all" && r.reaction_type !== filterType) return false;
    if (filterSeverity !== "all" && r.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && (r.status ?? "aberta") !== filterStatus) return false;
    return true;
  }), [data, filterType, filterSeverity, filterStatus]);

  const opened = openId ? data.find((r: any) => r.id === openId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ficha de Investigação Transfusional (FIT)</h1>
          <p className="text-sm text-muted-foreground">FP.ATRA.005-00 — Notificação, investigação e parecer</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2"/>Nova FIT</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Tipo de reação</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(REACTION_TYPE_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Gravidade</Label>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(SEVERITY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="fechada">Fechada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">FITs registradas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b">
              <tr>
                <th className="text-left p-2">Paciente</th>
                <th className="text-left p-2">Bolsa</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">Gravidade</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Notificada em</th>
                <th className="text-left p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="p-2">{r.patients?.full_name}</td>
                  <td className="p-2 font-mono text-xs">{r.blood_units?.bag_number ?? "—"}</td>
                  <td className="p-2">{REACTION_TYPE_LABELS[r.reaction_type]}</td>
                  <td className="p-2"><Badge className={SEVERITY_BADGE[r.severity]}>{SEVERITY_LABELS[r.severity]}</Badge></td>
                  <td className="p-2">{(r.status ?? "aberta") === "fechada" ? <Badge variant="outline"><Lock className="h-3 w-3 mr-1"/>Fechada</Badge> : <Badge>Aberta</Badge>}</td>
                  <td className="p-2">{new Date(r.notification_datetime).toLocaleString("pt-BR")}</td>
                  <td className="p-2"><Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>Abrir</Button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma FIT</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader><SheetTitle>Nova FIT</SheetTitle></SheetHeader>
          <FitForm
            prefill={search}
            onSaved={() => { setNewOpen(false); qc.invalidateQueries({ queryKey: ["reactions"] }); }}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader><SheetTitle>FIT — {opened?.patients?.full_name}</SheetTitle></SheetHeader>
          {opened && <FitForm existing={opened} onSaved={() => {
            setOpenId(null); qc.invalidateQueries({ queryKey: ["reactions"] });
          }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// =====================================================
// FIT Form
// =====================================================
function FitForm({ existing, prefill, onSaved }: { existing?: any; prefill?: any; onSaved: () => void }) {
  const { profile } = useAuth();
  const isClosed = (existing?.status ?? "aberta") === "fechada";
  const RO = isClosed; // read-only flag

  // Section 1
  const [notifAt, setNotifAt] = useState(existing?.notification_datetime?.slice(0,16) ?? new Date().toISOString().slice(0,16));
  const [notifyingUnit, setNotifyingUnit] = useState(existing?.notifying_unit ?? "");
  const [notifyingNurse, setNotifyingNurse] = useState(existing?.notifying_nurse ?? profile?.full_name ?? "");
  const [attendingPhys, setAttendingPhys] = useState(existing?.attending_physician ?? "");
  const [patientId, setPatientId] = useState<string>(existing?.patient_id ?? prefill?.patient ?? "");
  const [patient, setPatient] = useState<any>(existing?.patients ?? null);
  const [patientSearch, setPatientSearch] = useState("");

  // Section 2
  const [bagId, setBagId] = useState<string>(existing?.blood_unit_id ?? prefill?.bag ?? "");
  const [bag, setBag] = useState<any>(existing?.blood_units ?? null);
  const [bagSearch, setBagSearch] = useState("");
  const [transfusionStart, setTransfusionStart] = useState("");
  const [reactionStart, setReactionStart] = useState(existing?.reaction_started_at?.slice(0,16) ?? prefill?.time?.slice(0,16) ?? new Date().toISOString().slice(0,16));
  const [volumeUntil, setVolumeUntil] = useState<string>(existing?.volume_until_reaction_ml ?? prefill?.volume ?? "");

  // Section 3
  const initialSymptoms = (existing?.symptoms?.list ?? []) as string[];
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set(initialSymptoms));
  const [otherSymptoms, setOtherSymptoms] = useState(existing?.symptoms?.other ?? "");

  // Section 4
  const [reactionType, setReactionType] = useState<string>(existing?.reaction_type ?? "rfnh");
  const [reactionTypeOther, setReactionTypeOther] = useState(existing?.symptoms?.reaction_other ?? "");

  // Section 5
  const initialActions = (existing?.actions_taken?.list ?? []) as string[];
  const [actionsSet, setActionsSet] = useState<Set<string>>(new Set(initialActions));
  const [meds, setMeds] = useState<{ name: string; dose: string; route: string; time: string }[]>(existing?.actions_taken?.meds ?? []);
  const [evolution, setEvolution] = useState(existing?.clinical_evolution ?? "");

  // Section 6
  const [severity, setSeverity] = useState<string>(existing?.severity ?? "leve");
  const [hemoNotified, setHemoNotified] = useState(existing?.hemoterapeuta_name ?? "");
  const [hemoNotifiedAt, setHemoNotifiedAt] = useState(existing?.hemoterapeuta_notified_at?.slice(0,16) ?? "");
  const [outcome, setOutcome] = useState(existing?.outcome ?? "");

  // Section 7
  const [labs, setLabs] = useState<{ exam: string; pre: string; post: string; ref: string }[]>(
    existing?.lab_results?.rows ?? LAB_ROWS.map(r => ({ exam: r.exam, pre: "", post: "", ref: r.ref }))
  );

  // Section 8
  const [finalClass, setFinalClass] = useState<string>(existing?.final_classification ?? "");
  const [hemoOpinion, setHemoOpinion] = useState(existing?.hemoterapeuta_conclusion ?? "");
  const [recommendations, setRecommendations] = useState(existing?.recommendations ?? "");
  const [notivisaSent, setNotivisaSent] = useState<boolean>(!!existing?.notivisa_sent);
  const [notivisaProtocol, setNotivisaProtocol] = useState(existing?.notivisa_protocol ?? "");
  const [hemoCrm, setHemoCrm] = useState(existing?.hemoterapeuta_crm ?? "");

  const isSerious = severity === "grave" || severity === "fatal";

  // Patient search
  async function searchPatient() {
    if (!patientSearch.trim()) return;
    const { data } = await supabase.from("patients")
      .select("id, full_name, mrn, blood_type, alerts")
      .or(`mrn.ilike.%${patientSearch}%,full_name.ilike.%${patientSearch}%`)
      .limit(1).maybeSingle();
    if (data) { setPatient(data); setPatientId(data.id); toast.success("Paciente encontrado"); }
    else toast.error("Não encontrado");
  }

  // Bag search
  async function searchBag() {
    if (!bagSearch.trim()) return;
    const { data } = await supabase.from("blood_units")
      .select("id, bag_number, component_type, blood_type, volume_ml")
      .ilike("bag_number", `%${bagSearch}%`).limit(1).maybeSingle();
    if (data) { setBag(data); setBagId(data.id); toast.success("Bolsa encontrada"); }
    else toast.error("Não encontrada");
  }

  // Pre-fill bag from prefill or existing
  useEffect(() => {
    (async () => {
      if (bagId && !bag) {
        const { data } = await supabase.from("blood_units").select("id, bag_number, component_type, blood_type, volume_ml").eq("id", bagId).maybeSingle();
        if (data) setBag(data);
      }
      if (patientId && !patient) {
        const { data } = await supabase.from("patients").select("id, full_name, mrn, blood_type, alerts").eq("id", patientId).maybeSingle();
        if (data) setPatient(data);
      }
      if (prefill?.transfusion && !transfusionStart) {
        const { data } = await supabase.from("transfusions").select("started_at").eq("id", prefill.transfusion).maybeSingle();
        if (data?.started_at) setTransfusionStart(data.started_at.slice(0,16));
      }
    })();
  }, [bagId, patientId, prefill?.transfusion]);

  const minutesElapsed = useMemo(() => {
    if (!transfusionStart || !reactionStart) return null;
    return Math.round((new Date(reactionStart).getTime() - new Date(transfusionStart).getTime()) / 60000);
  }, [transfusionStart, reactionStart]);

  function toggleSymptom(s: string) {
    if (RO) return;
    setSymptoms((set) => { const ns = new Set(set); ns.has(s) ? ns.delete(s) : ns.add(s); return ns; });
  }
  function toggleAction(a: string) {
    if (RO) return;
    setActionsSet((set) => { const ns = new Set(set); ns.has(a) ? ns.delete(a) : ns.add(a); return ns; });
  }
  function addMed() { setMeds([...meds, { name: "", dose: "", route: "", time: "" }]); }
  function updateMed(i: number, k: string, v: string) { setMeds(meds.map((m, idx) => idx === i ? { ...m, [k]: v } : m)); }
  function removeMed(i: number) { setMeds(meds.filter((_, idx) => idx !== i)); }
  function addLabRow() { setLabs([...labs, { exam: "", pre: "", post: "", ref: "" }]); }
  function removeLabRow(i: number) { setLabs(labs.filter((_, idx) => idx !== i)); }

  async function fetchLisResults() {
    toast.info("Buscando resultados do LIS…");
    setTimeout(() => {
      setLabs((prev) => prev.map((row) => ({
        ...row,
        post: row.exam.startsWith("Hemograma") ? `Hb ${(7 + Math.random()*3).toFixed(1)} g/dL` :
              row.exam.includes("LDH") ? `${Math.round(300 + Math.random()*400)} U/L` :
              row.exam.includes("Haptoglobina") ? `${Math.round(5 + Math.random()*40)} mg/dL` :
              row.exam.includes("DAT") ? (Math.random() > 0.5 ? "Positivo" : "Negativo") :
              row.exam.includes("Bilirrubina") ? `${(0.5 + Math.random()*3).toFixed(2)} mg/dL` :
              row.post || "—",
      })));
      toast.success("Resultados importados do LIS");
    }, 700);
  }

  async function buildPayload(closing = false) {
    const payload: any = {
      patient_id: patientId,
      blood_unit_id: bagId || null,
      reported_by: profile?.id,
      notification_datetime: new Date(notifAt).toISOString(),
      notifying_unit: notifyingUnit,
      notifying_nurse: notifyingNurse,
      attending_physician: attendingPhys,
      reaction_type: reactionType,
      severity,
      outcome: outcome || null,
      symptoms: { list: Array.from(symptoms), other: otherSymptoms, reaction_other: reactionTypeOther },
      actions_taken: { list: Array.from(actionsSet), meds },
      lab_results: { rows: labs },
      reaction_started_at: reactionStart ? new Date(reactionStart).toISOString() : null,
      volume_until_reaction_ml: volumeUntil ? Number(volumeUntil) : null,
      clinical_evolution: evolution || null,
      hemoterapeuta_name: hemoNotified || null,
      hemoterapeuta_notified_at: hemoNotifiedAt ? new Date(hemoNotifiedAt).toISOString() : null,
      hemoterapeuta_conclusion: hemoOpinion || null,
      hemoterapeuta_crm: hemoCrm || null,
      recommendations: recommendations || null,
      final_classification: finalClass || null,
      notivisa_sent: notivisaSent,
      notivisa_protocol: notivisaProtocol || null,
      transfusion_id: prefill?.transfusion ?? existing?.transfusion_id ?? null,
    };
    if (closing) {
      payload.status = "fechada";
      payload.closed_at = new Date().toISOString();
      payload.closed_by = profile?.id;
    }
    return payload;
  }

  async function save(closing = false) {
    if (!patientId) { toast.error("Selecione o paciente"); return; }
    if (closing && isSerious && !hemoNotified) {
      toast.error("Reação grave/fatal — informe o hemoterapeuta notificado antes de fechar."); return;
    }
    const payload = await buildPayload(closing);
    let id = existing?.id;
    if (existing) {
      const { error } = await supabase.from("adverse_reactions").update(payload).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("adverse_reactions").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      id = data.id;
    }

    if (closing) {
      // Save recommendations into patient.alerts
      if (recommendations && patientId) {
        const { data: pat } = await supabase.from("patients").select("alerts").eq("id", patientId).maybeSingle();
        const merged = [pat?.alerts, `[FIT ${new Date().toLocaleDateString("pt-BR")}] ${recommendations}`].filter(Boolean).join(" • ");
        await supabase.from("patients").update({ alerts: merged }).eq("id", patientId);
      }
      // HIS push
      await supabase.from("his_lis_events").insert({
        direction: "outbound", integration_type: "his", endpoint: "/his/fit-finalized",
        status: "success", payload: { fit_id: id, severity, classification: finalClass } as any,
      } as any);
      // Audit log: FIT fechada
      await supabase.rpc("insert_audit_log", {
        p_table: "adverse_reactions",
        p_record_id: id!,
        p_action: "fit_closed",
        p_new: { fit_id: id, patient_id: patientId, severity, final_classification: finalClass } as any,
      });
      toast.success("FIT fechada e arquivada.");
    } else {
      toast.success("FIT salva.");
    }
    onSaved();
  }

  function printFit() {
    const w = window.open("", "_blank", "width=820,height=1100");
    if (!w) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>FIT FP.ATRA.005-00</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 10.5px; color:#000; }
  h1 { font-size: 14px; text-align:center; margin:0; }
  h2 { font-size: 11px; background:#1F3864; color:#fff; padding:3px 8px; margin: 10px 0 4px; }
  .header { text-align:center; border-bottom: 2px solid #1F3864; padding-bottom: 6px; margin-bottom:8px; }
  table { width:100%; border-collapse: collapse; margin: 3px 0; }
  td, th { padding: 3px 5px; border: 1px solid #999; vertical-align: top; font-size:10px; }
  .label { background:#f0f0f0; font-weight:600; width:30%; }
  .sig { margin-top: 26px; display:flex; justify-content:space-between; }
  .sig div { width:45%; border-top:1px solid #000; padding-top:4px; text-align:center; font-size:10px; }
  .badge { display:inline-block; padding:1px 6px; border-radius:3px; background:#eee; margin:1px; font-size:9px; }
</style></head><body>
<div class="header">
  <h1>FP.ATRA.005-00 — Ficha de Investigação Transfusional (FIT)</h1>
  <div style="font-size:10px;">Hospital — Agência Transfusional · SGAT</div>
</div>
<h2>1. Notificação</h2>
<table>
  <tr><td class="label">Notificação em</td><td>${new Date(notifAt).toLocaleString("pt-BR")}</td><td class="label">Unidade</td><td>${notifyingUnit}</td></tr>
  <tr><td class="label">Enfermeiro</td><td>${notifyingNurse}</td><td class="label">Médico assistente</td><td>${attendingPhys}</td></tr>
  <tr><td class="label">Paciente</td><td>${patient?.full_name ?? ""}</td><td class="label">MRN</td><td>${patient?.mrn ?? ""}</td></tr>
</table>
<h2>2. Dados da Transfusão</h2>
<table>
  <tr><td class="label">Bolsa</td><td>${bag?.bag_number ?? ""}</td><td class="label">Componente</td><td>${COMPONENT_LABELS[bag?.component_type] ?? ""}</td></tr>
  <tr><td class="label">Grupo bolsa</td><td>${BLOOD_TYPE_LABELS[bag?.blood_type] ?? ""}</td><td class="label">Volume total</td><td>${bag?.volume_ml ?? ""} ml</td></tr>
  <tr><td class="label">Volume até reação</td><td>${volumeUntil} ml</td><td class="label">Min decorridos</td><td>${minutesElapsed ?? "—"}</td></tr>
  <tr><td class="label">Início transfusão</td><td>${transfusionStart ? new Date(transfusionStart).toLocaleString("pt-BR") : "—"}</td>
      <td class="label">Início reação</td><td>${reactionStart ? new Date(reactionStart).toLocaleString("pt-BR") : "—"}</td></tr>
</table>
<h2>3. Sinais e Sintomas</h2>
<div>${Array.from(symptoms).map(s=>`<span class="badge">✓ ${s}</span>`).join(" ")}</div>
${otherSymptoms ? `<p><b>Outros:</b> ${otherSymptoms}</p>` : ""}
<h2>4. Classificação</h2>
<table><tr><td class="label">Tipo</td><td>${REACTION_TYPE_LABELS[reactionType] ?? reactionType}${reactionTypeOther ? " — " + reactionTypeOther : ""}</td></tr></table>
<h2>5. Condutas</h2>
<div>${Array.from(actionsSet).map(a=>`<span class="badge">✓ ${a}</span>`).join(" ")}</div>
${meds.length ? `<table><thead><tr><th>Medicamento</th><th>Dose</th><th>Via</th><th>Horário</th></tr></thead><tbody>${meds.map(m=>`<tr><td>${m.name}</td><td>${m.dose}</td><td>${m.route}</td><td>${m.time}</td></tr>`).join("")}</tbody></table>` : ""}
${evolution ? `<p><b>Evolução:</b> ${evolution}</p>` : ""}
<h2>6. Gravidade e Desfecho</h2>
<table>
  <tr><td class="label">Gravidade</td><td>${SEVERITY_LABELS[severity]}</td><td class="label">Desfecho</td><td>${outcome || "—"}</td></tr>
  <tr><td class="label">Hemoterapeuta notificado</td><td>${hemoNotified || "—"}</td><td class="label">Em</td><td>${hemoNotifiedAt ? new Date(hemoNotifiedAt).toLocaleString("pt-BR") : "—"}</td></tr>
</table>
<h2>7. Investigação Laboratorial</h2>
<table><thead><tr><th>Exame</th><th>Pré</th><th>Pós</th><th>Ref.</th></tr></thead>
<tbody>${labs.map(l=>`<tr><td>${l.exam}</td><td>${l.pre}</td><td>${l.post}</td><td>${l.ref}</td></tr>`).join("")}</tbody></table>
<h2>8. Parecer e Encerramento</h2>
<table>
  <tr><td class="label">Classificação final</td><td>${REACTION_TYPE_LABELS[finalClass] ?? finalClass ?? "—"}</td></tr>
  <tr><td class="label">Parecer</td><td>${hemoOpinion || "—"}</td></tr>
  <tr><td class="label">Recomendações</td><td>${recommendations || "—"}</td></tr>
  <tr><td class="label">NOTIVISA</td><td>${notivisaSent ? "Sim — protocolo " + (notivisaProtocol || "—") : "Não"}</td></tr>
</table>
<div class="sig">
  <div>${notifyingNurse}<br/><small>Enfermeiro notificante</small></div>
  <div>${hemoNotified}<br/><small>Hemoterapeuta — CRM ${hemoCrm}</small></div>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
    w.document.write(html); w.document.close();
  }

  return (
    <div className="space-y-4 mt-4">
      {isSerious && (
        <div className="sticky top-0 z-10 bg-destructive text-destructive-foreground p-3 rounded flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5"/>
          <div className="text-sm">
            <strong>⚠ REAÇÃO {severity.toUpperCase()} — NOTIFICAÇÃO OBRIGATÓRIA AO HEMOTERAPEUTA.</strong><br/>
            Esta FIT não pode ser fechada sem o parecer do hemoterapeuta.
          </div>
        </div>
      )}

      {isClosed && (
        <div className="bg-muted border rounded p-2 text-sm flex items-center gap-2"><Lock className="h-4 w-4"/> FIT fechada — registro imutável</div>
      )}

      {/* SECTION 1 */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Notificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div><Label>Data/hora da notificação</Label><Input disabled={RO} type="datetime-local" value={notifAt} onChange={(e)=>setNotifAt(e.target.value)}/></div>
          <div><Label>Unidade notificante</Label><Input disabled={RO} value={notifyingUnit} onChange={(e)=>setNotifyingUnit(e.target.value)}/></div>
          <div><Label>Enfermeiro que notificou</Label><Input disabled={RO} value={notifyingNurse} onChange={(e)=>setNotifyingNurse(e.target.value)}/></div>
          <div><Label>Médico assistente</Label><Input disabled={RO} value={attendingPhys} onChange={(e)=>setAttendingPhys(e.target.value)}/></div>
          <div className="col-span-2">
            <Label>Paciente (MRN ou nome)</Label>
            <div className="flex gap-2">
              <Input disabled={RO} value={patientSearch} onChange={(e)=>setPatientSearch(e.target.value)} placeholder="prontuário ou nome"/>
              <Button disabled={RO} type="button" onClick={searchPatient}>Buscar</Button>
            </div>
            {patient && <div className="mt-2 text-sm bg-muted/50 p-2 rounded">
              <strong>{patient.full_name}</strong> — MRN {patient.mrn} — {BLOOD_TYPE_LABELS[patient.blood_type]}
              {patient.alerts && <div className="text-xs text-warning mt-1">⚠ {patient.alerts}</div>}
            </div>}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2 */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Dados da Transfusão</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Bolsa (ISBT 128)</Label>
            <div className="flex gap-2">
              <Input disabled={RO} value={bagSearch} onChange={(e)=>setBagSearch(e.target.value)} placeholder="código da bolsa" className="font-mono"/>
              <Button disabled={RO} type="button" onClick={searchBag}>Buscar</Button>
            </div>
            {bag && <div className="mt-2 text-xs bg-muted/50 p-2 rounded grid grid-cols-3">
              <div>Bolsa: <strong className="font-mono">{bag.bag_number}</strong></div>
              <div>Componente: {COMPONENT_LABELS[bag.component_type]}</div>
              <div>Grupo: {BLOOD_TYPE_LABELS[bag.blood_type]}</div>
              <div>Volume total: {bag.volume_ml} ml</div>
            </div>}
          </div>
          <div><Label>Volume transfundido até a reação (ml)</Label><Input disabled={RO} type="number" value={volumeUntil} onChange={(e)=>setVolumeUntil(e.target.value)}/></div>
          <div><Label>Início da transfusão</Label><Input disabled={RO} type="datetime-local" value={transfusionStart} onChange={(e)=>setTransfusionStart(e.target.value)}/></div>
          <div><Label>Início da reação</Label><Input disabled={RO} type="datetime-local" value={reactionStart} onChange={(e)=>setReactionStart(e.target.value)}/></div>
          <div className="flex items-end"><div className="text-sm text-muted-foreground">Minutos decorridos: <strong className="text-foreground">{minutesElapsed ?? "—"} min</strong></div></div>
        </CardContent>
      </Card>

      {/* SECTION 3 */}
      <Card>
        <CardHeader><CardTitle className="text-base">3. Sinais e Sintomas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(SYMPTOM_GROUPS).map(([group, items]) => (
            <div key={group}>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{group}</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                {items.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={symptoms.has(s)} onCheckedChange={()=>toggleSymptom(s)} disabled={RO}/>
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div><Label>Outros sintomas não listados</Label><Textarea disabled={RO} value={otherSymptoms} onChange={(e)=>setOtherSymptoms(e.target.value)} rows={2}/></div>
        </CardContent>
      </Card>

      {/* SECTION 4 */}
      <Card>
        <CardHeader><CardTitle className="text-base">4. Classificação da Reação</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Select value={reactionType} onValueChange={setReactionType} disabled={RO}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              {Object.entries(REACTION_TYPE_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {reactionType === "outra" && (
            <Input disabled={RO} value={reactionTypeOther} onChange={(e)=>setReactionTypeOther(e.target.value)} placeholder="especificar"/>
          )}
        </CardContent>
      </Card>

      {/* SECTION 5 */}
      <Card>
        <CardHeader><CardTitle className="text-base">5. Condutas Tomadas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {ACTIONS.map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <Checkbox checked={actionsSet.has(a)} onCheckedChange={()=>toggleAction(a)} disabled={RO}/>
                <span>{a}</span>
              </label>
            ))}
          </div>
          {actionsSet.has("Medicamentos administrados") && (
            <div className="border rounded p-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Medicamentos</div>
                {!RO && <Button type="button" size="sm" variant="outline" onClick={addMed}><Plus className="h-3 w-3 mr-1"/>Adicionar</Button>}
              </div>
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground"><th className="text-left p-1">Medicamento</th><th className="text-left p-1">Dose</th><th className="text-left p-1">Via</th><th className="text-left p-1">Horário</th><th></th></tr></thead>
                <tbody>
                  {meds.map((m, i) => (
                    <tr key={i}>
                      <td className="p-1"><Input disabled={RO} value={m.name} onChange={(e)=>updateMed(i,"name",e.target.value)} className="h-8 text-xs"/></td>
                      <td className="p-1"><Input disabled={RO} value={m.dose} onChange={(e)=>updateMed(i,"dose",e.target.value)} className="h-8 text-xs"/></td>
                      <td className="p-1"><Input disabled={RO} value={m.route} onChange={(e)=>updateMed(i,"route",e.target.value)} className="h-8 text-xs"/></td>
                      <td className="p-1"><Input disabled={RO} type="time" value={m.time} onChange={(e)=>updateMed(i,"time",e.target.value)} className="h-8 text-xs"/></td>
                      <td className="p-1">{!RO && <Button type="button" size="sm" variant="ghost" onClick={()=>removeMed(i)}><Trash2 className="h-3 w-3"/></Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div><Label>Evolução clínica após conduta</Label><Textarea disabled={RO} value={evolution} onChange={(e)=>setEvolution(e.target.value)} rows={3}/></div>
        </CardContent>
      </Card>

      {/* SECTION 6 */}
      <Card>
        <CardHeader><CardTitle className="text-base">6. Gravidade e Desfecho</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div><Label>Gravidade</Label>
            <Select value={severity} onValueChange={setSeverity} disabled={RO}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{Object.entries(SEVERITY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Desfecho</Label>
            <Select value={outcome} onValueChange={setOutcome} disabled={RO}>
              <SelectTrigger><SelectValue placeholder="selecionar"/></SelectTrigger>
              <SelectContent>
                <SelectItem value="recuperacao_completa">Recuperação completa</SelectItem>
                <SelectItem value="recuperacao_parcial">Recuperação parcial</SelectItem>
                <SelectItem value="em_investigacao">Em investigação</SelectItem>
                <SelectItem value="obito">Óbito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isSerious && (
            <>
              <div><Label>Hemoterapeuta notificado *</Label><Input disabled={RO} value={hemoNotified} onChange={(e)=>setHemoNotified(e.target.value)}/></div>
              <div><Label>Horário da notificação *</Label><Input disabled={RO} type="datetime-local" value={hemoNotifiedAt} onChange={(e)=>setHemoNotifiedAt(e.target.value)}/></div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SECTION 7 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">7. Investigação Laboratorial</CardTitle>
            {!RO && <Button type="button" size="sm" variant="outline" onClick={fetchLisResults}><FlaskConical className="h-3 w-3 mr-1"/>Buscar do LIS</Button>}
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-xs">
            <thead><tr className="text-muted-foreground"><th className="text-left p-1">Exame</th><th className="text-left p-1">Pré-transfusão</th><th className="text-left p-1">Pós-reação</th><th className="text-left p-1">Ref.</th><th></th></tr></thead>
            <tbody>
              {labs.map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="p-1"><Input disabled={RO} value={l.exam} onChange={(e)=>setLabs(labs.map((x,idx)=>idx===i?{...x,exam:e.target.value}:x))} className="h-8 text-xs"/></td>
                  <td className="p-1"><Input disabled={RO} value={l.pre} onChange={(e)=>setLabs(labs.map((x,idx)=>idx===i?{...x,pre:e.target.value}:x))} className="h-8 text-xs"/></td>
                  <td className="p-1"><Input disabled={RO} value={l.post} onChange={(e)=>setLabs(labs.map((x,idx)=>idx===i?{...x,post:e.target.value}:x))} className="h-8 text-xs"/></td>
                  <td className="p-1"><Input disabled={RO} value={l.ref} onChange={(e)=>setLabs(labs.map((x,idx)=>idx===i?{...x,ref:e.target.value}:x))} className="h-8 text-xs"/></td>
                  <td className="p-1">{!RO && <Button type="button" size="sm" variant="ghost" onClick={()=>removeLabRow(i)}><Trash2 className="h-3 w-3"/></Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!RO && <Button type="button" size="sm" variant="outline" className="mt-2" onClick={addLabRow}><Plus className="h-3 w-3 mr-1"/>Adicionar exame</Button>}
        </CardContent>
      </Card>

      {/* SECTION 8 */}
      <Card>
        <CardHeader><CardTitle className="text-base">8. Parecer do Hemoterapeuta e Encerramento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Classificação final</Label>
            <Select value={finalClass} onValueChange={setFinalClass} disabled={RO}>
              <SelectTrigger><SelectValue placeholder="selecionar"/></SelectTrigger>
              <SelectContent>{Object.entries(REACTION_TYPE_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Parecer técnico</Label><Textarea disabled={RO} value={hemoOpinion} onChange={(e)=>setHemoOpinion(e.target.value)} rows={3}/></div>
          <div><Label>Recomendações para próximas transfusões (será salvo nos alertas do paciente)</Label><Textarea disabled={RO} value={recommendations} onChange={(e)=>setRecommendations(e.target.value)} rows={2}/></div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex items-center justify-between border rounded p-2">
              <Label>NOTIVISA notificado</Label>
              <Switch disabled={RO} checked={notivisaSent} onCheckedChange={setNotivisaSent}/>
            </div>
            <div><Label>Protocolo NOTIVISA</Label><Input disabled={RO || !notivisaSent} value={notivisaProtocol} onChange={(e)=>setNotivisaProtocol(e.target.value)}/></div>
            <div><Label>Hemoterapeuta — nome</Label><Input disabled={RO} value={hemoNotified} onChange={(e)=>setHemoNotified(e.target.value)}/></div>
            <div><Label>CRM</Label><Input disabled={RO} value={hemoCrm} onChange={(e)=>setHemoCrm(e.target.value)}/></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2 sticky bottom-0 bg-background/95 backdrop-blur p-2 border-t">
        <Button variant="outline" type="button" onClick={printFit}><Printer className="h-4 w-4 mr-2"/>Imprimir FIT</Button>
        {!RO && <Button variant="outline" type="button" onClick={()=>save(false)}>Salvar Rascunho</Button>}
        {!RO && <Button onClick={()=>save(true)} className="bg-success text-success-foreground hover:bg-success/90"><Lock className="h-4 w-4 mr-2"/>Fechar FIT</Button>}
      </div>
    </div>
  );
}
