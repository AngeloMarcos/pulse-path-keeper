import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  BLOOD_TYPE_LABELS, COMPONENT_LABELS, URGENCY_LABELS,
  bloodTypeBadgeClass, urgencyBadgeClass,
} from "@/lib/domain";
import { printTransfusionForm, type VitalRow } from "@/lib/request-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert, CheckCircle2, Printer, FlaskConical, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transfusoes")({ component: TransfusoesPage });

type QueueRow = any;

function ageBadge(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (h < 1) return { cls: "bg-success text-success-foreground", text: `${Math.round(h*60)} min` };
  if (h < 4) return { cls: "bg-warning text-warning-foreground", text: `${h.toFixed(1)} h` };
  return { cls: "bg-destructive text-destructive-foreground", text: `${h.toFixed(1)} h` };
}

function TransfusoesPage() {
  const qc = useQueryClient();
  const [filterUrg, setFilterUrg] = useState<string>("all");
  const [filterWard, setFilterWard] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<"history" | "queue">("queue");

  // Queue: requests pronto_dispensar with their reserved/ready bag (from pre_transfusion_tests)
  const { data: queue = [] } = useQuery({
    queryKey: ["transfusion-queue"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfusion_requests")
        .select(`id, urgency, component_type, quantity, status, created_at,
          patient:patients(id, full_name, mrn, blood_type),
          tests:pre_transfusion_tests(id, blood_unit_id, validated_at,
            unit:blood_units(id, bag_number, blood_type, component_type, volume_ml, status))`)
        .eq("status", "pronto_dispensar")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["transfusoes-history"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("transfusions")
        .select("id, started_at, finished_at, completed, intercurrence, transfusion_suspended, volume_transfused_ml, patients(full_name, mrn), blood_units(bag_number, component_type, blood_type)")
        .order("started_at", { ascending: false }).limit(50);
      return (data ?? []) as any[];
    },
  });

  const filtered = useMemo(() => queue.filter((r: any) => {
    if (filterUrg !== "all" && r.urgency !== filterUrg) return false;
    if (filterType !== "all" && r.component_type !== filterType) return false;
    return true;
  }), [queue, filterUrg, filterType]);

  const opened = openId ? queue.find((r: any) => r.id === openId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Acompanhamento de Transfusão</h1>
          <p className="text-sm text-muted-foreground">POP-GSAT-05 — Entrega, monitoramento e finalização</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="queue">Fila para entrega ({queue.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Urgência</Label>
                <Select value={filterUrg} onValueChange={setFilterUrg}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(URGENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hemocomponente</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(COMPONENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Setor (busca)</Label>
                <Input value={filterWard} onChange={(e) => setFilterWard(e.target.value)} placeholder="filtro livre" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Bolsas prontas para dispensar</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-2">Paciente</th>
                    <th className="text-left p-2">Prontuário</th>
                    <th className="text-left p-2">Componente</th>
                    <th className="text-left p-2">Bolsa</th>
                    <th className="text-left p-2">Grupo</th>
                    <th className="text-left p-2">Urgência</th>
                    <th className="text-left p-2">Há quanto tempo</th>
                    <th className="text-left p-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r: any) => {
                    const test = r.tests?.[0];
                    const unit = test?.unit;
                    const a = ageBadge(r.created_at);
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{r.patient?.full_name}</td>
                        <td className="p-2 font-mono text-xs">{r.patient?.mrn}</td>
                        <td className="p-2">{COMPONENT_LABELS[r.component_type] ?? r.component_type}</td>
                        <td className="p-2 font-mono text-xs">{unit?.bag_number ?? "—"}</td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${bloodTypeBadgeClass(unit?.blood_type ?? "")}`}>{BLOOD_TYPE_LABELS[unit?.blood_type] ?? "—"}</span></td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${urgencyBadgeClass(r.urgency)}`}>{URGENCY_LABELS[r.urgency]}</span></td>
                        <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${a.cls}`}>{a.text}</span></td>
                        <td className="p-2">
                          <Button size="sm" disabled={!unit} onClick={() => setOpenId(r.id)}>Iniciar Entrega</Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma bolsa pronta para dispensar</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-base">Transfusões recentes</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-2">Paciente</th>
                    <th className="text-left p-2">Bolsa</th>
                    <th className="text-left p-2">Componente</th>
                    <th className="text-left p-2">Início</th>
                    <th className="text-left p-2">Término</th>
                    <th className="text-left p-2">Volume</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((t: any) => (
                    <tr key={t.id} className="border-b">
                      <td className="p-2">{t.patients?.full_name}</td>
                      <td className="p-2 font-mono text-xs">{t.blood_units?.bag_number}</td>
                      <td className="p-2">{COMPONENT_LABELS[t.blood_units?.component_type] ?? t.blood_units?.component_type}</td>
                      <td className="p-2">{new Date(t.started_at).toLocaleString("pt-BR")}</td>
                      <td className="p-2">{t.finished_at ? new Date(t.finished_at).toLocaleString("pt-BR") : "—"}</td>
                      <td className="p-2">{t.volume_transfused_ml ?? "—"} ml</td>
                      <td className="p-2">
                        {t.transfusion_suspended ? <Badge variant="destructive">Suspensa</Badge>
                          : t.completed ? <Badge className="bg-success text-success-foreground">Concluída</Badge>
                          : <Badge variant="outline">Em andamento</Badge>}
                        {t.intercurrence && <Badge variant="outline" className="ml-1">⚠ intercorrência</Badge>}
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum registro</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>POP-GSAT-05 — Acompanhamento de Transfusão</SheetTitle>
          </SheetHeader>
          {opened && <DeliveryForm request={opened} onDone={() => {
            setOpenId(null);
            qc.invalidateQueries({ queryKey: ["transfusion-queue"] });
            qc.invalidateQueries({ queryKey: ["transfusoes-history"] });
          }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================
// Delivery + Monitoring + Finalization Form
// ============================================================
const VITAL_MOMENTS = ["Pré-transfusão", "15 minutos", "30 minutos", "60 minutos", "Pós-transfusão"];

function DeliveryForm({ request, onDone }: { request: QueueRow; onDone: () => void }) {
  const { profile } = useAuth();
  const test = request.tests?.[0];
  const unit = test?.unit;
  const patient = request.patient;
  const compatible = patient?.blood_type === unit?.blood_type;

  // Section 1
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState(false);
  const [techAt, setTechAt] = useState(profile?.full_name ?? "");
  const [deliveryAt, setDeliveryAt] = useState(new Date().toISOString().slice(0, 16));
  const [nurse, setNurse] = useState("");
  const [receiveAt, setReceiveAt] = useState(new Date().toISOString().slice(0, 16));
  const [ward, setWard] = useState("");
  const [techSig, setTechSig] = useState(profile?.full_name ?? "");
  const [nurseSig, setNurseSig] = useState("");

  const [transfusionId, setTransfusionId] = useState<string | null>(null);

  // Section 2
  const [vitals, setVitals] = useState<VitalRow[]>(
    VITAL_MOMENTS.map((label) => ({ label, datetime: null, pas: null, pad: null, fc: null, temp: null, spo2: null, obs: null }))
  );
  const [accessRoute, setAccessRoute] = useState("");
  const [accessOther, setAccessOther] = useState("");
  const [flowRate, setFlowRate] = useState("");

  // Section 3
  const [intercurrence, setIntercurrence] = useState(false);
  const [intDesc, setIntDesc] = useState("");
  const [intTime, setIntTime] = useState("");
  const [intAction, setIntAction] = useState("");
  const [suspended, setSuspended] = useState(false);
  const [volSuspended, setVolSuspended] = useState<string>("");
  const [bagDest, setBagDest] = useState("");
  const [suspendJustify, setSuspendJustify] = useState("");

  // Section 4
  const [finishedAt, setFinishedAt] = useState(new Date().toISOString().slice(0, 16));
  const [volTotal, setVolTotal] = useState<string>("");
  const CHECK_ITEMS = [
    "Transfusão concluída sem intercorrências graves",
    "Sinais vitais pós-transfusão registrados",
    "Paciente orientado sobre sinais de reação tardia",
    "Equipos e bolsa descartados conforme normas",
    "Registro no prontuário do paciente realizado",
  ];
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const allChecked = CHECK_ITEMS.every((c) => checks[c]);

  // Auto-error scan if mismatch
  useEffect(() => {
    if (!scanCode) { setScanError(false); return; }
    setScanError(scanCode.trim() !== unit?.bag_number);
  }, [scanCode, unit?.bag_number]);

  async function confirmDelivery() {
    // Bloqueio: bolsa vencida
    if (unit?.expiration_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const exp = new Date(unit.expiration_date); exp.setHours(0, 0, 0, 0);
      if (exp < today) {
        toast.error("Bolsa vencida — dispensação bloqueada.");
        // Descarte automático
        await supabase
          .from("blood_units")
          .update({
            status: "descartado",
            discard_reason: "vencimento",
            discarded_at: new Date().toISOString(),
          } as any)
          .eq("id", unit.id);
        return;
      }
    }
    if (scanCode.trim() !== unit?.bag_number) {
      toast.error("Código da bolsa não confere — processo interrompido.");
      return;
    }
    if (!compatible) { toast.error("Tipos sanguíneos incompatíveis."); return; }
    if (!techAt || !nurse || !ward || !techSig || !nurseSig) {
      toast.error("Preencha todos os campos de entrega e assinaturas."); return;
    }
    // Insert dispensation
    const { data: disp, error: dispErr } = await supabase.from("dispensations").insert({
      request_id: request.id,
      blood_unit_id: unit.id,
      ward,
      received_by_name: nurse,
      bag_confirmed: true,
      dispensed_at: new Date(deliveryAt).toISOString(),
    }).select("id").single();
    if (dispErr) { toast.error(dispErr.message); return; }

    // Open transfusion record
    const { data: tr, error: trErr } = await supabase.from("transfusions").insert({
      patient_id: patient.id,
      blood_unit_id: unit.id,
      dispensation_id: disp.id,
      started_at: new Date(receiveAt).toISOString(),
    }).select("id").single();
    if (trErr) { toast.error(trErr.message); return; }

    // Update statuses
    await supabase.from("transfusion_requests").update({ status: "transfundindo" }).eq("id", request.id);
    await supabase.from("blood_units").update({ status: "dispensado" }).eq("id", unit.id);

    // Audit log: transfusão iniciada
    await supabase.rpc("insert_audit_log", {
      p_table: "transfusions",
      p_record_id: tr.id,
      p_action: "transfusion_started",
      p_new: {
        transfusion_id: tr.id,
        request_id: request.id,
        blood_unit_id: unit.id,
        patient_id: patient.id,
        bag_number: unit.bag_number,
        ward,
      } as any,
    });

    setTransfusionId(tr.id);
    toast.success("Entrega confirmada — acompanhamento aberto.");
    setStep(2);
  }

  function updateVital(idx: number, field: keyof VitalRow, value: any) {
    setVitals((v) => v.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }

  async function saveVitalRow(idx: number) {
    if (!transfusionId) return;
    const row = vitals[idx];
    const updated = [...vitals];
    if (!row.datetime) { updated[idx] = { ...row, datetime: new Date().toISOString() }; setVitals(updated); }
    const accessFinal = accessRoute === "Outro" ? `Outro: ${accessOther}` : accessRoute;
    const { error } = await supabase.from("transfusions").update({
      vital_signs: updated,
      access_route: accessFinal || null,
    }).eq("id", transfusionId);
    if (error) toast.error(error.message); else toast.success(`${row.label} registrado.`);
  }

  async function finishTransfusion() {
    if (!transfusionId) return;
    if (!allChecked) { toast.error("Marque todos os itens do checklist."); return; }

    const accessFinal = accessRoute === "Outro" ? `Outro: ${accessOther}` : accessRoute;

    const { error } = await supabase.from("transfusions").update({
      finished_at: new Date(finishedAt).toISOString(),
      volume_transfused_ml: Number(volTotal) || (suspended ? Number(volSuspended) : unit?.volume_ml) || null,
      completed: !suspended,
      transfusion_suspended: suspended,
      intercurrence,
      intercurrence_description: intercurrence ? intDesc : null,
      bag_destination: suspended ? bagDest : null,
      vital_signs: vitals,
      access_route: accessFinal || null,
      his_sync_at: new Date().toISOString(),
    }).eq("id", transfusionId);
    if (error) { toast.error(error.message); return; }

    await supabase.from("transfusion_requests").update({ status: "concluido" }).eq("id", request.id);
    await supabase.from("blood_units").update({ status: suspended ? "descartado" : "transfundido" }).eq("id", unit.id);

    // Simulate HIS push
    await supabase.from("his_lis_events").insert({
      direction: "outbound",
      integration_type: "his",
      endpoint: "/his/transfusion-complete",
      status: "success",
      payload: { transfusion_id: transfusionId, patient_mrn: patient.mrn, bag: unit.bag_number, volume_ml: Number(volTotal) || null, completed: !suspended } as any,
    } as any);

    toast.success("Transfusão concluída e registrada com sucesso.");
    setTimeout(() => toast.success("✓ Dados enviados ao prontuário eletrônico"), 600);
    onDone();
  }

  function doPrint() {
    const accessFinal = accessRoute === "Outro" ? `Outro: ${accessOther}` : accessRoute;
    printTransfusionForm({
      patient_name: patient?.full_name ?? "",
      mrn: patient?.mrn ?? "",
      bed: ward,
      patient_blood_type: BLOOD_TYPE_LABELS[patient?.blood_type] ?? "—",
      bag_number: unit?.bag_number ?? "",
      bag_blood_type: BLOOD_TYPE_LABELS[unit?.blood_type] ?? "—",
      component_type: COMPONENT_LABELS[unit?.component_type] ?? unit?.component_type ?? "",
      volume_total: unit?.volume_ml ?? 0,
      started_at: receiveAt,
      finished_at: finishedAt,
      technician_at: techAt,
      nurse,
      ward,
      access_route: accessFinal,
      flow_rate: flowRate,
      vitals,
      intercurrence,
      intercurrence_desc: intDesc,
      intercurrence_time: intTime,
      intercurrence_action: intAction,
      suspended,
      volume_transfused: volSuspended ? Number(volSuspended) : null,
      bag_destination: bagDest,
      volume_transfused_ml: volTotal ? Number(volTotal) : null,
      checklist: Object.fromEntries(CHECK_ITEMS.map((c) => [c, !!checks[c]])),
    });
  }

  const sectionBtn = (n: 1|2|3|4, label: string) => (
    <button onClick={() => transfusionId || n === 1 ? setStep(n) : null}
      className={`px-3 py-1.5 rounded text-xs font-medium ${step === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
      {n}. {label}
    </button>
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2">
        {sectionBtn(1, "Identificação")}
        {sectionBtn(2, "Sinais Vitais")}
        {sectionBtn(3, "Intercorrências")}
        {sectionBtn(4, "Finalização")}
      </div>

      {/* SECTION 1 */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4"/> Identificação e Dupla Checagem</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded">
              <div><span className="text-muted-foreground">Paciente:</span> <strong>{patient?.full_name}</strong></div>
              <div><span className="text-muted-foreground">Prontuário:</span> <strong>{patient?.mrn}</strong></div>
              <div><span className="text-muted-foreground">Hemocomponente:</span> <strong>{COMPONENT_LABELS[request.component_type]}</strong></div>
              <div><span className="text-muted-foreground">Bolsa:</span> <strong className="font-mono">{unit?.bag_number}</strong></div>
              <div><span className="text-muted-foreground">Solicitação:</span> {new Date(request.created_at).toLocaleString("pt-BR")}</div>
              <div><span className="text-muted-foreground">Volume:</span> {unit?.volume_ml} ml</div>
            </div>

            <div>
              <Label>🔍 Digite ou bipe o código da bolsa para confirmar a entrega</Label>
              <Input autoFocus value={scanCode} onChange={(e) => setScanCode(e.target.value)} placeholder="Código ISBT da bolsa" className={`font-mono ${scanError ? "border-destructive" : ""}`} />
              {scanError && (
                <div className="mt-2 p-3 rounded bg-destructive text-destructive-foreground text-sm flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5"/>
                  <div><strong>⛔ BOLSA INCORRETA</strong> — O código lido não corresponde à bolsa vinculada a este paciente. INTERROMPA O PROCESSO e verifique a identificação.</div>
                </div>
              )}
            </div>

            <div className={`p-3 rounded grid grid-cols-2 gap-3 text-center ${compatible ? "bg-success/15 border border-success/40" : "bg-destructive/15 border border-destructive/40"}`}>
              <div>
                <div className="text-xs text-muted-foreground">Tipo do PACIENTE</div>
                <div className="text-2xl font-bold">{BLOOD_TYPE_LABELS[patient?.blood_type] ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Tipo da BOLSA</div>
                <div className="text-2xl font-bold">{BLOOD_TYPE_LABELS[unit?.blood_type] ?? "—"}</div>
              </div>
              <div className="col-span-2 text-sm font-medium">
                {compatible ? "✓ Compatíveis" : "⛔ INCOMPATÍVEIS — não prosseguir"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Técnico AT (entrega)</Label><Input value={techAt} onChange={(e)=>setTechAt(e.target.value)} /></div>
              <div><Label>Data/hora da entrega pela AT</Label><Input type="datetime-local" value={deliveryAt} onChange={(e)=>setDeliveryAt(e.target.value)} /></div>
              <div><Label>Enfermeiro(a) que recebeu</Label><Input value={nurse} onChange={(e)=>setNurse(e.target.value)} /></div>
              <div><Label>Data/hora do recebimento</Label><Input type="datetime-local" value={receiveAt} onChange={(e)=>setReceiveAt(e.target.value)} /></div>
              <div className="col-span-2"><Label>Setor / unidade de destino</Label><Input value={ward} onChange={(e)=>setWard(e.target.value)} placeholder="ex: UTI Adulto - Leito 12" /></div>
              <div><Label>Assinatura — Técnico AT</Label><Input value={techSig} onChange={(e)=>setTechSig(e.target.value)} /></div>
              <div><Label>Assinatura — Enfermeiro(a)</Label><Input value={nurseSig} onChange={(e)=>setNurseSig(e.target.value)} /></div>
            </div>

            <Button className="w-full" disabled={scanError || !scanCode || !compatible} onClick={confirmDelivery}>
              Confirmar Entrega e Abrir Acompanhamento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SECTION 2 */}
      {step === 2 && transfusionId && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4"/> Monitoramento de Sinais Vitais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs bg-muted/30 p-2 rounded">
              <div><b>{patient?.full_name}</b></div>
              <div>MRN: {patient?.mrn}</div>
              <div>Bolsa: <span className="font-mono">{unit?.bag_number}</span></div>
              <div>{COMPONENT_LABELS[unit?.component_type]}</div>
              <div>{BLOOD_TYPE_LABELS[unit?.blood_type]}</div>
              <div>Volume: {unit?.volume_ml} ml</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Via de acesso</Label>
                <Select value={accessRoute} onValueChange={setAccessRoute}>
                  <SelectTrigger><SelectValue placeholder="selecionar"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVP MSD">AVP membro superior direito</SelectItem>
                    <SelectItem value="AVP MSE">AVP membro superior esquerdo</SelectItem>
                    <SelectItem value="AVP MI">AVP membro inferior</SelectItem>
                    <SelectItem value="CVC">CVC</SelectItem>
                    <SelectItem value="PICC">PICC</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {accessRoute === "Outro" && <Input className="mt-2" placeholder="especificar" value={accessOther} onChange={(e)=>setAccessOther(e.target.value)} />}
              </div>
              <div><Label>Fluxo de administração</Label><Input value={flowRate} onChange={(e)=>setFlowRate(e.target.value)} placeholder="ex: 60 ml/h ou 20 gts/min" /></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2">Momento</th>
                    <th className="p-2">Data/hora</th>
                    <th className="p-2">PAS</th><th className="p-2">PAD</th>
                    <th className="p-2">FC</th><th className="p-2">Temp</th><th className="p-2">SpO₂</th>
                    <th className="p-2">Obs</th><th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {vitals.map((v, idx) => (
                    <tr key={v.label} className="border-b">
                      <td className="p-1 font-medium">{v.label}</td>
                      <td className="p-1"><Input type="datetime-local" value={v.datetime ? v.datetime.slice(0,16) : ""} onChange={(e)=>updateVital(idx,"datetime", e.target.value ? new Date(e.target.value).toISOString() : null)} className="h-8 text-xs"/></td>
                      <td className="p-1"><Input type="number" value={v.pas ?? ""} onChange={(e)=>updateVital(idx,"pas", e.target.value ? Number(e.target.value) : null)} className="h-8 w-16 text-xs"/></td>
                      <td className="p-1"><Input type="number" value={v.pad ?? ""} onChange={(e)=>updateVital(idx,"pad", e.target.value ? Number(e.target.value) : null)} className="h-8 w-16 text-xs"/></td>
                      <td className="p-1"><Input type="number" value={v.fc ?? ""} onChange={(e)=>updateVital(idx,"fc", e.target.value ? Number(e.target.value) : null)} className="h-8 w-16 text-xs"/></td>
                      <td className="p-1"><Input type="number" step="0.1" value={v.temp ?? ""} onChange={(e)=>updateVital(idx,"temp", e.target.value ? Number(e.target.value) : null)} className="h-8 w-16 text-xs"/></td>
                      <td className="p-1"><Input type="number" value={v.spo2 ?? ""} onChange={(e)=>updateVital(idx,"spo2", e.target.value ? Number(e.target.value) : null)} className="h-8 w-16 text-xs"/></td>
                      <td className="p-1"><Input value={v.obs ?? ""} onChange={(e)=>updateVital(idx,"obs", e.target.value || null)} className="h-8 text-xs"/></td>
                      <td className="p-1"><Button size="sm" variant="outline" onClick={()=>saveVitalRow(idx)}>Registrar</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setStep(3)}>Próximo: Intercorrências</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3 */}
      {step === 3 && transfusionId && (
        <Card>
          <CardHeader><CardTitle className="text-base">Intercorrências</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">Ocorreu alguma intercorrência durante a transfusão?</div>
                <div className="text-xs text-muted-foreground">Default: NÃO</div>
              </div>
              <Switch checked={intercurrence} onCheckedChange={setIntercurrence} />
            </div>

            {intercurrence && (
              <div className="space-y-3 border-l-2 border-warning pl-4">
                <div><Label>Descrição da intercorrência *</Label><Textarea value={intDesc} onChange={(e)=>setIntDesc(e.target.value)} rows={3}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Horário</Label><Input type="datetime-local" value={intTime} onChange={(e)=>setIntTime(e.target.value)}/></div>
                </div>
                <div><Label>Conduta tomada</Label><Textarea value={intAction} onChange={(e)=>setIntAction(e.target.value)} rows={2}/></div>

                <div className="flex items-center justify-between border rounded p-3">
                  <div className="font-medium">Transfusão foi suspensa?</div>
                  <Switch checked={suspended} onCheckedChange={setSuspended} />
                </div>

                {suspended && (
                  <div className="space-y-3 border-l-2 border-destructive pl-4">
                    <div><Label>Volume transfundido até a suspensão (ml)</Label><Input type="number" value={volSuspended} onChange={(e)=>setVolSuspended(e.target.value)}/></div>
                    <div>
                      <Label>Destino da bolsa</Label>
                      <Select value={bagDest} onValueChange={setBagDest}>
                        <SelectTrigger><SelectValue placeholder="selecionar"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="devolvida_at">Devolvida à AT para avaliação</SelectItem>
                          <SelectItem value="descartada_setor">Descartada no setor</SelectItem>
                          <SelectItem value="investigacao">Enviada para investigação transfusional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Justificativa</Label><Textarea value={suspendJustify} onChange={(e)=>setSuspendJustify(e.target.value)} rows={2}/></div>

                    <Button variant="destructive" onClick={() => {
                      const params = new URLSearchParams({
                        patient: patient.id, bag: unit.id, transfusion: transfusionId,
                        volume: volSuspended, time: intTime,
                      });
                      window.open(`/reacoes?${params.toString()}`, "_blank");
                    }}>
                      <FlaskConical className="h-4 w-4 mr-2"/> Abrir Ficha de Investigação Transfusional (FIT)
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setStep(2)}>Voltar</Button>
              <Button onClick={()=>setStep(4)}>Próximo: Finalização</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 4 */}
      {step === 4 && transfusionId && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Finalização da Transfusão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data/hora de término</Label><Input type="datetime-local" value={finishedAt} onChange={(e)=>setFinishedAt(e.target.value)}/></div>
              <div><Label>Volume total transfundido (ml)</Label><Input type="number" value={volTotal} onChange={(e)=>setVolTotal(e.target.value)} placeholder={`${unit?.volume_ml ?? ""}`}/></div>
            </div>

            <div className="space-y-2 border rounded p-3">
              <div className="font-medium text-sm">Checklist final (todos obrigatórios)</div>
              {CHECK_ITEMS.map((item) => (
                <label key={item} className="flex items-start gap-2 text-sm">
                  <Checkbox checked={!!checks[item]} onCheckedChange={(c)=>setChecks((s)=>({...s, [item]: !!c}))}/>
                  <span>{item}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={doPrint}><Printer className="h-4 w-4 mr-2"/> Imprimir Formulário</Button>
              <Button onClick={finishTransfusion} disabled={!allChecked} className="bg-success text-success-foreground hover:bg-success/90">
                <CheckCircle2 className="h-4 w-4 mr-2"/> Concluir Transfusão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
