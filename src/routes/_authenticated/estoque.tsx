import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BLOOD_TYPES, BLOOD_TYPE_LABELS, COMPONENT_TYPES, COMPONENT_LABELS,
  UNIT_STATUS_LABELS, statusBadgeClass, expirationClass, bloodTypeBadgeClass,
} from "@/lib/domain";
import { STORAGE_LOCATIONS, DISCARD_REASONS, RETURN_REASONS } from "@/lib/blood-helpers";
import { toast } from "sonner";
import { Trash2, Droplet, AlertTriangle, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estoque")({ component: EstoquePage });

function EstoquePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Estoque de Bolsas</h1>
      <Tabs defaultValue="atual">
        <TabsList>
          <TabsTrigger value="atual">Estoque Atual</TabsTrigger>
          <TabsTrigger value="entrada">Entrada de Bolsas</TabsTrigger>
          <TabsTrigger value="devolucao">Transferências / Devoluções</TabsTrigger>
        </TabsList>
        <TabsContent value="atual"><CurrentStock /></TabsContent>
        <TabsContent value="entrada"><EntryForm /></TabsContent>
        <TabsContent value="devolucao"><ReturnForm /></TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Stock summary =====
function StockSummary() {
  const { data } = useQuery({
    queryKey: ["stock-summary"],
    queryFn: async () => {
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 3600_000).toISOString().slice(0, 10);
      const in7d = new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10);
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const today = now.toISOString().slice(0, 10);
      const [a, b, c, d] = await Promise.all([
        supabase.from("blood_units").select("*", { count: "exact", head: true }).eq("status", "disponivel"),
        supabase.from("blood_units").select("*", { count: "exact", head: true }).eq("status", "disponivel").lte("expiration_date", in48h).gte("expiration_date", today),
        supabase.from("blood_units").select("*", { count: "exact", head: true }).eq("status", "disponivel").lte("expiration_date", in7d).gte("expiration_date", today),
        supabase.from("blood_units").select("*", { count: "exact", head: true }).eq("status", "descartado").gte("discarded_at", startMonth),
      ]);
      return { available: a.count ?? 0, in48h: b.count ?? 0, in7d: c.count ?? 0, discarded: d.count ?? 0 };
    },
    refetchInterval: 60_000,
  });
  const cards = [
    { label: "Total disponível", value: data?.available ?? 0, icon: Droplet, color: "text-success" },
    { label: "Vencendo em 48h", value: data?.in48h ?? 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Vencendo em 7 dias", value: data?.in7d ?? 0, icon: Clock, color: "text-warning" },
    { label: "Descartadas no mês", value: data?.discarded ?? 0, icon: XCircle, color: "text-muted-foreground" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-4 flex items-center gap-3">
            <c.icon className={`h-8 w-8 ${c.color}`} />
            <div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CurrentStock() {
  const [comp, setComp] = useState("all");
  const [bt, setBt] = useState("all");
  const [status, setStatus] = useState("disponivel");
  const [location, setLocation] = useState("all");
  const [discardOpen, setDiscardOpen] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["units", comp, bt, status, location],
    queryFn: async () => {
      let q = supabase.from("blood_units").select("*, profiles:received_by(full_name)").order("expiration_date");
      if (comp !== "all") q = q.eq("component_type", comp as any);
      if (bt !== "all") q = q.eq("blood_type", bt as any);
      if (status !== "all") q = q.eq("status", status as any);
      if (location !== "all") q = q.eq("location", location);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="space-y-4 mt-4">
      <StockSummary />
      <Card>
        <CardHeader className="flex flex-row gap-2 flex-wrap">
          <Select value={comp} onValueChange={setComp}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos componentes</SelectItem>
              {COMPONENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bt} onValueChange={setBt}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{BLOOD_TYPE_LABELS[b]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(UNIT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Localização" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda localização</SelectItem>
              {STORAGE_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left p-2">Código ISBT</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Grupo</th>
                    <th className="text-left p-2">Vol</th>
                    <th className="text-left p-2">Validade</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Localização</th>
                    <th className="text-left p-2">Entrada</th>
                    <th className="text-left p-2">Recebido</th>
                    <th className="text-left p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.map((u: any) => (
                    <tr key={u.id} className="border-b hover:bg-muted/40">
                      <td className="p-2 font-mono text-xs">{u.bag_number}</td>
                      <td className="p-2">{u.component_type}</td>
                      <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-xs ${bloodTypeBadgeClass(u.blood_type)}`}>{BLOOD_TYPE_LABELS[u.blood_type]}</span></td>
                      <td className="p-2">{u.volume_ml}ml</td>
                      <td className={`p-2 ${expirationClass(u.expiration_date)}`}>{new Date(u.expiration_date).toLocaleDateString("pt-BR")}</td>
                      <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-xs ${statusBadgeClass(u.status)}`}>{UNIT_STATUS_LABELS[u.status]}</span></td>
                      <td className="p-2 text-muted-foreground text-xs">{u.location ?? "—"}</td>
                      <td className="p-2 text-muted-foreground text-xs">{new Date(u.received_at).toLocaleDateString("pt-BR")}</td>
                      <td className="p-2 text-muted-foreground text-xs">{u.profiles?.full_name ?? "—"}</td>
                      <td className="p-2">
                        {u.status !== "descartado" && u.status !== "transfundido" && (
                          <Button size="icon" variant="ghost" onClick={() => setDiscardOpen(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {data?.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Sem bolsas</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <DiscardDialog unit={discardOpen} onClose={() => setDiscardOpen(null)} onDone={() => qc.invalidateQueries({ queryKey: ["units"] })} />
    </div>
  );
}

function DiscardDialog({ unit, onClose, onDone }: { unit: any | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReason(""); setNotes(""); }, [unit?.id]);
  const submit = async () => {
    if (!unit) return;
    if (!reason || !notes.trim()) { toast.error("Motivo e observações são obrigatórios"); return; }
    setBusy(true);
    const { error } = await supabase.from("blood_units").update({
      status: "descartado" as any,
      discard_reason: `${reason} — ${notes}`,
      discarded_at: new Date().toISOString(),
    }).eq("id", unit.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("insert_audit_log", {
      p_table: "blood_units",
      p_record_id: unit.id,
      p_action: "unit_discarded",
      p_new: { bag_number: unit.bag_number, reason, notes } as any,
    });
    toast.success("Bolsa descartada");
    onDone(); onClose();
  };
  if (!unit) return null;
  return (
    <Dialog open={!!unit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Descartar bolsa {unit.bag_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{COMPONENT_LABELS[unit.component_type]} • {BLOOD_TYPE_LABELS[unit.blood_type]} • {unit.volume_ml}ml</div>
          <div className="space-y-1">
            <Label className="req-asterisk">Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{DISCARD_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="req-asterisk">Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={submit} disabled={busy}>{busy ? "Descartando..." : "Confirmar descarte"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EntryForm() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [phenotyped, setPhenotyped] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const obj: any = {
      bag_number: fd.get("bag_number"),
      component_type: fd.get("component_type"),
      blood_type: fd.get("blood_type"),
      volume_ml: Number(fd.get("volume_ml")),
      expiration_date: fd.get("expiration_date"),
      donation_number: fd.get("donation_number"),
      irradiated: fd.get("irradiated") === "on",
      filtered: fd.get("filtered") === "on",
      cmv_negative: fd.get("cmv_negative") === "on",
      phenotyped: fd.get("phenotyped") === "on",
      location: fd.get("location") || null,
      received_by: user?.id,
    };
    if (!obj.bag_number || !obj.volume_ml || !obj.expiration_date || !obj.donation_number) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    setBusy(true);
    const { error } = await supabase.from("blood_units").insert(obj);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Bolsa ${obj.bag_number} (${BLOOD_TYPE_LABELS[obj.blood_type]}, ${obj.volume_ml}ml) registrada`);
    setLast(obj.bag_number);
    setPhenotyped(false);
    form.reset();
    setTimeout(() => (form.querySelector('[name="bag_number"]') as HTMLInputElement)?.focus(), 50);
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Entrada rápida de bolsa</CardTitle></CardHeader>
      <CardContent>
        {last && <div className="mb-3 p-2 bg-success/10 border border-success/30 text-success rounded text-sm">✓ Última registrada: <span className="font-mono">{last}</span></div>}
        <form ref={formRef} onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="req-asterisk">Código ISBT 128</Label>
            <Input name="bag_number" autoFocus required className="text-lg font-mono h-12" placeholder="Bipie ou digite o código" />
          </div>
          <div className="space-y-1"><Label className="req-asterisk">Componente</Label>
            <Select name="component_type" defaultValue="CH"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COMPONENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c} — {COMPONENT_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="req-asterisk">Grupo sanguíneo</Label>
            <Select name="blood_type" defaultValue="O_POS"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{BLOOD_TYPE_LABELS[b]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="req-asterisk">Volume (mL)</Label><Input name="volume_ml" type="number" required defaultValue={300} /></div>
          <div className="space-y-1"><Label className="req-asterisk">Data de validade</Label><Input name="expiration_date" type="date" required /></div>
          <div className="space-y-1"><Label className="req-asterisk">Número da doação</Label><Input name="donation_number" required /></div>
          <div className="space-y-1"><Label>Localização</Label>
            <Select name="location"><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{STORAGE_LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 border-t pt-3">
            <label className="flex items-center gap-2 text-sm"><Checkbox name="irradiated" /> Irradiado</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="filtered" /> Filtrado</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="cmv_negative" /> CMV negativo</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="phenotyped" checked={phenotyped} onCheckedChange={(v) => setPhenotyped(!!v)} /> Fenotipado</label>
          </div>
          {phenotyped && (
            <div className="sm:col-span-2 space-y-1">
              <Label>Detalhes de fenótipo</Label>
              <Input name="phenotype_details" placeholder="Ex.: C+, c-, E-, K-" />
            </div>
          )}
          <Button type="submit" className="sm:col-span-2 h-11" disabled={busy}>
            {busy ? "Registrando..." : "Registrar Entrada"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ===== Returns =====
function ReturnForm() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [bagSearch, setBagSearch] = useState("");
  const [bag, setBag] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState<"integra" | "alterada" | "">("");
  const [responsible, setResponsible] = useState(profile?.full_name ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (profile?.full_name && !responsible) setResponsible(profile.full_name); }, [profile?.full_name]);

  const { data: matches } = useQuery({
    queryKey: ["bag-search", bagSearch],
    queryFn: async () => {
      if (bagSearch.length < 3 || bag) return [];
      const { data } = await supabase.from("blood_units").select("*")
        .ilike("bag_number", `%${bagSearch}%`)
        .in("status", ["dispensado", "reservado", "disponivel"]).limit(8);
      return (data ?? []) as any[];
    },
  });

  const submit = async () => {
    if (!bag) { toast.error("Selecione uma bolsa"); return; }
    if (!reason || !condition || !responsible) { toast.error("Preencha todos os campos"); return; }
    setBusy(true);
    let update: any;
    if (condition === "alterada") {
      update = {
        status: "descartado" as any,
        discard_reason: `Devolução — ${reason} — alteração da bolsa. Responsável: ${responsible}`,
        discarded_at: new Date().toISOString(),
      };
    } else {
      update = { status: "disponivel" as any };
    }
    const { error } = await supabase.from("blood_units").update(update).eq("id", bag.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(condition === "alterada" ? "Bolsa devolvida e descartada" : "Bolsa devolvida ao estoque");
    qc.invalidateQueries({ queryKey: ["units"] });
    setBag(null); setBagSearch(""); setReason(""); setCondition("");
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Devolução / Transferência de bolsa</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!bag ? (
          <div className="space-y-1">
            <Label className="req-asterisk">Código da bolsa</Label>
            <Input value={bagSearch} onChange={(e) => setBagSearch(e.target.value)} placeholder="Bipie ou digite o código" className="font-mono" />
            {matches && matches.length > 0 && (
              <div className="border rounded mt-1 max-h-40 overflow-auto">
                {matches.map((m: any) => (
                  <button key={m.id} type="button" className="w-full text-left p-2 hover:bg-muted text-sm" onClick={() => setBag(m)}>
                    <span className="font-mono">{m.bag_number}</span> — {COMPONENT_LABELS[m.component_type]} {BLOOD_TYPE_LABELS[m.blood_type]} • {UNIT_STATUS_LABELS[m.status]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="border rounded p-3 bg-muted/30">
            <div className="font-mono font-semibold">{bag.bag_number}</div>
            <div className="text-xs text-muted-foreground">
              {COMPONENT_LABELS[bag.component_type]} • {BLOOD_TYPE_LABELS[bag.blood_type]} • {bag.volume_ml}ml • Status: {UNIT_STATUS_LABELS[bag.status]}
            </div>
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => setBag(null)}>Trocar bolsa</Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="req-asterisk">Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{RETURN_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="req-asterisk">Condição de retorno</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as any)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="integra">Íntegra — retornar ao estoque</SelectItem>
                <SelectItem value="alterada">Alterada — descartar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="req-asterisk">Responsável pela devolução</Label>
            <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Data/hora</Label>
            <Input value={new Date().toLocaleString("pt-BR")} disabled />
          </div>
        </div>

        {condition === "alterada" && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive p-2 rounded text-sm flex gap-2">
            <AlertTriangle className="h-4 w-4" /> Esta bolsa será descartada automaticamente ao salvar.
          </div>
        )}

        <Button onClick={submit} disabled={busy} className="w-full">
          {busy ? "Registrando..." : "Registrar devolução"}
        </Button>
      </CardContent>
    </Card>
  );
}
