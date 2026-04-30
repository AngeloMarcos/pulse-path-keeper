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
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  COMPONENT_TYPES, COMPONENT_LABELS, URGENCY_LABELS, REQUEST_STATUS_LABELS,
  urgencyBadgeClass, statusBadgeClass,
} from "@/lib/domain";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/solicitacoes")({ component: SolicitacoesPage });

function SolicitacoesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["requests", statusFilter, urgencyFilter],
    queryFn: async () => {
      let q = supabase.from("transfusion_requests")
        .select("*, patients(full_name, mrn)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      if (urgencyFilter !== "all") q = q.eq("urgency", urgencyFilter as any);
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
          <SheetContent className="overflow-auto w-full sm:max-w-lg">
            <SheetHeader><SheetTitle>Nova solicitação</SheetTitle></SheetHeader>
            <RequestForm onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["requests"] }); }} />
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader className="flex flex-row gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(REQUEST_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(URGENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((r: any) => (
                  <tr key={r.id} className="border-b hover:bg-muted/40">
                    <td className="p-2">{r.patients?.full_name} <span className="text-xs text-muted-foreground">{r.patients?.mrn}</span></td>
                    <td className="p-2">{r.component_type}</td>
                    <td className="p-2">{r.quantity}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${urgencyBadgeClass(r.urgency)}`}>{URGENCY_LABELS[r.urgency]}</span></td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${statusBadgeClass(r.status)}`}>{REQUEST_STATUS_LABELS[r.status]}</span></td>
                    <td className="p-2 text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-2">
                      {r.status === "pendente" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "em_analise")}>Iniciar análise</Button>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma solicitação</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [urgency, setUrgency] = useState("rotina");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState<string>("");

  const { data: patients } = useQuery({
    queryKey: ["pat-search", patientSearch],
    queryFn: async () => {
      if (patientSearch.length < 2) return [];
      const { data } = await supabase.from("patients").select("id, full_name, mrn")
        .or(`full_name.ilike.%${patientSearch}%,mrn.ilike.%${patientSearch}%`).limit(8);
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patientId) { toast.error("Selecione um paciente"); return; }
    const fd = new FormData(e.currentTarget);
    const obj: any = {
      patient_id: patientId,
      requesting_physician_id: user?.id,
      component_type: fd.get("component_type"),
      quantity: Number(fd.get("quantity")),
      urgency,
      clinical_indication: fd.get("clinical_indication"),
      diagnosis: fd.get("diagnosis"),
      current_hemoglobin: fd.get("current_hemoglobin") ? Number(fd.get("current_hemoglobin")) : null,
      current_hematocrit: fd.get("current_hematocrit") ? Number(fd.get("current_hematocrit")) : null,
      emergency_justification: urgency === "emergencia" ? fd.get("emergency_justification") : null,
      status: "pendente",
    };
    if (!obj.clinical_indication || !obj.diagnosis) { toast.error("Indicação clínica e diagnóstico são obrigatórios"); return; }
    if (urgency === "emergencia" && !obj.emergency_justification) { toast.error("Justifique a emergência"); return; }
    setBusy(true);
    const { error } = await supabase.from("transfusion_requests").insert(obj);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Solicitação criada");
    onSaved();
  };

  return (
    <form onSubmit={submit} className="space-y-3 mt-4">
      <div className="space-y-1">
        <Label className="req-asterisk">Paciente</Label>
        <Input placeholder="Buscar nome ou prontuário..." value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); setPatientId(""); }} />
        {patients && patients.length > 0 && !patientId && (
          <div className="border rounded-md max-h-40 overflow-auto">
            {patients.map((p: any) => (
              <button key={p.id} type="button" className="w-full text-left p-2 hover:bg-muted text-sm" onClick={() => { setPatientId(p.id); setPatientSearch(`${p.full_name} (${p.mrn})`); }}>
                {p.full_name} <span className="text-muted-foreground text-xs">{p.mrn}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="req-asterisk">Componente</Label>
          <Select name="component_type" defaultValue="CH">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COMPONENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c} — {COMPONENT_LABELS[c]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="req-asterisk">Quantidade</Label>
          <Input name="quantity" type="number" min={1} defaultValue={1} required />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="req-asterisk">Urgência</Label>
        <Select value={urgency} onValueChange={setUrgency}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(URGENCY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {urgency === "emergencia" && (
        <div className="space-y-1">
          <Label className="req-asterisk text-destructive">Justificativa de emergência</Label>
          <Textarea name="emergency_justification" rows={2} required />
        </div>
      )}
      <div className="space-y-1"><Label className="req-asterisk">Indicação clínica</Label><Textarea name="clinical_indication" rows={2} required /></div>
      <div className="space-y-1"><Label className="req-asterisk">Diagnóstico</Label><Textarea name="diagnosis" rows={2} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Hb atual</Label><Input name="current_hemoglobin" type="number" step="0.1" /></div>
        <div className="space-y-1"><Label>Ht atual</Label><Input name="current_hematocrit" type="number" step="0.1" /></div>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>Salvar</Button>
    </form>
  );
}
