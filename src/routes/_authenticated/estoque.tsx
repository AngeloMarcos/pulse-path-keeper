import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  BLOOD_TYPES, BLOOD_TYPE_LABELS, COMPONENT_TYPES, COMPONENT_LABELS,
  UNIT_STATUS_LABELS, statusBadgeClass, expirationClass, bloodTypeBadgeClass,
} from "@/lib/domain";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/estoque")({ component: EstoquePage });

function EstoquePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Estoque de Bolsas</h1>
      <Tabs defaultValue="atual">
        <TabsList>
          <TabsTrigger value="atual">Estoque Atual</TabsTrigger>
          <TabsTrigger value="entrada">Entrada de Bolsas</TabsTrigger>
        </TabsList>
        <TabsContent value="atual"><CurrentStock /></TabsContent>
        <TabsContent value="entrada"><EntryForm /></TabsContent>
      </Tabs>
    </div>
  );
}

function CurrentStock() {
  const [comp, setComp] = useState("all");
  const [bt, setBt] = useState("all");
  const [status, setStatus] = useState("disponivel");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["units", comp, bt, status],
    queryFn: async () => {
      let q = supabase.from("blood_units").select("*").order("expiration_date");
      if (comp !== "all") q = q.eq("component_type", comp as any);
      if (bt !== "all") q = q.eq("blood_type", bt as any);
      if (status !== "all") q = q.eq("status", status as any);
      const { data } = await q;
      return data ?? [];
    },
  });

  const discard = async (id: string) => {
    const reason = prompt("Motivo do descarte:");
    if (!reason) return;
    const { error } = await supabase.from("blood_units").update({
      status: "descartado", discard_reason: reason, discarded_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Bolsa descartada"); qc.invalidateQueries({ queryKey: ["units"] }); }
  };

  return (
    <Card className="mt-4">
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
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-32 w-full" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left p-2">Código</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Grupo</th>
                  <th className="text-left p-2">Vol</th>
                  <th className="text-left p-2">Validade</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Local</th>
                  <th className="text-left p-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((u: any) => (
                  <tr key={u.id} className="border-b hover:bg-muted/40">
                    <td className="p-2 font-mono text-xs">{u.bag_number}</td>
                    <td className="p-2">{u.component_type}</td>
                    <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-xs ${bloodTypeBadgeClass(u.blood_type)}`}>{BLOOD_TYPE_LABELS[u.blood_type]}</span></td>
                    <td className="p-2">{u.volume_ml} mL</td>
                    <td className={`p-2 ${expirationClass(u.expiration_date)}`}>{new Date(u.expiration_date).toLocaleDateString("pt-BR")}</td>
                    <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-xs ${statusBadgeClass(u.status)}`}>{UNIT_STATUS_LABELS[u.status]}</span></td>
                    <td className="p-2 text-muted-foreground">{u.location}</td>
                    <td className="p-2">
                      {u.status !== "descartado" && u.status !== "transfundido" && (
                        <Button size="icon" variant="ghost" onClick={() => discard(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Sem bolsas</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EntryForm() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);

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
      donation_number: fd.get("donation_number") || null,
      irradiated: fd.get("irradiated") === "on",
      filtered: fd.get("filtered") === "on",
      cmv_negative: fd.get("cmv_negative") === "on",
      phenotyped: fd.get("phenotyped") === "on",
      location: fd.get("location") || null,
      received_by: user?.id,
    };
    if (!obj.bag_number || !obj.volume_ml || !obj.expiration_date) { toast.error("Preencha campos obrigatórios"); return; }
    setBusy(true);
    const { error } = await supabase.from("blood_units").insert(obj);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Bolsa ${obj.bag_number} registrada`);
    setLast(obj.bag_number);
    form.reset();
    (form.querySelector('[name="bag_number"]') as HTMLInputElement)?.focus();
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle>Entrada de bolsa</CardTitle></CardHeader>
      <CardContent>
        {last && <div className="mb-3 p-2 bg-success/10 border border-success/30 text-success rounded text-sm">✓ Última registrada: {last}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="req-asterisk">Código ISBT 128</Label>
            <Input name="bag_number" autoFocus required className="text-lg font-mono h-12" />
          </div>
          <div className="space-y-1"><Label className="req-asterisk">Componente</Label>
            <Select name="component_type" defaultValue="CH"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COMPONENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="req-asterisk">Grupo</Label>
            <Select name="blood_type" defaultValue="O_POS"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{BLOOD_TYPE_LABELS[b]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="req-asterisk">Volume (mL)</Label><Input name="volume_ml" type="number" required defaultValue={300} /></div>
          <div className="space-y-1"><Label className="req-asterisk">Validade</Label><Input name="expiration_date" type="date" required /></div>
          <div className="space-y-1"><Label>Nº doação</Label><Input name="donation_number" /></div>
          <div className="space-y-1"><Label>Localização</Label><Input name="location" /></div>
          <div className="sm:col-span-2 grid grid-cols-2 gap-2 mt-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox name="irradiated" /> Irradiado</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="filtered" /> Filtrado</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="cmv_negative" /> CMV negativo</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox name="phenotyped" /> Fenotipado</label>
          </div>
          <Button type="submit" className="sm:col-span-2" disabled={busy}>Registrar Entrada</Button>
        </form>
      </CardContent>
    </Card>
  );
}
