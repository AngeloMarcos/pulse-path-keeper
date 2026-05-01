import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BLOOD_TYPE_LABELS, bloodTypeBadgeClass, COMPONENT_LABELS,
  REQUEST_STATUS_LABELS, URGENCY_LABELS, urgencyBadgeClass, statusBadgeClass, expirationClass,
} from "@/lib/domain";
import { compatibleUnitsFor, aboFromBloodType, rhFromBloodType, printDispensationLabel } from "@/lib/blood-helpers";
import { AlertCircle, AlertTriangle, CheckCircle2, Printer, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/testes")({ component: TestesPage });

function TestesPage() {
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [componentFilter, setComponentFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["testes-list", urgencyFilter, componentFilter],
    queryFn: async () => {
      let q = supabase.from("transfusion_requests")
        .select("*, patients(full_name, mrn, blood_type, blood_type_confirmed, irradiation_required, cmv_negative_required, pai_status, pai_antibodies)")
        .in("status", ["em_analise", "aguardando_amostra"])
        .order("created_at");
      if (urgencyFilter !== "all") q = q.eq("urgency", urgencyFilter as any);
      if (componentFilter !== "all") q = q.eq("component_type", componentFilter as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Testes Pré-Transfusionais</h1>
      <Card>
        <CardHeader className="flex flex-row gap-2 flex-wrap items-center">
          <CardTitle className="mr-auto text-base">Fila de solicitações</CardTitle>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas urgências</SelectItem>
              {Object.entries(URGENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={componentFilter} onValueChange={setComponentFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos componentes</SelectItem>
              {Object.entries(COMPONENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{k} — {v}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left p-2">Paciente</th>
                  <th className="text-left p-2">Componente</th>
                  <th className="text-left p-2">Qtd</th>
                  <th className="text-left p-2">Urgência</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Recebida</th>
                  <th className="text-left p-2"></th>
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
                    <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2"><Button size="sm" onClick={() => setOpenId(r.id)}>Abrir testes</Button></td>
                  </tr>
                ))}
                {data?.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma solicitação na fila</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <PreTransfusionDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

// ===== Main 4-tab dialog =====
function PreTransfusionDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { user, profile, hasAnyRole } = useAuth();
  const qc = useQueryClient();
  const canValidate = hasAnyRole(["biomedico", "hemoterapeuta"]);

  const [tab, setTab] = useState("tipagem");
  // Tipagem
  const [aboReceptor, setAboReceptor] = useState("");
  const [rhReceptor, setRhReceptor] = useState("");
  const [paiResult, setPaiResult] = useState("");
  const [paiAntibody, setPaiAntibody] = useState("");
  // Bolsa
  const [selectedBag, setSelectedBag] = useState<any>(null);
  const [bagConfirmInput, setBagConfirmInput] = useState("");
  const [bagConfirmed, setBagConfirmed] = useState(false);
  // Prova cruzada
  const [crossResult, setCrossResult] = useState<string>("");
  const [crossMethod, setCrossMethod] = useState<string>("gel");
  const [crossNotes, setCrossNotes] = useState("");
  const [showIncompatModal, setShowIncompatModal] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState("");
  // Tipagem divergente
  const [typingJustification, setTypingJustification] = useState("");
  // Checklist
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    tipagem: false, pai: false, prova: false, validade: false, integridade: false, rotulo: false,
  });
  const [validating, setValidating] = useState(false);

  const { data: req } = useQuery({
    queryKey: ["test-req", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("transfusion_requests")
        .select("*, patients(*)")
        .eq("id", id!).single();
      return data as any;
    },
  });

  // Reset state when dialog reopens
  useEffect(() => {
    if (!id) return;
    setTab("tipagem"); setSelectedBag(null); setBagConfirmInput(""); setBagConfirmed(false);
    setCrossResult(""); setCrossNotes("");
    setChecklist({ tipagem: false, pai: false, prova: false, validade: false, integridade: false, rotulo: false });
    if (req?.patients) {
      setAboReceptor(aboFromBloodType(req.patients.blood_type));
      setRhReceptor(rhFromBloodType(req.patients.blood_type));
      setPaiResult(req.patients.pai_status ?? "");
      setPaiAntibody(req.patients.pai_antibodies ?? "");
    }
  }, [id, req?.id]);

  const compatGroups = useMemo(() => {
    if (!req?.patients) return [];
    return compatibleUnitsFor(req.patients.blood_type, req.component_type);
  }, [req]);

  const { data: stock } = useQuery({
    queryKey: ["test-stock", req?.component_type, compatGroups.join(",")],
    enabled: !!req,
    queryFn: async () => {
      const { data } = await supabase.from("blood_units")
        .select("*").eq("status", "disponivel")
        .eq("component_type", req!.component_type as any)
        .in("blood_type", compatGroups as any)
        .order("expiration_date");
      return (data ?? []) as any[];
    },
  });

  const cadastroBT = req?.patients?.blood_type ?? "";
  const digitadoBT = aboReceptor && rhReceptor ? `${aboReceptor}_${rhReceptor === "+" ? "POS" : "NEG"}` : "";
  const typingDiscrepancy = cadastroBT && cadastroBT !== "NAO_TIPADO" && digitadoBT && digitadoBT !== cadastroBT;

  const irradiationMismatch = selectedBag && req?.patients?.irradiation_required && !selectedBag.irradiated;
  const cmvMismatch = selectedBag && req?.patients?.cmv_negative_required && !selectedBag.cmv_negative;

  const confirmBag = () => {
    if (!selectedBag) return;
    if (bagConfirmInput.trim() !== selectedBag.bag_number) {
      toast.error("Código divergente — verifique a bolsa");
      setBagConfirmed(false);
      return;
    }
    setBagConfirmed(true);
    toast.success("Bolsa confirmada");
  };

  const paiBlocked = paiResult === "positivo" && !paiAntibody.trim();
  const allChecked = Object.values(checklist).every(Boolean);
  const canRelease = canValidate && bagConfirmed && crossResult === "compativel" && !typingDiscrepancy && !paiBlocked && !irradiationMismatch && allChecked;
  const crossIncompatible = crossResult === "incompativel";

  const handleCrossResult = (v: string) => {
    setCrossResult(v);
    if (v === "incompativel") setShowIncompatModal(true);
  };

  const release = async () => {
    if (!req || !selectedBag) return;
    setValidating(true);
    const checklistJson = { ...checklist };
    const { error: e1 } = await supabase.from("pre_transfusion_tests").insert({
      request_id: req.id,
      blood_unit_id: selectedBag.id,
      performed_by: user?.id,
      recipient_abo: aboReceptor,
      recipient_rh: rhReceptor,
      donor_abo: aboFromBloodType(selectedBag.blood_type),
      donor_rh: rhFromBloodType(selectedBag.blood_type),
      pai_result: (paiResult || null) as any,
      pai_antibody_identified: paiAntibody || null,
      crossmatch_result: crossResult as any,
      crossmatch_method: crossMethod as any,
      crossmatch_notes: crossNotes || null,
      checklist: checklistJson,
      validated_by: user?.id,
      validated_at: new Date().toISOString(),
    } as any);
    if (e1) { toast.error(e1.message); setValidating(false); return; }
    await supabase.from("transfusion_requests").update({ status: "pronto_dispensar" as any }).eq("id", req.id);
    await supabase.from("blood_units").update({ status: "reservado" as any }).eq("id", selectedBag.id);
    setValidating(false);
    toast.success("Validação concluída — bolsa liberada para dispensação");
    qc.invalidateQueries({ queryKey: ["testes-list"] });
    qc.invalidateQueries({ queryKey: ["units"] });
    onClose();
  };

  const printLabel = () => {
    if (!req || !selectedBag) return;
    printDispensationLabel({
      patient_name: req.patients.full_name,
      mrn: req.patients.mrn,
      bag_number: selectedBag.bag_number,
      blood_type: BLOOD_TYPE_LABELS[selectedBag.blood_type],
      expiration_date: selectedBag.expiration_date,
      released_at: new Date().toISOString(),
      professional: profile?.full_name ?? "—",
      component: COMPONENT_LABELS[selectedBag.component_type] ?? selectedBag.component_type,
    });
  };

  if (!id) return null;
  return (
    <>
      <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Testes pré-transfusionais
              {req && <span className="ml-2 text-sm font-normal text-muted-foreground">{req.patients.full_name} • {req.component_type} ×{req.quantity}</span>}
            </DialogTitle>
          </DialogHeader>

          {!req ? <Skeleton className="h-64" /> : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="tipagem">1. Tipagem & PAI</TabsTrigger>
                <TabsTrigger value="bolsa">2. Bolsa {bagConfirmed && <CheckCircle2 className="h-3 w-3 ml-1 text-success" />}</TabsTrigger>
                <TabsTrigger value="prova">3. Prova Cruzada {crossResult === "compativel" && <CheckCircle2 className="h-3 w-3 ml-1 text-success" />}</TabsTrigger>
                <TabsTrigger value="check">4. Validação</TabsTrigger>
              </TabsList>

              {/* ----- TAB 1 ----- */}
              <TabsContent value="tipagem" className="space-y-3 pt-3">
                <div className="flex items-center justify-between flex-wrap gap-2 bg-muted/30 p-3 rounded">
                  <div>
                    <div className="font-semibold">{req.patients.full_name}</div>
                    <div className="text-xs text-muted-foreground">Prontuário {req.patients.mrn}</div>
                  </div>
                  <span className={`px-3 py-1 rounded text-base ${bloodTypeBadgeClass(cadastroBT)}`}>
                    Cadastrado: {BLOOD_TYPE_LABELS[cadastroBT]} {req.patients.blood_type_confirmed && "✓"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="ABO receptor">
                    <Select value={aboReceptor} onValueChange={setAboReceptor}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["A","B","AB","O"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Rh receptor">
                    <Select value={rhReceptor} onValueChange={setRhReceptor}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{["+","-"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="ABO bolsa"><Input value={selectedBag ? aboFromBloodType(selectedBag.blood_type) : ""} disabled /></Field>
                  <Field label="Rh bolsa"><Input value={selectedBag ? rhFromBloodType(selectedBag.blood_type) : ""} disabled /></Field>
                </div>

                {typingDiscrepancy && (
                  <div className="bg-destructive/15 border border-destructive/40 text-destructive p-3 rounded flex gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div><strong>⚠ DISCREPÂNCIA DE TIPAGEM</strong> — cadastrado: {BLOOD_TYPE_LABELS[cadastroBT]}, digitado: {BLOOD_TYPE_LABELS[digitadoBT]}. Acione o hemoterapeuta.</div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                  <Field label="PAI">
                    <Select value={paiResult} onValueChange={setPaiResult}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="negativo">Negativo</SelectItem>
                        <SelectItem value="positivo">Positivo</SelectItem>
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {paiResult === "positivo" && (
                    <Field label="Anticorpo identificado" required>
                      <Input value={paiAntibody} onChange={(e) => setPaiAntibody(e.target.value)} placeholder="Ex.: anti-D, anti-K..." />
                    </Field>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Profissional: {profile?.full_name} • {new Date().toLocaleString("pt-BR")}</div>
              </TabsContent>

              {/* ----- TAB 2 ----- */}
              <TabsContent value="bolsa" className="space-y-3 pt-3">
                <div className="text-xs text-muted-foreground">
                  Filtrado por <strong>{req.component_type}</strong> compatível com <strong>{BLOOD_TYPE_LABELS[cadastroBT]}</strong>
                </div>
                <div className="border rounded overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground bg-muted/30">
                      <tr><th className="text-left p-2">ISBT</th><th className="text-left p-2">Grupo</th><th className="text-left p-2">Vol</th><th className="text-left p-2">Validade</th><th className="text-left p-2">Local</th><th className="text-left p-2">Especiais</th><th></th></tr>
                    </thead>
                    <tbody>
                      {(stock ?? []).map((u: any) => (
                        <tr key={u.id} className={`border-b ${selectedBag?.id === u.id ? "bg-primary/10" : "hover:bg-muted/40"}`}>
                          <td className="p-2 font-mono">{u.bag_number}</td>
                          <td className="p-2"><span className={`px-1.5 py-0.5 rounded ${bloodTypeBadgeClass(u.blood_type)}`}>{BLOOD_TYPE_LABELS[u.blood_type]}</span></td>
                          <td className="p-2">{u.volume_ml}ml</td>
                          <td className={`p-2 ${expirationClass(u.expiration_date)}`}>{new Date(u.expiration_date).toLocaleDateString("pt-BR")}</td>
                          <td className="p-2 text-muted-foreground">{u.location ?? "—"}</td>
                          <td className="p-2 space-x-1">
                            {u.irradiated && <span className="px-1 py-0.5 rounded bg-primary/20 text-primary-foreground text-[10px]">IRR</span>}
                            {u.cmv_negative && <span className="px-1 py-0.5 rounded bg-success/20 text-success text-[10px]">CMV-</span>}
                            {u.phenotyped && <span className="px-1 py-0.5 rounded bg-warning/20 text-warning text-[10px]">FEN</span>}
                          </td>
                          <td className="p-2"><Button size="sm" variant={selectedBag?.id === u.id ? "default" : "outline"} onClick={() => { setSelectedBag(u); setBagConfirmInput(""); setBagConfirmed(false); }}>Selecionar</Button></td>
                        </tr>
                      ))}
                      {(stock ?? []).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sem bolsas compatíveis disponíveis</td></tr>}
                    </tbody>
                  </table>
                </div>

                {selectedBag && (
                  <div className="border rounded p-3 space-y-2 bg-muted/20">
                    <div className="text-sm">Bolsa selecionada: <strong className="font-mono">{selectedBag.bag_number}</strong> ({BLOOD_TYPE_LABELS[selectedBag.blood_type]})</div>
                    {irradiationMismatch && (
                      <div className="bg-warning/15 border border-warning/40 text-warning p-2 rounded text-sm flex gap-2">
                        <AlertTriangle className="h-4 w-4" /> Paciente requer bolsa irradiada — selecione outra.
                      </div>
                    )}
                    {cmvMismatch && (
                      <div className="bg-warning/15 border border-warning/40 text-warning p-2 rounded text-sm flex gap-2">
                        <AlertTriangle className="h-4 w-4" /> Paciente requer CMV negativo — verifique.
                      </div>
                    )}
                    <Field label="Leia ou digite o código da bolsa para confirmar">
                      <div className="flex gap-2">
                        <Input value={bagConfirmInput} onChange={(e) => { setBagConfirmInput(e.target.value); setBagConfirmed(false); }} className="font-mono" placeholder="Bipie a bolsa..." />
                        <Button onClick={confirmBag} disabled={!bagConfirmInput}>Conferir</Button>
                      </div>
                    </Field>
                    {bagConfirmed && (
                      <div className="text-success flex items-center gap-1 text-sm"><CheckCircle2 className="h-4 w-4" /> Bolsa confirmada</div>
                    )}
                    {bagConfirmInput && !bagConfirmed && bagConfirmInput.trim() !== selectedBag.bag_number && (
                      <div className="text-destructive flex items-center gap-1 text-sm"><AlertTriangle className="h-4 w-4" /> CÓDIGO DIVERGENTE — verifique a bolsa.</div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ----- TAB 3 ----- */}
              <TabsContent value="prova" className="space-y-3 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Resultado">
                    <Select value={crossResult} onValueChange={handleCrossResult}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compativel">Compatível</SelectItem>
                        <SelectItem value="incompativel">Incompatível</SelectItem>
                        <SelectItem value="nao_realizado">Não realizada — emergência</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Método">
                    <Select value={crossMethod} onValueChange={setCrossMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gel">Gel</SelectItem>
                        <SelectItem value="tubo">Tubo</SelectItem>
                        <SelectItem value="microplaca">Microplaca</SelectItem>
                        <SelectItem value="eletronico">Eletrônico</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Observações técnicas"><Textarea rows={3} value={crossNotes} onChange={(e) => setCrossNotes(e.target.value)} /></Field>
                <div className="text-xs text-muted-foreground">Profissional: {profile?.full_name} • {new Date().toLocaleString("pt-BR")}</div>
                {crossIncompatible && (
                  <div className="bg-destructive text-destructive-foreground p-4 rounded font-semibold text-sm flex gap-2">
                    <XCircle className="h-5 w-5" /> 🚫 PROVA CRUZADA INCOMPATÍVEL — LIBERAÇÃO BLOQUEADA. Não transfundir. Acione o hemoterapeuta imediatamente.
                  </div>
                )}
              </TabsContent>

              {/* ----- TAB 4 ----- */}
              <TabsContent value="check" className="space-y-3 pt-3">
                {!canValidate && (
                  <div className="bg-warning/15 border border-warning/40 text-warning p-3 rounded text-sm flex gap-2">
                    <AlertCircle className="h-4 w-4" /> Apenas biomédicos e hemoterapeutas podem validar e liberar.
                  </div>
                )}
                <div className="space-y-2">
                  {[
                    ["tipagem", "Tipagem ABO/Rh do receptor confirmada"],
                    ["pai", "PAI verificada e documentada"],
                    ["prova", "Prova cruzada realizada e compatível"],
                    ["validade", "Validade da bolsa verificada (não vencida)"],
                    ["integridade", "Integridade física da bolsa verificada (sem vazamentos ou alterações)"],
                    ["rotulo", "Dados do rótulo da bolsa conferidos com a solicitação"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-start gap-2 text-sm">
                      <Checkbox checked={!!checklist[key]} onCheckedChange={(v) => setChecklist({ ...checklist, [key]: !!v })} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {!crossIncompatible && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-3">
                    <Button onClick={release} disabled={!canRelease || validating} className="flex-1">
                      <ShieldCheck className="h-4 w-4 mr-1" />{validating ? "Validando..." : "✓ Validar e Liberar para Dispensação"}
                    </Button>
                    <Button variant="outline" onClick={printLabel} disabled={!selectedBag}>
                      <Printer className="h-4 w-4 mr-1" /> Imprimir Etiqueta
                    </Button>
                  </div>
                )}
                {!canRelease && !crossIncompatible && (
                  <div className="text-xs text-muted-foreground">
                    Pendências para liberar:
                    <ul className="list-disc ml-5 mt-1">
                      {!bagConfirmed && <li>Confirmar leitura da bolsa</li>}
                      {crossResult !== "compativel" && <li>Prova cruzada compatível</li>}
                      {typingDiscrepancy && <li>Resolver discrepância de tipagem</li>}
                      {paiBlocked && <li>Identificar anticorpo PAI</li>}
                      {irradiationMismatch && <li>Selecionar bolsa irradiada</li>}
                      {!allChecked && <li>Marcar todos os itens do checklist</li>}
                    </ul>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Blocking modal for incompatible crossmatch */}
      <Dialog open={showIncompatModal} onOpenChange={setShowIncompatModal}>
        <DialogContent className="bg-destructive text-destructive-foreground border-destructive max-w-md">
          <DialogHeader><DialogTitle className="text-destructive-foreground flex items-center gap-2"><XCircle className="h-6 w-6" /> Prova cruzada incompatível</DialogTitle></DialogHeader>
          <div className="text-sm">
            🚫 <strong>LIBERAÇÃO BLOQUEADA.</strong><br />
            Não transfundir esta bolsa. Acione o hemoterapeuta imediatamente para análise do caso.
          </div>
          <Button variant="secondary" onClick={() => setShowIncompatModal(false)}>Entendido</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div className="space-y-1">
      <Label className={required ? "req-asterisk text-xs" : "text-xs"}>{label}</Label>
      {children}
    </div>
  );
}
