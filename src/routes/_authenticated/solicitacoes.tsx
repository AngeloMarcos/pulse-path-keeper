import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  COMPONENT_MAIN, COMPONENT_LABELS, URGENCY_LABELS, REQUEST_STATUS_LABELS,
  BLOOD_TYPE_LABELS, bloodTypeBadgeClass, urgencyBadgeClass, statusBadgeClass,
} from "@/lib/domain";
import { Plus, Eye, FlaskConical, Printer, Send, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { simulateLisFetch, printRequestPDF } from "@/lib/request-helpers";

export const Route = createFileRoute("/_authenticated/solicitacoes")({ component: SolicitacoesPage });

const URGENCY_DESC: Record<string, string> = {
  rotina: "Rotina — sem prazo crítico",
  urgencia: "Urgência — em até 3 horas",
  emergencia: "Emergência — em até 1 hora",
  emergencia_absoluta: "Emergência absoluta — liberar O- imediatamente",
};

function SolicitacoesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [componentFilter, setComponentFilter] = useState<string>("all");
  const [period, setPeriod] = useState<string>("30d");
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["requests", statusFilter, urgencyFilter, componentFilter, period],
    queryFn: async () => {
      let q = supabase.from("transfusion_requests")
        .select("*, patients(full_name, mrn, blood_type), profiles:requesting_physician_id(full_name, registro_profissional)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      if (urgencyFilter !== "all") q = q.eq("urgency", urgencyFilter as any);
      if (componentFilter !== "all") q = q.eq("component_type", componentFilter as any);
      if (period !== "all") {
        const days = parseInt(period);
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        q = q.gte("created_at", since);
      }
      const { data } = await q;
      return data ?? [];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("transfusion_requests").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["requests"] }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Solicitações</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova Solicitação</Button></SheetTrigger>
          <SheetContent className="overflow-auto w-full sm:max-w-3xl">
            <SheetHeader><SheetTitle>Nova solicitação transfusional</SheetTitle></SheetHeader>
            <RequestForm onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["requests"] }); }} />
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader className="flex flex-row gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(URGENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={componentFilter} onValueChange={setComponentFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Componente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {COMPONENT_MAIN.map((c) => <SelectItem key={c} value={c}>{c} — {COMPONENT_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-2">Paciente</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Qtd</th>
                    <th className="text-left p-2">Urgência</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Médico</th>
                    <th className="text-left p-2">Data/Hora</th>
                    <th className="text-left p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/40">
                      <td className="p-2">
                        <div className="font-medium">{r.patients?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{r.patients?.mrn}</div>
                      </td>
                      <td className="p-2">{r.component_type}</td>
                      <td className="p-2">{r.quantity}</td>
                      <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${urgencyBadgeClass(r.urgency)}`}>{URGENCY_LABELS[r.urgency]}</span></td>
                      <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${statusBadgeClass(r.status)}`}>{REQUEST_STATUS_LABELS[r.status]}</span></td>
                      <td className="p-2 text-xs">{r.profiles?.full_name ?? "—"}</td>
                      <td className="p-2 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                      <td className="p-2">
                        <Button size="sm" variant="ghost" onClick={() => setDetailId(r.id)}><Eye className="h-4 w-4" /></Button>
                        {r.status === "pendente" && (
                          <Button size="sm" variant="outline" className="ml-1" onClick={() => updateStatus(r.id, "em_analise")}>Iniciar</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data?.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma solicitação</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RequestDetail id={detailId} onClose={() => setDetailId(null)} onChanged={() => qc.invalidateQueries({ queryKey: ["requests"] })} />
    </div>
  );
}

