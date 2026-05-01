import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, PackagePlus, FlaskConical, ShieldCheck, Truck,
  Activity, AlertTriangle, Trash2, FileText, User, Calendar,
} from "lucide-react";
import { BLOOD_TYPE_LABELS, COMPONENT_LABELS, statusBadgeClass } from "@/lib/domain";
import { printReportPDF } from "@/lib/report-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rastreabilidade")({ component: Page });

type TimelineEvent = {
  icon: any; color: "ok" | "warn" | "err"; label: string; when?: string | null;
  details?: { k: string; v: string }[];
};

function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Rastreabilidade</h1>
      <Tabs defaultValue="bag">
        <TabsList>
          <TabsTrigger value="bag">Por Bolsa</TabsTrigger>
          <TabsTrigger value="patient">Por Paciente</TabsTrigger>
          <TabsTrigger value="lookback">Look-Back</TabsTrigger>
        </TabsList>
        <TabsContent value="bag" className="mt-4"><ByBag /></TabsContent>
        <TabsContent value="patient" className="mt-4"><ByPatient /></TabsContent>
        <TabsContent value="lookback" className="mt-4"><LookBack /></TabsContent>
      </Tabs>
    </div>
  );
}

function ByBag() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["trace-bag", search],
    enabled: !!search,
    queryFn: async () => {
      const { data: unit } = await supabase
        .from("blood_units")
        .select("*")
        .or(`bag_number.eq.${search},donation_number.eq.${search}`)
        .maybeSingle();
      if (!unit) return null;
      const [{ data: ptt }, { data: disp }, { data: trans }] = await Promise.all([
        supabase.from("pre_transfusion_tests").select("*, request_id").eq("blood_unit_id", unit.id),
        supabase.from("dispensations").select("*, request_id").eq("blood_unit_id", unit.id),
        supabase.from("transfusions").select("*, patient_id").eq("blood_unit_id", unit.id),
      ]);
      const patientIds = new Set<string>();
      (trans ?? []).forEach((t: any) => t.patient_id && patientIds.add(t.patient_id));
      const requestIds = new Set<string>();
      (ptt ?? []).forEach((p: any) => p.request_id && requestIds.add(p.request_id));
      (disp ?? []).forEach((d: any) => d.request_id && requestIds.add(d.request_id));
      const [{ data: patients }, { data: requests }, { data: reactions }] = await Promise.all([
        patientIds.size
          ? supabase.from("patients").select("id,full_name,mrn").in("id", Array.from(patientIds))
          : Promise.resolve({ data: [] as any[] }),
        requestIds.size
          ? supabase.from("transfusion_requests").select("id,patient_id,component_type,quantity").in("id", Array.from(requestIds))
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("adverse_reactions").select("id,reaction_type,severity,notification_datetime").eq("blood_unit_id", unit.id),
      ]);
      return { unit, ptt: ptt ?? [], disp: disp ?? [], trans: trans ?? [], patients: patients ?? [], requests: requests ?? [], reactions: reactions ?? [] };
    },
  });

  const buildTimeline = (): TimelineEvent[] => {
    if (!data) return [];
    const evs: TimelineEvent[] = [];
    const u = data.unit;
    evs.push({
      icon: PackagePlus, color: "ok", label: "Entrada no estoque", when: u.received_at,
      details: [
        { k: "Código", v: u.bag_number },
        { k: "Doação", v: u.donation_number ?? "—" },
        { k: "Componente", v: COMPONENT_LABELS[u.component_type] ?? u.component_type },
        { k: "Tipo", v: BLOOD_TYPE_LABELS[u.blood_type] ?? u.blood_type },
        { k: "Volume", v: `${u.volume_ml} ml` },
        { k: "Vencimento", v: new Date(u.expiration_date).toLocaleDateString("pt-BR") },
        { k: "Localização", v: u.location ?? "—" },
      ],
    });
    data.ptt.forEach((p: any) => {
      const req = data.requests.find((r: any) => r.id === p.request_id);
      const pat = req && data.patients.find((x: any) => x.id === req.patient_id);
      evs.push({
        icon: FlaskConical, color: p.crossmatch_result === "incompativel" ? "err" : "ok",
        label: "Testes pré-transfusionais", when: p.created_at,
        details: [
          { k: "Paciente", v: pat?.full_name ?? "—" },
          { k: "Crossmatch", v: p.crossmatch_result ?? "—" },
          { k: "PAI", v: p.pai_result ?? "—" },
          { k: "Validado em", v: p.validated_at ? new Date(p.validated_at).toLocaleString("pt-BR") : "—" },
        ],
      });
    });
    data.disp.forEach((d: any) => {
      const req = data.requests.find((r: any) => r.id === d.request_id);
      const pat = req && data.patients.find((x: any) => x.id === req.patient_id);
      evs.push({
        icon: Truck, color: "ok", label: "Dispensação", when: d.dispensed_at,
        details: [
          { k: "Setor", v: d.ward ?? "—" },
          { k: "Recebido por", v: d.received_by_name ?? "—" },
          { k: "Paciente", v: pat?.full_name ?? "—" },
        ],
      });
    });
    data.trans.forEach((t: any) => {
      const pat = data.patients.find((x: any) => x.id === t.patient_id);
      evs.push({
        icon: Activity, color: t.intercurrence ? "warn" : "ok",
        label: t.completed ? "Transfusão concluída" : "Transfusão iniciada", when: t.started_at,
        details: [
          { k: "Paciente", v: pat?.full_name ?? "—" },
          { k: "Início", v: t.started_at ? new Date(t.started_at).toLocaleString("pt-BR") : "—" },
          { k: "Fim", v: t.finished_at ? new Date(t.finished_at).toLocaleString("pt-BR") : "—" },
          { k: "Volume", v: t.volume_transfused_ml ? `${t.volume_transfused_ml} ml` : "—" },
          { k: "Intercorrência", v: t.intercurrence ? (t.intercurrence_description ?? "Sim") : "Não" },
        ],
      });
    });
    data.reactions.forEach((r: any) => {
      evs.push({
        icon: AlertTriangle, color: r.severity === "grave" || r.severity === "fatal" ? "err" : "warn",
        label: `Reação adversa (${r.severity})`, when: r.notification_datetime,
        details: [{ k: "Tipo", v: r.reaction_type }],
      });
    });
    if (u.status === "descartado") {
      evs.push({
        icon: Trash2, color: "err", label: "Descarte", when: u.discarded_at,
        details: [{ k: "Motivo", v: u.discard_reason ?? "—" }],
      });
    }
    evs.sort((a, b) => new Date(a.when ?? 0).getTime() - new Date(b.when ?? 0).getTime());
    return evs;
  };

  const timeline = buildTimeline();

  const print = () => {
    if (!data) return;
    printReportPDF({
      title: `Rastreabilidade — Bolsa ${data.unit.bag_number}`,
      subtitle: `Doação ${data.unit.donation_number ?? "—"} · ${COMPONENT_LABELS[data.unit.component_type] ?? data.unit.component_type} · ${BLOOD_TYPE_LABELS[data.unit.blood_type] ?? data.unit.blood_type}`,
      sections: [{
        heading: "Linha do tempo",
        columns: ["Data/hora", "Evento", "Detalhes"],
        rows: timeline.map((e) => [
          e.when ? new Date(e.when).toLocaleString("pt-BR") : "—",
          e.label,
          (e.details ?? []).map((d) => `${d.k}: ${d.v}`).join(" · "),
        ]),
      }],
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Código ISBT 128 da bolsa ou número de doação"
                className="pl-9"
                onKeyDown={(e) => e.key === "Enter" && setSearch(q.trim())}
              />
            </div>
            <Button onClick={() => setSearch(q.trim())}>Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {isFetching && <Skeleton className="h-64 w-full" />}

      {!isFetching && search && !data && (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Nenhuma bolsa encontrada para "{search}".</CardContent></Card>
      )}

      {data && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Bolsa {data.unit.bag_number}</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                Doação {data.unit.donation_number ?? "—"} ·{" "}
                <span className={`inline-flex px-2 py-0.5 rounded text-xs ${statusBadgeClass(data.unit.status)}`}>{data.unit.status}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={print}>
              <FileText className="h-4 w-4 mr-1" /> Imprimir rastreabilidade
            </Button>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l-2 border-border ml-4 space-y-6">
              {timeline.map((e, i) => {
                const Icon = e.icon;
                const colorCls = e.color === "err"
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : e.color === "warn"
                  ? "bg-warning text-warning-foreground border-warning"
                  : "bg-success text-success-foreground border-success";
                return (
                  <li key={i} className="ml-6">
                    <span className={`absolute -left-[14px] flex h-7 w-7 items-center justify-center rounded-full border-2 ${colorCls}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="font-medium text-sm">{e.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.when ? new Date(e.when).toLocaleString("pt-BR") : "—"}
                    </div>
                    {e.details && e.details.length > 0 && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-primary-foreground/80 hover:text-primary-foreground">Detalhes</summary>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 p-2 bg-muted/30 rounded">
                          {e.details.map((d, j) => (
                            <div key={j} className="contents">
                              <dt className="text-muted-foreground">{d.k}</dt>
                              <dd>{d.v}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ByPatient() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["trace-patient", search],
    enabled: !!search,
    queryFn: async () => {
      const { data: pats } = await supabase
        .from("patients").select("id,full_name,mrn,blood_type")
        .or(`full_name.ilike.%${search}%,mrn.ilike.%${search}%`)
        .limit(10);
      if (!pats || pats.length === 0) return { patients: [], transfusions: [], reactions: [], units: [] };
      const ids = pats.map((p) => p.id);
      const [{ data: trans }, { data: reacts }] = await Promise.all([
        supabase.from("transfusions").select("*").in("patient_id", ids).order("started_at", { ascending: false }),
        supabase.from("adverse_reactions").select("*").in("patient_id", ids),
      ]);
      const unitIds = (trans ?? []).map((t: any) => t.blood_unit_id).filter(Boolean);
      const { data: units } = unitIds.length
        ? await supabase.from("blood_units").select("id,bag_number,blood_type,component_type,volume_ml").in("id", unitIds)
        : { data: [] as any[] };
      return { patients: pats, transfusions: trans ?? [], reactions: reacts ?? [], units: units ?? [] };
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Nome ou prontuário do paciente"
                className="pl-9"
                onKeyDown={(e) => e.key === "Enter" && setSearch(q.trim())} />
            </div>
            <Button onClick={() => setSearch(q.trim())}>Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {isFetching && <Skeleton className="h-48 w-full" />}

      {data?.patients.map((p: any) => {
        const tr = (data.transfusions as any[]).filter((t) => t.patient_id === p.id);
        const re = (data.reactions as any[]).filter((r) => r.patient_id === p.id);
        return (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" /> {p.full_name}
                <Badge variant="outline">{p.mrn}</Badge>
                <Badge>{BLOOD_TYPE_LABELS[p.blood_type] ?? p.blood_type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {re.length > 0 && (
                <div className="space-y-1">
                  {re.map((r) => (
                    <div key={r.id} className={`p-2 rounded border ${r.severity === "grave" || r.severity === "fatal" ? "bg-destructive/10 border-destructive/40" : "bg-warning/10 border-warning/40"}`}>
                      <div className="text-xs font-medium">⚠ Reação adversa: {r.reaction_type} — {r.severity}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.notification_datetime).toLocaleString("pt-BR")}</div>
                    </div>
                  ))}
                </div>
              )}
              {tr.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sem transfusões registradas.</div>
              ) : (
                <div className="rounded border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Componente</th>
                        <th className="text-left p-2">Bolsa</th>
                        <th className="text-left p-2">Grupo</th>
                        <th className="text-left p-2">Volume</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tr.map((t: any) => {
                        const u = (data.units as any[]).find((x) => x.id === t.blood_unit_id);
                        return (
                          <tr key={t.id} className="border-t">
                            <td className="p-2"><Calendar className="h-3 w-3 inline mr-1" />{new Date(t.started_at).toLocaleString("pt-BR")}</td>
                            <td className="p-2">{u ? COMPONENT_LABELS[u.component_type] ?? u.component_type : "—"}</td>
                            <td className="p-2 font-mono text-xs">{u?.bag_number ?? "—"}</td>
                            <td className="p-2">{u ? BLOOD_TYPE_LABELS[u.blood_type] : "—"}</td>
                            <td className="p-2">{t.volume_transfused_ml ?? "—"} ml</td>
                            <td className="p-2">
                              <Badge variant={t.completed ? "default" : "secondary"}>{t.completed ? "Concluída" : "Em curso"}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {data && data.patients.length === 0 && (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Nenhum paciente encontrado.</CardContent></Card>
      )}
    </div>
  );
}

function LookBack() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["trace-lookback", search],
    enabled: !!search,
    queryFn: async () => {
      const { data: units } = await supabase
        .from("blood_units").select("id,bag_number,donation_number,component_type,blood_type")
        .eq("donation_number", search);
      const ids = (units ?? []).map((u) => u.id);
      if (ids.length === 0) return { units: [], transfusions: [], patients: [], reactions: [] };
      const [{ data: trans }, { data: reacts }] = await Promise.all([
        supabase.from("transfusions").select("*").in("blood_unit_id", ids),
        supabase.from("adverse_reactions").select("id,patient_id,blood_unit_id,severity,reaction_type").in("blood_unit_id", ids),
      ]);
      const patIds = Array.from(new Set((trans ?? []).map((t: any) => t.patient_id).filter(Boolean)));
      const { data: patients } = patIds.length
        ? await supabase.from("patients").select("id,full_name,mrn").in("id", patIds)
        : { data: [] as any[] };
      return { units: units ?? [], transfusions: trans ?? [], patients: patients ?? [], reactions: reacts ?? [] };
    },
  });

  const rows = (data?.transfusions ?? []).map((t: any) => {
    const p = (data?.patients ?? []).find((x: any) => x.id === t.patient_id);
    const u = (data?.units ?? []).find((x: any) => x.id === t.blood_unit_id);
    const r = (data?.reactions ?? []).find((x: any) => x.patient_id === t.patient_id && x.blood_unit_id === t.blood_unit_id);
    return { t, p, u, r };
  });

  const printLB = () => {
    if (!data) return;
    printReportPDF({
      title: `Look-Back — Doação ${search}`,
      subtitle: `${rows.length} paciente(s) impactado(s) · ${data.units.length} bolsa(s) deste lote`,
      sections: [{
        heading: "Pacientes que receberam bolsas deste doador/lote",
        columns: ["Paciente", "Prontuário", "Data", "Bolsa", "Componente", "Reação adversa"],
        rows: rows.map(({ t, p, u, r }) => [
          p?.full_name ?? "—",
          p?.mrn ?? "—",
          new Date(t.started_at).toLocaleString("pt-BR"),
          u?.bag_number ?? "—",
          u ? COMPONENT_LABELS[u.component_type] ?? u.component_type : "—",
          r ? `${r.reaction_type} (${r.severity})` : "Sem reação registrada",
        ]),
      }],
    });
    toast.success("Relatório gerado");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Número de doação"
                className="pl-9"
                onKeyDown={(e) => e.key === "Enter" && setSearch(q.trim())} />
            </div>
            <Button onClick={() => setSearch(q.trim())}>Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {isFetching && <Skeleton className="h-48 w-full" />}

      {data && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{rows.length} paciente(s) impactado(s)</CardTitle>
              <div className="text-xs text-muted-foreground mt-1">{data.units.length} bolsa(s) registradas para esta doação</div>
            </div>
            <Button onClick={printLB} disabled={rows.length === 0}>
              <FileText className="h-4 w-4 mr-1" /> Gerar Relatório de Look-Back
            </Button>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma transfusão associada a esta doação.</div>
            ) : (
              <div className="rounded border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Paciente</th>
                      <th className="text-left p-2">Prontuário</th>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Bolsa</th>
                      <th className="text-left p-2">Componente</th>
                      <th className="text-left p-2">Reação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ t, p, u, r }, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{p?.full_name ?? "—"}</td>
                        <td className="p-2">{p?.mrn ?? "—"}</td>
                        <td className="p-2">{new Date(t.started_at).toLocaleString("pt-BR")}</td>
                        <td className="p-2 font-mono text-xs">{u?.bag_number ?? "—"}</td>
                        <td className="p-2">{u ? COMPONENT_LABELS[u.component_type] : "—"}</td>
                        <td className="p-2">
                          {r ? (
                            <Badge variant="destructive">{r.reaction_type} ({r.severity})</Badge>
                          ) : (
                            <Badge variant="outline" className="text-success border-success/40">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Sem reação
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
