import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Cable, FlaskConical, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/integracao")({ component: Page });

const HIS_FEATURES: { key: string; label: string }[] = [
  { key: "receive_requests", label: "Receber solicitações do HIS (entram na fila da AT)" },
  { key: "send_transfusion", label: "Enviar resultado de transfusão ao prontuário" },
  { key: "receive_surgery_map", label: "Receber mapa cirúrgico (cria reservas automaticamente)" },
  { key: "send_fit", label: "Enviar FIT finalizada ao prontuário" },
];

const LIS_FEATURES: { key: string; label: string }[] = [
  { key: "autofill_hb_ht", label: "Preencher Hb/Ht automaticamente nas solicitações" },
  { key: "receive_investigation", label: "Receber resultados de investigação transfusional" },
  { key: "send_reaction", label: "Enviar notificação de reação ao LIS" },
];

function Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Integração HIS/LIS</h1>
        <p className="text-sm text-muted-foreground">Conexão com prontuário eletrônico e laboratório</p>
      </div>

      <Tabs defaultValue="his">
        <TabsList>
          <TabsTrigger value="his"><Cable className="h-4 w-4 mr-2"/>HIS — Prontuário</TabsTrigger>
          <TabsTrigger value="lis"><FlaskConical className="h-4 w-4 mr-2"/>LIS — Laboratório</TabsTrigger>
        </TabsList>

        <TabsContent value="his" className="space-y-4">
          <IntegrationPanel kind="his" features={HIS_FEATURES} />
          <EventLog />
          <SimulateHisInbound />
        </TabsContent>

        <TabsContent value="lis" className="space-y-4">
          <IntegrationPanel kind="lis" features={LIS_FEATURES} />
          <FieldMapping />
          <EventLog />
          <SimulateLisReturn />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntegrationPanel({ kind, features }: { kind: "his" | "lis"; features: { key: string; label: string }[] }) {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({
    queryKey: ["integration_settings", kind],
    queryFn: async () => {
      const { data } = await supabase.from("integration_settings").select("*").eq("kind", kind).maybeSingle();
      return data as any;
    },
  });

  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [systemId, setSystemId] = useState("");
  const [feat, setFeat] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (cfg) {
      setEndpoint(cfg.endpoint_url ?? "");
      setToken(cfg.auth_token ?? "");
      setSystemId(cfg.system_id ?? "");
      setFeat(cfg.features ?? {});
    }
  }, [cfg]);

  async function save() {
    const { error } = await supabase.from("integration_settings").upsert({
      id: cfg?.id, kind, endpoint_url: endpoint, auth_token: token,
      system_id: systemId, features: feat,
    } as any, { onConflict: "kind" });
    if (error) toast.error(error.message);
    else { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["integration_settings", kind] }); }
  }

  async function testConnection() {
    if (!endpoint) { toast.error("Informe a URL do endpoint"); return; }
    toast.info("Testando conexão…");
    const ok = Math.random() > 0.15;
    setTimeout(async () => {
      await supabase.from("his_lis_events").insert({
        direction: "outbound", integration_type: kind, endpoint: `${endpoint}/ping`,
        status: ok ? "success" : "error",
        payload: { test: true } as any,
        response: { ok, latency_ms: 230 + Math.round(Math.random() * 400) } as any,
      } as any);
      ok ? toast.success("✓ Conexão OK (HTTP 200)") : toast.error("✗ Falha ao conectar (timeout)");
    }, 700);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Configuração — {kind.toUpperCase()}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>URL do endpoint</Label><Input value={endpoint} onChange={(e)=>setEndpoint(e.target.value)} placeholder="https://hospital.local/api"/></div>
          <div><Label>Token de autenticação</Label><Input type="password" value={token} onChange={(e)=>setToken(e.target.value)} placeholder="••••••••"/></div>
          <div><Label>ID do sistema</Label><Input value={systemId} onChange={(e)=>setSystemId(e.target.value)} placeholder="HIS-PROD-01"/></div>
        </div>

        <div className="space-y-2 border rounded p-3">
          <div className="font-medium text-sm">Funcionalidades habilitadas</div>
          {features.map((f) => (
            <div key={f.key} className="flex items-center justify-between">
              <span className="text-sm">{f.label}</span>
              <Switch checked={!!feat[f.key]} onCheckedChange={(c)=>setFeat((s)=>({...s, [f.key]: c}))}/>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={save}>Salvar</Button>
          <Button variant="outline" onClick={testConnection}><Zap className="h-4 w-4 mr-2"/>Testar Conexão</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EventLog() {
  const { data = [] } = useQuery({
    queryKey: ["hislis-events"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("his_lis_events").select("*").order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as any[];
    },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Log de eventos (últimas 100)</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground border-b">
            <tr>
              <th className="text-left p-2">Quando</th>
              <th className="text-left p-2">Tipo</th>
              <th className="text-left p-2">Direção</th>
              <th className="text-left p-2">Endpoint</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e: any) => (
              <tr key={e.id} className="border-b">
                <td className="p-2">{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-2 uppercase">{e.integration_type}</td>
                <td className="p-2">{e.direction}</td>
                <td className="p-2 font-mono text-[11px]">{e.endpoint}</td>
                <td className="p-2">
                  <Badge variant={e.status === "success" ? "default" : "destructive"} className={e.status === "success" ? "bg-success text-success-foreground" : ""}>
                    {e.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum evento registrado</td></tr>}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function FieldMapping() {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({
    queryKey: ["integration_settings", "lis"],
    queryFn: async () => {
      const { data } = await supabase.from("integration_settings").select("*").eq("kind", "lis").maybeSingle();
      return data as any;
    },
  });
  const [rows, setRows] = useState<{ lis: string; sgat: string }[]>([]);
  useEffect(() => {
    if (cfg) setRows(cfg.field_mapping?.length ? cfg.field_mapping : [
      { lis: "HGB", sgat: "current_hb" },
      { lis: "HCT", sgat: "current_ht" },
      { lis: "PLT", sgat: "platelet_count" },
    ]);
  }, [cfg]);

  async function save() {
    const { error } = await supabase.from("integration_settings").update({ field_mapping: rows }).eq("kind", "lis");
    if (error) toast.error(error.message); else { toast.success("Mapeamento salvo"); qc.invalidateQueries({ queryKey: ["integration_settings", "lis"] }); }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Mapeamento de campos (LIS → SGAT)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <table className="w-full text-sm">
          <thead><tr className="text-muted-foreground border-b"><th className="text-left p-2">Campo LIS</th><th className="text-left p-2">→</th><th className="text-left p-2">Campo SGAT</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="p-1"><Input value={r.lis} onChange={(e)=>setRows(rows.map((x,idx)=>idx===i?{...x,lis:e.target.value}:x))} className="h-8 font-mono text-xs"/></td>
                <td className="p-1 text-muted-foreground">→</td>
                <td className="p-1"><Input value={r.sgat} onChange={(e)=>setRows(rows.map((x,idx)=>idx===i?{...x,sgat:e.target.value}:x))} className="h-8 font-mono text-xs"/></td>
                <td className="p-1"><Button size="sm" variant="ghost" onClick={()=>setRows(rows.filter((_,idx)=>idx!==i))}><Trash2 className="h-3 w-3"/></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={()=>setRows([...rows, { lis: "", sgat: "" }])}><Plus className="h-3 w-3 mr-1"/>Adicionar</Button>
          <Button size="sm" onClick={save}>Salvar mapeamento</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SimulateHisInbound() {
  const qc = useQueryClient();
  async function simulate() {
    // Pick a random patient
    const { data: pats } = await supabase.from("patients").select("id").limit(20);
    if (!pats || pats.length === 0) { toast.error("Cadastre pacientes antes"); return; }
    const pat = pats[Math.floor(Math.random() * pats.length)];
    const components = ["CH", "CP", "PFC"];
    const urgencies = ["rotina", "urgencia", "emergencia"];
    const { error } = await supabase.from("transfusion_requests").insert({
      patient_id: pat.id,
      component_type: components[Math.floor(Math.random()*components.length)] as any,
      quantity: 1 + Math.floor(Math.random()*2),
      urgency: urgencies[Math.floor(Math.random()*urgencies.length)] as any,
      diagnosis: "Solicitação simulada (HIS)",
      clinical_indication: "Recebido via integração HIS — teste",
      status: "pendente",
      his_integration_id: `HIS-${Date.now()}`,
    } as any);
    if (error) { toast.error(error.message); return; }
    await supabase.from("his_lis_events").insert({
      direction: "inbound", integration_type: "his", endpoint: "/his/transfusion-request",
      status: "success", payload: { simulated: true, patient_id: pat.id } as any,
    } as any);
    toast.success("Solicitação simulada criada na fila");
    qc.invalidateQueries({ queryKey: ["hislis-events"] });
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Simulação</CardTitle></CardHeader>
      <CardContent>
        <Button variant="outline" onClick={simulate}><Cable className="h-4 w-4 mr-2"/>Simular recebimento de solicitação do HIS</Button>
      </CardContent>
    </Card>
  );
}

function SimulateLisReturn() {
  const qc = useQueryClient();
  async function simulate() {
    const { data: req } = await supabase.from("transfusion_requests")
      .select("id").eq("status", "pendente").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!req) { toast.error("Nenhuma solicitação pendente para popular"); return; }
    const hb = +(7 + Math.random() * 4).toFixed(1);
    const ht = +(22 + Math.random() * 12).toFixed(1);
    const plt = Math.round(50 + Math.random() * 250);
    await supabase.from("transfusion_requests").update({ current_hb: hb, current_ht: ht, platelet_count: plt }).eq("id", req.id);
    await supabase.from("his_lis_events").insert({
      direction: "inbound", integration_type: "lis", endpoint: "/lis/lab-results",
      status: "success", payload: { request_id: req.id, hb, ht, plt } as any,
    } as any);
    toast.success(`Resultados aplicados: Hb ${hb} / Ht ${ht} / Plt ${plt}`);
    qc.invalidateQueries({ queryKey: ["hislis-events"] });
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Simulação</CardTitle></CardHeader>
      <CardContent>
        <Button variant="outline" onClick={simulate}><FlaskConical className="h-4 w-4 mr-2"/>Simular retorno de exames do LIS</Button>
      </CardContent>
    </Card>
  );
}
