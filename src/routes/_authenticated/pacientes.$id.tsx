import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BLOOD_TYPES_WITH_UNTYPED, BLOOD_TYPE_LABELS, bloodTypeBadgeClass,
  COMPONENT_LABELS, REACTION_TYPE_LABELS, SEVERITY_LABELS,
} from "@/lib/domain";
import { ArrowLeft, AlertTriangle, ChevronDown, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({ component: PatientDetail });

function PatientDetail() {
  const { id } = useParams({ from: "/_authenticated/pacientes/$id" });
  const { data, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const [{ data: patient }, { data: trans }, { data: reactions }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).single(),
        supabase.from("transfusions")
          .select("*, blood_units(bag_number, component_type, blood_type, volume_ml), profiles:nurse_id(full_name)")
          .eq("patient_id", id).order("started_at", { ascending: false }),
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
            <div>
              <CardTitle>{p.full_name}</CardTitle>
              <div className="text-sm text-muted-foreground mt-1">Prontuário {p.mrn}</div>
            </div>
            <span className={`px-3 py-1 rounded text-sm ${bloodTypeBadgeClass(p.blood_type)}`}>
              {BLOOD_TYPE_LABELS[p.blood_type]} {p.blood_type_confirmed && "✓"}
            </span>
          </div>
        </CardHeader>
        {(p.irradiation_required || p.cmv_negative_required || p.alerts) && (
          <CardContent>
            <div className="bg-warning/10 border border-warning/30 rounded p-3 flex gap-2 text-warning text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                {p.irradiation_required && <div>• Requer hemocomponente irradiado</div>}
                {p.cmv_negative_required && <div>• Requer CMV negativo</div>}
                {p.alerts && <div>• {p.alerts}</div>}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados cadastrais</TabsTrigger>
          <TabsTrigger value="historico">Histórico transfusional ({data?.trans.length})</TabsTrigger>
          <TabsTrigger value="reacoes">Reações adversas ({data?.reactions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="dados"><PatientEditForm patient={p} /></TabsContent>
        <TabsContent value="historico"><TransfusionHistory rows={data?.trans ?? []} /></TabsContent>
        <TabsContent value="reacoes"><ReactionHistory rows={data?.reactions ?? []} /></TabsContent>
      </Tabs>
    </div>
  );
}

function PatientEditForm({ patient }: { patient: any }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [pai, setPai] = useState<string>(patient.pai_status ?? "");
  useEffect(() => setPai(patient.pai_status ?? ""), [patient.pai_status]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const obj: any = {
      full_name: fd.get("full_name"),
      mrn: fd.get("mrn"),
      cpf: fd.get("cpf") || null,
      birth_date: fd.get("birth_date"),
      blood_type: fd.get("blood_type"),
      blood_type_confirmed: fd.get("blood_type_confirmed") === "on",
      pai_status: fd.get("pai_status") || null,
      pai_antibodies: fd.get("pai_antibodies") || null,
      irradiation_required: fd.get("irradiation_required") === "on",
      cmv_negative_required: fd.get("cmv_negative_required") === "on",
      phenotyped: fd.get("phenotyped") === "on",
      alerts: fd.get("alerts") || null,
    };
    setBusy(true);
    const { error } = await supabase.from("patients").update(obj).eq("id", patient.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Paciente atualizado");
    qc.invalidateQueries({ queryKey: ["patient", patient.id] });
    qc.invalidateQueries({ queryKey: ["patients"] });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome completo" required className="sm:col-span-2"><Input name="full_name" defaultValue={patient.full_name} required /></Field>
            <Field label="Prontuário" required><Input name="mrn" defaultValue={patient.mrn} required /></Field>
            <Field label="CPF"><Input name="cpf" defaultValue={patient.cpf ?? ""} /></Field>
            <Field label="Data de nascimento" required><Input name="birth_date" type="date" defaultValue={patient.birth_date ?? ""} required /></Field>
            <Field label="Tipo sanguíneo">
              <Select name="blood_type" defaultValue={patient.blood_type}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES_WITH_UNTYPED.map((b) => <SelectItem key={b} value={b}>{BLOOD_TYPE_LABELS[b]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox name="blood_type_confirmed" defaultChecked={patient.blood_type_confirmed} /> Tipo sanguíneo confirmado
            </label>
            <Field label="PAI">
              <Select name="pai_status" value={pai} onValueChange={setPai}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="negativo">Negativo</SelectItem>
                  <SelectItem value="positivo">Positivo</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {pai === "positivo" && (
              <Field label="Anticorpo identificado"><Input name="pai_antibodies" defaultValue={patient.pai_antibodies ?? ""} /></Field>
            )}
          </div>
          <div className="space-y-2 border-t pt-3">
            <label className="flex items-center gap-2 text-sm"><Checkbox name="irradiation_required" defaultChecked={patient.irradiation_required} /> Requer irradiação</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="cmv_negative_required" defaultChecked={patient.cmv_negative_required} /> Requer CMV negativo</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="phenotyped" defaultChecked={patient.phenotyped} /> Fenotipado</label>
          </div>
          <Field label="Alertas clínicos"><Textarea name="alerts" defaultValue={patient.alerts ?? ""} rows={3} /></Field>
          <Button type="submit" disabled={busy}><Save className="h-4 w-4 mr-1" />{busy ? "Salvando..." : "Salvar alterações"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TransfusionHistory({ rows }: { rows: any[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const n = new Set(openIds);
    n.has(id) ? n.delete(id) : n.add(id);
    setOpenIds(n);
  };
  if (rows.length === 0) return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Nenhuma transfusão registrada</CardContent></Card>;
  return (
    <Card>
      <CardContent className="pt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th></th>
              <th className="text-left p-2">Data</th>
              <th className="text-left p-2">Hemocomponente</th>
              <th className="text-left p-2">Bolsa</th>
              <th className="text-left p-2">Grupo</th>
              <th className="text-left p-2">Volume</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t: any) => (
              <>
                <tr key={t.id} className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => toggle(t.id)}>
                  <td className="p-2 w-6">{openIds.has(t.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                  <td className="p-2">{new Date(t.started_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2">{COMPONENT_LABELS[t.blood_units?.component_type] ?? "—"}</td>
                  <td className="p-2 font-mono text-xs">{t.blood_units?.bag_number ?? "—"}</td>
                  <td className="p-2">{t.blood_units?.blood_type ? BLOOD_TYPE_LABELS[t.blood_units.blood_type] : "—"}</td>
                  <td className="p-2">{t.volume_transfused_ml ?? t.blood_units?.volume_ml ?? "—"} ml</td>
                  <td className="p-2">{t.completed ? "Concluída" : t.transfusion_suspended ? "Suspensa" : "Em curso"}</td>
                </tr>
                {openIds.has(t.id) && (
                  <tr className="bg-muted/20">
                    <td colSpan={7} className="p-3">
                      <div className="text-xs grid grid-cols-2 gap-2">
                        <div><strong>Acesso:</strong> {t.access_route ?? "—"}</div>
                        <div><strong>Intercorrência:</strong> {t.intercurrence ? "Sim" : "Não"}</div>
                        {t.intercurrence_description && <div className="col-span-2"><strong>Descrição:</strong> {t.intercurrence_description}</div>}
                        <div className="col-span-2">
                          <strong>Sinais vitais:</strong>
                          {t.vital_signs ? <pre className="text-xs mt-1 bg-background p-2 rounded">{JSON.stringify(t.vital_signs, null, 2)}</pre> : " sem registro"}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ReactionHistory({ rows }: { rows: any[] }) {
  const [open, setOpen] = useState<any | null>(null);
  if (rows.length === 0) return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Nenhuma reação registrada</CardContent></Card>;
  const sevColor = (s: string) => s === "fatal" ? "bg-destructive text-destructive-foreground" :
    s === "grave" ? "bg-destructive/80 text-destructive-foreground" :
    s === "moderada" ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground";
  return (
    <>
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left p-2">Data</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">Gravidade</th>
                <th className="text-left p-2">Desfecho</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b hover:bg-muted/40 cursor-pointer" onClick={() => setOpen(r)}>
                  <td className="p-2">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2">{REACTION_TYPE_LABELS[r.reaction_type] ?? r.reaction_type}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${sevColor(r.severity)}`}>{SEVERITY_LABELS[r.severity]}</span></td>
                  <td className="p-2 text-muted-foreground">{r.outcome ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>FIT — Ficha de Investigação Transfusional</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-2 text-sm">
              <Info label="Tipo de reação" value={REACTION_TYPE_LABELS[open.reaction_type] ?? open.reaction_type} />
              <Info label="Gravidade" value={SEVERITY_LABELS[open.severity]} />
              <Info label="Notificação" value={new Date(open.notification_datetime).toLocaleString("pt-BR")} />
              <Info label="Desfecho" value={open.outcome ?? "—"} />
              <Info label="Conclusão hemoterapeuta" value={open.hemoterapeuta_conclusion ?? "—"} />
              <Info label="NOTIVISA" value={open.notivisa_sent ? `Enviado: ${open.notivisa_protocol ?? "—"}` : "Não enviado"} />
              {open.symptoms && <div><div className="text-xs text-muted-foreground">Sintomas</div><pre className="text-xs bg-muted/40 p-2 rounded">{JSON.stringify(open.symptoms, null, 2)}</pre></div>}
              {open.actions_taken && <div><div className="text-xs text-muted-foreground">Ações tomadas</div><pre className="text-xs bg-muted/40 p-2 rounded">{JSON.stringify(open.actions_taken, null, 2)}</pre></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, required, children, className }: any) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className={required ? "req-asterisk" : ""}>{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}