// ===== FORM with sections A B C D =====
function RequestForm({ onSaved }: { onSaved: () => void }) {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [urgency, setUrgency] = useState("rotina");
  const [component, setComponent] = useState("CH");
  const [patientSearch, setPatientSearch] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [bed, setBed] = useState("");
  const [hb, setHb] = useState<string>("");
  const [ht, setHt] = useState<string>("");
  const [pl, setPl] = useState<string>("");
  const [tp, setTp] = useState<string>("");
  const [ttpa, setTtpa] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState("");
  const [indication, setIndication] = useState("");
  const [special, setSpecial] = useState({ irradiado: false, cmv: false, fenotipado: false, lavado: false, filtrado: false });
  const [emergencyJust, setEmergencyJust] = useState("");
  const [emergencyAck, setEmergencyAck] = useState(false);
  const [observations, setObservations] = useState("");
  const [lisLoading, setLisLoading] = useState(false);
  const [lisFetchedAt, setLisFetchedAt] = useState<string | null>(null);

  const { data: patients } = useQuery({
    queryKey: ["pat-search", patientSearch],
    queryFn: async () => {
      if (patientSearch.length < 2 || patient) return [];
      const { data } = await supabase.from("patients")
        .select("id, full_name, mrn, blood_type, blood_type_confirmed, pai_status, pai_antibodies, irradiation_required, cmv_negative_required, alerts")
        .or(`full_name.ilike.%${patientSearch}%,mrn.ilike.%${patientSearch}%`).limit(8);
      return data ?? [];
    },
  });

  const fetchLis = async () => {
    setLisLoading(true);
    const r = await simulateLisFetch();
    setHb(String(r.hb)); setHt(String(r.ht)); setPl(String(r.platelets));
    setTp(String(r.tp)); setTtpa(String(r.ttpa));
    const ts = new Date().toLocaleString("pt-BR");
    setLisFetchedAt(ts);
    setLisLoading(false);
    toast.success(`Valores obtidos do LIS em ${ts}`);
  };

  const isEmergency = urgency === "emergencia_absoluta";

  const buildSpecialList = () => Object.entries(special).filter(([_, v]) => v).map(([k]) => k);

  const submit = async (action: "save" | "print") => {
    if (!patient) { toast.error("Selecione um paciente"); return; }
    if (!diagnosis || !indication) { toast.error("Diagnóstico e indicação clínica são obrigatórios"); return; }
    if (isEmergency && (!emergencyJust || !emergencyAck)) { toast.error("Preencha justificativa e confirme ciência do risco"); return; }

    const specialList = buildSpecialList();
    const obj: any = {
      patient_id: patient.id,
      requesting_physician_id: user?.id,
      component_type: component,
      quantity: Number((document.getElementById("quantity-input") as HTMLInputElement)?.value ?? 1),
      urgency,
      diagnosis,
      clinical_indication: indication,
      current_hb: hb ? Number(hb) : null,
      current_ht: ht ? Number(ht) : null,
      platelet_count: pl ? Number(pl) : null,
      emergency_justification: isEmergency ? emergencyJust : null,
      special_requirements: {
        list: specialList,
        bed,
        tp: tp ? Number(tp) : null,
        ttpa: ttpa ? Number(ttpa) : null,
        observations: observations || null,
        lis_fetched_at: lisFetchedAt,
        emergency_o_neg_ack: isEmergency ? emergencyAck : null,
      },
      status: "pendente",
    };

    if (action === "print") {
      printRequestPDF({
        patient_name: patient.full_name, mrn: patient.mrn, bed,
        blood_type: BLOOD_TYPE_LABELS[patient.blood_type] ?? patient.blood_type,
        diagnosis, clinical_indication: indication,
        component_type: `${component} — ${COMPONENT_LABELS[component] ?? ""}`,
        quantity: obj.quantity, urgency: URGENCY_LABELS[urgency],
        hb: obj.current_hb, ht: obj.current_ht, platelets: obj.platelet_count,
        tp: obj.special_requirements.tp, ttpa: obj.special_requirements.ttpa,
        special: specialList, emergency_justification: obj.emergency_justification,
        observations, physician_name: profile?.full_name ?? "—",
        crm: (profile as any)?.registro_profissional ?? undefined,
        created_at: new Date().toISOString(),
      });
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("transfusion_requests").insert(obj);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitação enviada à Agência Transfusional");
    onSaved();
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Section A — Patient */}
      <Section title="A. Identificação do paciente">
        {!patient ? (
          <>
            <Input placeholder="Buscar nome ou prontuário..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
            {patients && patients.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-auto mt-2">
                {patients.map((p: any) => (
                  <button key={p.id} type="button" className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-0"
                    onClick={() => { setPatient(p); setPatientSearch(""); }}>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground">{p.mrn} • {BLOOD_TYPE_LABELS[p.blood_type]}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="border rounded-md p-3 bg-muted/30 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{patient.full_name}</div>
                <div className="text-xs text-muted-foreground">Prontuário {patient.mrn}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setPatient(null); }}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className={`px-2 py-0.5 rounded text-xs ${bloodTypeBadgeClass(patient.blood_type)}`}>
                {BLOOD_TYPE_LABELS[patient.blood_type]}{patient.blood_type_confirmed ? " ✓" : " (não confirmado)"}
              </span>
              {patient.pai_status === "positivo" && <span className="px-2 py-0.5 rounded text-xs bg-warning/30 text-warning">PAI+ {patient.pai_antibodies ?? ""}</span>}
              {patient.irradiation_required && <span className="px-2 py-0.5 rounded text-xs bg-warning/30 text-warning">Requer irradiação</span>}
              {patient.cmv_negative_required && <span className="px-2 py-0.5 rounded text-xs bg-warning/30 text-warning">CMV negativo</span>}
            </div>
            <Field label="Leito / Setor"><Input value={bed} onChange={(e) => setBed(e.target.value)} placeholder="Ex.: UTI-12 / Clínica Médica" /></Field>
          </div>
        )}
      </Section>

      {/* Section B — Clinical */}
      <Section title="B. Dados clínicos">
        <div className="flex justify-end mb-2">
          <Button type="button" size="sm" variant="outline" onClick={fetchLis} disabled={lisLoading}>
            <FlaskConical className="h-4 w-4 mr-1" />{lisLoading ? "Buscando..." : "Buscar do Laboratório (LIS)"}
          </Button>
        </div>
        {lisFetchedAt && <div className="text-xs text-muted-foreground mb-2">Valores do LIS de {lisFetchedAt}</div>}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Field label="Hb (g/dL)"><Input type="number" step="0.1" value={hb} onChange={(e) => setHb(e.target.value)} /></Field>
          <Field label="Ht (%)"><Input type="number" step="0.1" value={ht} onChange={(e) => setHt(e.target.value)} /></Field>
          <Field label="Plaquetas"><Input type="number" value={pl} onChange={(e) => setPl(e.target.value)} /></Field>
          <Field label="TP / INR"><Input type="number" step="0.01" value={tp} onChange={(e) => setTp(e.target.value)} /></Field>
          <Field label="TTPA (s)"><Input type="number" step="0.1" value={ttpa} onChange={(e) => setTtpa(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-3 mt-3">
          <Field label="Diagnóstico" required><Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} required /></Field>
          <Field label="Indicação clínica" required><Textarea rows={3} value={indication} onChange={(e) => setIndication(e.target.value)} required /></Field>
        </div>
      </Section>

      {/* Section C — Component */}
      <Section title="C. Hemocomponente">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Tipo" required>
            <Select value={component} onValueChange={setComponent}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COMPONENT_MAIN.map((c) => <SelectItem key={c} value={c}>{c} — {COMPONENT_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Quantidade" required><Input id="quantity-input" type="number" min={1} max={10} defaultValue={1} required /></Field>
          <Field label="Urgência" required>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(URGENCY_LABELS).map(([k]) => (
                  <SelectItem key={k} value={k}>
                    <div>
                      <div>{URGENCY_LABELS[k]}</div>
                      <div className="text-xs text-muted-foreground">{URGENCY_DESC[k]}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <Label className="text-sm">Requisitos especiais</Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
            {(["irradiado","cmv","fenotipado","lavado","filtrado"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm capitalize">
                <Checkbox checked={special[k]} onCheckedChange={(v) => setSpecial({ ...special, [k]: !!v })} /> {k === "cmv" ? "CMV neg." : k}
              </label>
            ))}
          </div>
        </div>
        {isEmergency && (
          <div className="mt-3 border border-destructive/50 bg-destructive/10 rounded p-3 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
              <AlertCircle className="h-4 w-4" /> Emergência absoluta
            </div>
            <Field label="Justificativa de emergência" required>
              <Textarea rows={2} value={emergencyJust} onChange={(e) => setEmergencyJust(e.target.value)} required />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={emergencyAck} onCheckedChange={(v) => setEmergencyAck(!!v)} />
              <span>Estou ciente do risco de liberação sem prova cruzada — liberar bolsa O negativo.</span>
            </label>
          </div>
        )}
        <Field label="Observações" className="mt-3"><Textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} /></Field>
      </Section>

      {/* Section D — Confirmation */}
      <Section title="D. Confirmação">
        <div className="text-sm bg-muted/30 p-3 rounded space-y-1">
          <div><strong>Paciente:</strong> {patient ? `${patient.full_name} (${patient.mrn})` : "—"}</div>
          <div><strong>Componente:</strong> {component} — {COMPONENT_LABELS[component]}</div>
          <div><strong>Urgência:</strong> {URGENCY_LABELS[urgency]}</div>
          <div><strong>Médico solicitante:</strong> {profile?.full_name ?? "—"} {(profile as any)?.registro_profissional && `(CRM ${(profile as any).registro_profissional})`}</div>
          <div><strong>Data/Hora:</strong> {new Date().toLocaleString("pt-BR")}</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <Button onClick={() => submit("save")} disabled={busy} className="flex-1">
            <Send className="h-4 w-4 mr-1" />{busy ? "Enviando..." : "Enviar para Agência Transfusional"}
          </Button>
          <Button type="button" variant="outline" onClick={() => submit("print")}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir Formulário
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-primary border-b pb-1 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, children, className }: any) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className={required ? "req-asterisk text-xs" : "text-xs"}>{label}</Label>
      {children}
    </div>
  );
}

// ===== Detail Drawer / timeline =====
const STATUS_FLOW = [
  "pendente", "em_analise", "aguardando_amostra", "testes_em_andamento",
  "pronto_dispensar", "dispensado", "transfundindo", "concluido",
];

function RequestDetail({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { data } = useQuery({
    queryKey: ["request-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("transfusion_requests")
        .select("*, patients(full_name, mrn, blood_type), profiles:requesting_physician_id(full_name, registro_profissional)")
        .eq("id", id!).single();
      return data;
    },
  });
  const update = async (status: string) => {
    if (!id) return;
    const { error } = await supabase.from("transfusion_requests").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "cancelado" ? "Solicitação cancelada" : "Análise iniciada");
    onChanged(); onClose();
  };
  if (!id) return null;
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Solicitação</DialogTitle></DialogHeader>
        {!data ? <Skeleton className="h-40 w-full" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2 text-sm">
              <div><strong>Paciente:</strong> {data.patients?.full_name} ({data.patients?.mrn})</div>
              <div><strong>Componente:</strong> {data.component_type} × {data.quantity}</div>
              <div><strong>Urgência:</strong> <span className={`px-2 py-0.5 rounded text-xs ${urgencyBadgeClass(data.urgency)}`}>{URGENCY_LABELS[data.urgency]}</span></div>
              <div><strong>Diagnóstico:</strong> {data.diagnosis}</div>
              <div><strong>Indicação:</strong> {data.clinical_indication}</div>
              <div><strong>Médico:</strong> {data.profiles?.full_name ?? "—"}</div>
              {data.emergency_justification && <div className="text-destructive"><strong>Justificativa emergência:</strong> {data.emergency_justification}</div>}
              <div className="flex gap-2 pt-3">
                {data.status === "pendente" && <Button size="sm" onClick={() => update("em_analise")}>Iniciar Análise</Button>}
                {data.status !== "cancelado" && data.status !== "concluido" && (
                  <Button size="sm" variant="destructive" onClick={() => update("cancelado")}>Cancelar</Button>
                )}
              </div>
            </div>
            <div className="border-l pl-4">
              <div className="text-xs font-semibold text-muted-foreground mb-2">TIMELINE</div>
              <ol className="space-y-2">
                {STATUS_FLOW.map((s) => {
                  const idx = STATUS_FLOW.indexOf(data.status);
                  const cur = STATUS_FLOW.indexOf(s);
                  const reached = cur <= idx && idx >= 0;
                  return (
                    <li key={s} className="flex items-center gap-2 text-xs">
                      <div className={`h-2 w-2 rounded-full ${reached ? "bg-primary" : "bg-muted"}`} />
                      <span className={reached ? "text-foreground" : "text-muted-foreground"}>{REQUEST_STATUS_LABELS[s]}</span>
                    </li>
                  );
                })}
                {data.status === "cancelado" && (
                  <li className="flex items-center gap-2 text-xs text-destructive"><div className="h-2 w-2 rounded-full bg-destructive" />Cancelado</li>
                )}
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
