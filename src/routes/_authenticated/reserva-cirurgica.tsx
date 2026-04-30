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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMPONENT_MAIN, COMPONENT_LABELS } from "@/lib/domain";
import { Plus, Trash2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reserva-cirurgica")({ component: Page });

function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reserva Cirúrgica</h1>
      <Tabs defaultValue="dia">
        <TabsList>
          <TabsTrigger value="dia">Reservas da Semana</TabsTrigger>
          <TabsTrigger value="nova">Nova Reserva</TabsTrigger>
        </TabsList>
        <TabsContent value="dia"><WeekView /></TabsContent>
        <TabsContent value="nova"><NewReservation /></TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Week view =====
function WeekView() {
  const qc = useQueryClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const { data, isLoading } = useQuery({
    queryKey: ["surgical", start.toISOString()],
    queryFn: async () => {
      const { data } = await supabase.from("surgical_reservations")
        .select("*, patients(full_name, mrn, blood_type)")
        .gte("surgery_date", start.toISOString().slice(0, 10))
        .lt("surgery_date", end.toISOString().slice(0, 10))
        .order("surgery_date");
      // Compute stock availability per reservation
      const items = (data ?? []) as any[];
      const enriched = await Promise.all(items.map(async (r) => {
        const reserved = (r.reserved_units ?? []) as { component_type: string; quantity: number }[];
        const checks = await Promise.all(reserved.map(async (u) => {
          const { count } = await supabase.from("blood_units").select("*", { count: "exact", head: true })
            .eq("component_type", u.component_type as any).eq("status", "disponivel");
          return { ...u, available: count ?? 0 };
        }));
        const allOk = checks.length > 0 && checks.every((c) => c.available >= c.quantity);
        const noneOk = checks.length === 0 || checks.every((c) => c.available === 0);
        const reservationStatus = r.status === "confirmado" ? "confirmado" : (allOk ? "disponivel" : (noneOk ? "indisponivel" : "parcial"));
        return { ...r, checks, reservationStatus };
      }));
      return enriched;
    },
    refetchInterval: 60_000,
  });

  const days: Date[] = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  const grouped: Record<string, any[]> = {};
  (data ?? []).forEach((r: any) => {
    const k = r.surgery_date;
    grouped[k] = grouped[k] || [];
    grouped[k].push(r);
  });

  const confirm = async (id: string) => {
    const { error } = await supabase.from("surgical_reservations").update({ status: "confirmado" as any }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Reserva confirmada"); qc.invalidateQueries({ queryKey: ["surgical"] }); }
  };

  // Critical alerts: surgeries within 2h with no confirmed reservation
  const now = Date.now();
  const criticalAlerts = (data ?? []).filter((r: any) => {
    const t = new Date(r.surgery_date).getTime();
    return t - now < 2 * 3600_000 && t - now > 0 && r.reservationStatus !== "confirmado";
  });

  return (
    <div className="space-y-4">
      {criticalAlerts.length > 0 && (
        <div className="bg-warning/15 border border-warning/40 rounded p-3 flex gap-2 text-warning text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Atenção: {criticalAlerts.length} cirurgia(s) em menos de 2h sem reserva confirmada</div>
            <div className="text-xs">{criticalAlerts.map((r: any) => `${r.patients?.full_name ?? "—"} (${new Date(r.surgery_date).toLocaleString("pt-BR")})`).join(" • ")}</div>
          </div>
        </div>
      )}

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {days.map((d) => {
            const k = d.toISOString().slice(0, 10);
            const items = grouped[k] ?? [];
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <Card key={k} className={isToday ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <div className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</div>
                  <div className="text-lg font-semibold">{d.getDate()}/{d.getMonth() + 1}</div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
                  {items.map((r: any) => {
                    const color = r.reservationStatus === "confirmado" ? "border-success bg-success/5"
                      : r.reservationStatus === "disponivel" ? "border-success/50 bg-success/5"
                      : r.reservationStatus === "parcial" ? "border-warning bg-warning/5"
                      : "border-destructive bg-destructive/5";
                    return (
                      <div key={r.id} className={`border rounded p-2 text-xs ${color}`}>
                        <div className="font-semibold truncate">{r.patients?.full_name ?? "—"}</div>
                        <div className="text-muted-foreground truncate">{r.surgery_type ?? "—"}</div>
                        <div>{new Date(r.surgery_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="mt-1 space-y-0.5">
                          {(r.checks ?? []).map((c: any, i: number) => (
                            <div key={i} className="flex justify-between gap-1">
                              <span>{c.component_type} ×{c.quantity}</span>
                              <span className={c.available >= c.quantity ? "text-success" : "text-destructive"}>{c.available}</span>
                            </div>
                          ))}
                        </div>
                        {r.status !== "confirmado" && r.reservationStatus !== "indisponivel" && (
                          <Button size="sm" variant="outline" className="w-full mt-2 h-6 text-[10px]" onClick={() => confirm(r.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Confirmar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== New reservation =====
function NewReservation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [patientSearch, setPatientSearch] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [surgeryDate, setSurgeryDate] = useState("");
  const [surgeryType, setSurgeryType] = useState("");
  const [surgeon, setSurgeon] = useState("");
  const [anesth, setAnesth] = useState("");
  const [notes, setNotes] = useState("");
  const [units, setUnits] = useState<{ component_type: string; quantity: number }[]>([{ component_type: "CH", quantity: 2 }]);
  const [busy, setBusy] = useState(false);
  const [stockAlerts, setStockAlerts] = useState<{ component_type: string; needed: number; available: number }[]>([]);

  const { data: patients } = useQuery({
    queryKey: ["pat-search-surg", patientSearch],
    queryFn: async () => {
      if (patientSearch.length < 2 || patient) return [];
      const { data } = await supabase.from("patients").select("id, full_name, mrn, blood_type")
        .or(`full_name.ilike.%${patientSearch}%,mrn.ilike.%${patientSearch}%`).limit(8);
      return data ?? [];
    },
  });

  const updateUnit = (i: number, patch: Partial<{ component_type: string; quantity: number }>) => {
    setUnits(units.map((u, idx) => idx === i ? { ...u, ...patch } : u));
  };
  const removeUnit = (i: number) => setUnits(units.filter((_, idx) => idx !== i));
  const addUnit = () => setUnits([...units, { component_type: "CH", quantity: 1 }]);

  const checkStock = async () => {
    const checks = await Promise.all(units.map(async (u) => {
      const { count } = await supabase.from("blood_units").select("*", { count: "exact", head: true })
        .eq("component_type", u.component_type as any).eq("status", "disponivel");
      return { component_type: u.component_type, needed: u.quantity, available: count ?? 0 };
    }));
    const insufficient = checks.filter((c) => c.available < c.needed);
    setStockAlerts(insufficient);
    return insufficient;
  };

  const submit = async () => {
    if (!patient) { toast.error("Selecione um paciente"); return; }
    if (!surgeryDate || !surgeryType || !surgeon) { toast.error("Preencha os campos obrigatórios"); return; }
    if (units.length === 0) { toast.error("Adicione ao menos 1 hemocomponente"); return; }
    await checkStock();
    setBusy(true);
    const { error } = await supabase.from("surgical_reservations").insert({
      patient_id: patient.id,
      surgery_date: surgeryDate,
      surgery_type: surgeryType,
      surgeon_name: surgeon,
      anesthesiologist_notes: anesth ? `${anesth}${notes ? "\n" + notes : ""}` : notes,
      reserved_units: units,
      created_by: user?.id,
      status: "reservado" as any,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Reserva criada");
    qc.invalidateQueries({ queryKey: ["surgical"] });
    setPatient(null); setSurgeryDate(""); setSurgeryType(""); setSurgeon(""); setAnesth(""); setNotes("");
    setUnits([{ component_type: "CH", quantity: 2 }]); setStockAlerts([]);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Nova reserva cirúrgica</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!patient ? (
          <div className="space-y-1">
            <Label className="req-asterisk">Paciente</Label>
            <Input placeholder="Buscar nome ou prontuário..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
            {patients && patients.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-auto">
                {patients.map((p: any) => (
                  <button key={p.id} type="button" className="w-full text-left p-2 hover:bg-muted text-sm" onClick={() => { setPatient(p); setPatientSearch(""); }}>
                    {p.full_name} <span className="text-xs text-muted-foreground">{p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="border rounded p-3 bg-muted/30 flex items-start justify-between">
            <div>
              <div className="font-medium">{patient.full_name}</div>
              <div className="text-xs text-muted-foreground">Prontuário {patient.mrn}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setPatient(null)}><X className="h-4 w-4" /></Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="req-asterisk">Data e hora da cirurgia</Label>
            <Input type="datetime-local" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="req-asterisk">Tipo de cirurgia</Label>
            <Input value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)} placeholder="Ex.: Cardíaca, Ortopédica..." required />
          </div>
          <div className="space-y-1">
            <Label className="req-asterisk">Cirurgião responsável</Label>
            <Input value={surgeon} onChange={(e) => setSurgeon(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Anestesista</Label>
            <Input value={anesth} onChange={(e) => setAnesth(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Observações</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Hemocomponentes a reservar</Label>
            <Button size="sm" variant="outline" type="button" onClick={addUnit}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
          </div>
          <div className="space-y-2">
            {units.map((u, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={u.component_type} onValueChange={(v) => updateUnit(i, { component_type: v })}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPONENT_MAIN.map((c) => <SelectItem key={c} value={c}>{c} — {COMPONENT_LABELS[c]}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min={1} max={20} className="w-24" value={u.quantity} onChange={(e) => updateUnit(i, { quantity: Number(e.target.value) })} />
                <Button size="sm" variant="ghost" type="button" onClick={() => removeUnit(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>

        {stockAlerts.length > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded p-3 text-sm text-warning">
            <div className="font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Estoque insuficiente</div>
            {stockAlerts.map((a, i) => (
              <div key={i} className="text-xs">• {a.component_type}: necessárias {a.needed}, disponíveis {a.available} — solicite reposição ao Hemocentro.</div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={checkStock}>Verificar estoque</Button>
          <Button onClick={submit} disabled={busy} className="flex-1">{busy ? "Salvando..." : "Salvar reserva"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
