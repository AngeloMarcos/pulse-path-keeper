import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { FileText, FileSpreadsheet } from "lucide-react";
import { BLOOD_TYPE_LABELS, COMPONENT_LABELS, BLOOD_TYPES, URGENCY_LABELS } from "@/lib/domain";
import { exportToXLSX, printReportPDF, minutesBetween } from "@/lib/report-helpers";

export const Route = createFileRoute("/_authenticated/relatorios")({ component: ReportsPage });

const COLORS = ["#1F3864", "#2E5BA8", "#5B8DD6", "#7FB069", "#E8A33D", "#D14848", "#7C5295", "#3D9CA8"];

type Filters = { from: string; to: string; ward: string; component: string };

function defaultFrom() {
  const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10);
}

function ReportsPage() {
  const [filters, setFilters] = useState<Filters>({
    from: defaultFrom(), to: new Date().toISOString().slice(0, 10), ward: "", component: "",
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Filtros globais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div><Label>De</Label><Input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} /></div>
            <div><Label>Até</Label><Input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} /></div>
            <div><Label>Setor</Label><Input placeholder="todos" value={filters.ward} onChange={(e) => setFilters((f) => ({ ...f, ward: e.target.value }))} /></div>
            <div>
              <Label>Componente</Label>
              <Select value={filters.component || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, component: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(COMPONENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="prod">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="prod">Produção Mensal</TabsTrigger>
          <TabsTrigger value="waste">Desperdício</TabsTrigger>
          <TabsTrigger value="reactions">Reações</TabsTrigger>
          <TabsTrigger value="surgical">Reservas Cirúrgicas</TabsTrigger>
          <TabsTrigger value="time">Tempo de Atendimento</TabsTrigger>
          <TabsTrigger value="ward">Consumo por Setor</TabsTrigger>
        </TabsList>
        <TabsContent value="prod" className="mt-4"><ProductionReport filters={filters} /></TabsContent>
        <TabsContent value="waste" className="mt-4"><WasteReport filters={filters} /></TabsContent>
        <TabsContent value="reactions" className="mt-4"><ReactionsReport filters={filters} /></TabsContent>
        <TabsContent value="surgical" className="mt-4"><SurgicalReport filters={filters} /></TabsContent>
        <TabsContent value="time" className="mt-4"><TimeReport filters={filters} /></TabsContent>
        <TabsContent value="ward" className="mt-4"><WardReport filters={filters} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ExportBar({ pdfTitle, filters, sections, xlsxName, sheets }: {
  pdfTitle: string;
  filters: Record<string, string>;
  sections: { heading: string; columns: string[]; rows: (string | number)[][] }[];
  xlsxName: string;
  sheets: { name: string; rows: any[] }[];
}) {
  return (
    <div className="flex justify-end gap-2 mb-2">
      <Button size="sm" variant="outline" onClick={() => printReportPDF({ title: pdfTitle, filters, sections })}>
        <FileText className="h-4 w-4 mr-1" /> Exportar PDF
      </Button>
      <Button size="sm" variant="outline" onClick={() => exportToXLSX(xlsxName, sheets)}>
        <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
      </Button>
    </div>
  );
}

function buildFiltersText(f: Filters): Record<string, string> {
  return {
    Período: `${f.from} a ${f.to}`,
    Setor: f.ward || "Todos",
    Componente: f.component ? COMPONENT_LABELS[f.component] ?? f.component : "Todos",
  };
}

/* ===================== 1. Produção Mensal ===================== */
function ProductionReport({ filters }: { filters: Filters }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rep-prod", filters],
    queryFn: async () => {
      let q = supabase.from("transfusions").select("started_at, blood_unit_id")
        .gte("started_at", filters.from).lte("started_at", filters.to + "T23:59:59");
      const { data: trans } = await q;
      const ids = (trans ?? []).map((t: any) => t.blood_unit_id).filter(Boolean);
      const { data: units } = ids.length
        ? await supabase.from("blood_units").select("id,component_type,blood_type").in("id", ids)
        : { data: [] as any[] };
      const u = (units ?? []).reduce((m: Record<string, any>, x: any) => { m[x.id] = x; return m; }, {});
      const filtered = (trans ?? []).filter((t: any) => {
        const bu = u[t.blood_unit_id];
        if (!bu) return false;
        if (filters.component && bu.component_type !== filters.component) return false;
        return true;
      }).map((t: any) => ({ ...t, comp: u[t.blood_unit_id].component_type, bt: u[t.blood_unit_id].blood_type }));
      return filtered;
    },
  });

  const chartData = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    (data ?? []).forEach((t: any) => {
      const m = (t.started_at ?? "").slice(0, 7);
      if (!map.has(m)) map.set(m, { month: m, CH: 0, CP: 0, PFC: 0, CRIO: 0 });
      const row = map.get(m)!;
      const k = ["CH", "CP", "PFC", "CRIO"].includes(t.comp) ? t.comp : "CH";
      row[k] = (row[k] ?? 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [data]);

  const groupTotals = useMemo(() => {
    const m = new Map<string, number>();
    (data ?? []).forEach((t: any) => m.set(t.bt, (m.get(t.bt) ?? 0) + 1));
    return BLOOD_TYPES.map((bt) => ({ tipo: BLOOD_TYPE_LABELS[bt], total: m.get(bt) ?? 0 }));
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle>Produção mensal por componente</CardTitle></CardHeader>
      <CardContent>
        <ExportBar
          pdfTitle="Produção Mensal" filters={buildFiltersText(filters)}
          sections={[
            { heading: "Por mês × componente", columns: ["Mês", "CH", "CP", "PFC", "CRIO"], rows: chartData.map((r) => [r.month, r.CH, r.CP, r.PFC, r.CRIO]) },
            { heading: "Totais por grupo sanguíneo", columns: ["Grupo", "Total"], rows: groupTotals.map((r) => [r.tipo, r.total]) },
          ]}
          xlsxName="producao-mensal.xlsx"
          sheets={[{ name: "Por mês", rows: chartData }, { name: "Por grupo", rows: groupTotals }]}
        />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
            <Bar dataKey="CH" fill={COLORS[0]} /><Bar dataKey="CP" fill={COLORS[1]} />
            <Bar dataKey="PFC" fill={COLORS[2]} /><Bar dataKey="CRIO" fill={COLORS[3]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-2">Grupo</th><th className="text-left p-2">Total transfundido</th></tr></thead>
            <tbody>{groupTotals.map((r) => <tr key={r.tipo} className="border-t"><td className="p-2">{r.tipo}</td><td className="p-2">{r.total}</td></tr>)}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== 2. Desperdício ===================== */
function WasteReport({ filters }: { filters: Filters }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rep-waste", filters],
    queryFn: async () => {
      let q = supabase.from("blood_units").select("component_type,status,received_at,expiration_date,discarded_at")
        .gte("received_at", filters.from).lte("received_at", filters.to + "T23:59:59");
      if (filters.component) q = q.eq("component_type", filters.component as any);
      const { data: units } = await q;
      return units ?? [];
    },
  });

  const pieData = useMemo(() => {
    const c = { Disponíveis: 0, Transfundidas: 0, Descartadas: 0, Vencidas: 0 };
    (data ?? []).forEach((u: any) => {
      if (u.status === "transfundido") c.Transfundidas++;
      else if (u.status === "descartado") c.Descartadas++;
      else if (u.status === "vencido") c.Vencidas++;
      else if (u.status === "disponivel" || u.status === "reservado") c.Disponíveis++;
    });
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [data]);

  const tableRows = useMemo(() => {
    const map = new Map<string, { recebidas: number; transfundidas: number; descartadas: number }>();
    (data ?? []).forEach((u: any) => {
      const k = u.component_type;
      if (!map.has(k)) map.set(k, { recebidas: 0, transfundidas: 0, descartadas: 0 });
      const r = map.get(k)!;
      r.recebidas++;
      if (u.status === "transfundido") r.transfundidas++;
      if (u.status === "descartado" || u.status === "vencido") r.descartadas++;
    });
    return Array.from(map.entries()).map(([k, v]) => ({
      tipo: COMPONENT_LABELS[k] ?? k, ...v,
      taxa: v.recebidas ? `${((v.descartadas / v.recebidas) * 100).toFixed(1)}%` : "0.0%",
    }));
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle>Índice de desperdício</CardTitle></CardHeader>
      <CardContent>
        <ExportBar
          pdfTitle="Índice de Desperdício" filters={buildFiltersText(filters)}
          sections={[
            { heading: "Distribuição", columns: ["Status", "Quantidade"], rows: pieData.map((r) => [r.name, r.value]) },
            { heading: "Por tipo de hemocomponente", columns: ["Tipo", "Recebidas", "Transfundidas", "Descartadas", "Taxa"], rows: tableRows.map((r) => [r.tipo, r.recebidas, r.transfundidas, r.descartadas, r.taxa]) },
          ]}
          xlsxName="desperdicio.xlsx"
          sheets={[{ name: "Distribuição", rows: pieData }, { name: "Por tipo", rows: tableRows }]}
        />
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="text-left p-2">Tipo</th><th className="text-left p-2">Recebidas</th>
              <th className="text-left p-2">Transfundidas</th><th className="text-left p-2">Descartadas</th>
              <th className="text-left p-2">Taxa de desperdício</th>
            </tr></thead>
            <tbody>{tableRows.map((r) => (
              <tr key={r.tipo} className="border-t">
                <td className="p-2">{r.tipo}</td><td className="p-2">{r.recebidas}</td>
                <td className="p-2">{r.transfundidas}</td><td className="p-2">{r.descartadas}</td>
                <td className="p-2 font-medium">{r.taxa}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== 3. Reações Adversas ===================== */
function ReactionsReport({ filters }: { filters: Filters }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rep-reactions", filters],
    queryFn: async () => {
      const { data: r } = await supabase.from("adverse_reactions").select("reaction_type,severity,notification_datetime")
        .gte("notification_datetime", filters.from).lte("notification_datetime", filters.to + "T23:59:59");
      const { count } = await supabase.from("transfusions").select("id", { count: "exact", head: true })
        .gte("started_at", filters.from).lte("started_at", filters.to + "T23:59:59");
      return { reactions: r ?? [], totalTrans: count ?? 0 };
    },
  });

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    (data?.reactions ?? []).forEach((r: any) => m.set(r.reaction_type, (m.get(r.reaction_type) ?? 0) + 1));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  const bySev = useMemo(() => {
    const m = new Map<string, number>();
    (data?.reactions ?? []).forEach((r: any) => m.set(r.severity, (m.get(r.severity) ?? 0) + 1));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);

  const tableRows = byType.map((r) => ({
    tipo: r.name, freq: r.value,
    taxa: data?.totalTrans ? ((r.value / data.totalTrans) * 1000).toFixed(2) : "0.00",
  }));

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle>Reações adversas</CardTitle></CardHeader>
      <CardContent>
        <ExportBar
          pdfTitle="Reações Adversas" filters={buildFiltersText(filters)}
          sections={[
            { heading: "Por tipo", columns: ["Tipo", "Frequência", "Taxa por 1000 transfusões"], rows: tableRows.map((r) => [r.tipo, r.freq, r.taxa]) },
            { heading: "Por gravidade", columns: ["Gravidade", "Quantidade"], rows: bySev.map((r) => [r.name, r.value]) },
          ]}
          xlsxName="reacoes.xlsx"
          sheets={[{ name: "Por tipo", rows: tableRows }, { name: "Por gravidade", rows: bySev }]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip />
              <Bar dataKey="value" fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={bySev} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {bySev.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-2">Tipo</th><th className="text-left p-2">Frequência</th><th className="text-left p-2">Taxa por 1000 transfusões</th></tr></thead>
            <tbody>{tableRows.map((r) => <tr key={r.tipo} className="border-t"><td className="p-2">{r.tipo}</td><td className="p-2">{r.freq}</td><td className="p-2">{r.taxa}</td></tr>)}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== 4. Reservas Cirúrgicas ===================== */
function SurgicalReport({ filters }: { filters: Filters }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rep-surgical", filters],
    queryFn: async () => {
      const { data: r } = await supabase.from("surgical_reservations")
        .select("status,surgery_date,reserved_units,anesthesiologist_notes")
        .gte("surgery_date", filters.from).lte("surgery_date", filters.to);
      return r ?? [];
    },
  });

  const summary = useMemo(() => {
    const total = data?.length ?? 0;
    const utilizadas = (data ?? []).filter((r: any) => r.status === "utilizado" || r.status === "confirmado").length;
    const canceladas = (data ?? []).filter((r: any) => r.status === "cancelado").length;
    const taxa = total ? `${((utilizadas / total) * 100).toFixed(1)}%` : "0%";
    return { total, utilizadas, canceladas, taxa };
  }, [data]);

  const rows = (data ?? []).map((r: any) => ({
    data: r.surgery_date, status: r.status,
    bolsas: Array.isArray(r.reserved_units) ? r.reserved_units.reduce((s: number, u: any) => s + (u.quantity ?? 0), 0) : 0,
    obs: r.anesthesiologist_notes ?? "",
  }));

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle>Reservas cirúrgicas</CardTitle></CardHeader>
      <CardContent>
        <ExportBar
          pdfTitle="Reservas Cirúrgicas" filters={buildFiltersText(filters)}
          sections={[
            { heading: "Resumo", columns: ["Total", "Utilizadas", "Canceladas", "Taxa de utilização"], rows: [[summary.total, summary.utilizadas, summary.canceladas, summary.taxa]] },
            { heading: "Detalhe", columns: ["Data", "Status", "Bolsas reservadas", "Observação"], rows: rows.map((r) => [r.data, r.status, r.bolsas, r.obs]) },
          ]}
          xlsxName="reservas-cirurgicas.xlsx"
          sheets={[{ name: "Resumo", rows: [summary] }, { name: "Detalhe", rows }]}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KPI label="Total" value={summary.total} />
          <KPI label="Utilizadas" value={summary.utilizadas} />
          <KPI label="Canceladas" value={summary.canceladas} />
          <KPI label="Taxa de utilização" value={summary.taxa} />
        </div>
        <div className="rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-2">Data</th><th className="text-left p-2">Status</th><th className="text-left p-2">Bolsas reservadas</th><th className="text-left p-2">Observação</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t"><td className="p-2">{r.data}</td><td className="p-2">{r.status}</td><td className="p-2">{r.bolsas}</td><td className="p-2 truncate max-w-xs">{r.obs}</td></tr>)}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== 5. Tempo de Atendimento ===================== */
function TimeReport({ filters }: { filters: Filters }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rep-time", filters],
    queryFn: async () => {
      const { data: reqs } = await supabase.from("transfusion_requests")
        .select("id,created_at,urgency")
        .gte("created_at", filters.from).lte("created_at", filters.to + "T23:59:59");
      const ids = (reqs ?? []).map((r: any) => r.id);
      const { data: ptt } = ids.length
        ? await supabase.from("pre_transfusion_tests").select("request_id,validated_at").in("request_id", ids)
        : { data: [] as any[] };
      const map = new Map<string, string>();
      (ptt ?? []).forEach((p: any) => p.validated_at && map.set(p.request_id, p.validated_at));
      return (reqs ?? []).map((r: any) => ({
        ...r, validated_at: map.get(r.id) ?? null,
        minutos: minutesBetween(r.created_at, map.get(r.id) ?? null),
      }));
    },
  });

  const byUrg = useMemo(() => {
    const m = new Map<string, number[]>();
    (data ?? []).forEach((r: any) => {
      if (r.minutos == null) return;
      if (!m.has(r.urgency)) m.set(r.urgency, []);
      m.get(r.urgency)!.push(r.minutos);
    });
    return Array.from(m.entries()).map(([k, arr]) => ({
      urgencia: URGENCY_LABELS[k] ?? k,
      media: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      n: arr.length,
    }));
  }, [data]);

  const byDay = useMemo(() => {
    const m = new Map<string, number[]>();
    (data ?? []).forEach((r: any) => {
      if (r.minutos == null) return;
      const d = r.created_at.slice(0, 10);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r.minutos);
    });
    return Array.from(m.entries()).map(([d, arr]) => ({
      dia: d, media: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    })).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle>Tempo médio pedido → liberação (min)</CardTitle></CardHeader>
      <CardContent>
        <ExportBar
          pdfTitle="Tempo de Atendimento" filters={buildFiltersText(filters)}
          sections={[
            { heading: "Por urgência", columns: ["Urgência", "Média (min)", "N"], rows: byUrg.map((r) => [r.urgencia, r.media, r.n]) },
            { heading: "Por dia", columns: ["Dia", "Média (min)"], rows: byDay.map((r) => [r.dia, r.media]) },
          ]}
          xlsxName="tempo-atendimento.xlsx"
          sheets={[{ name: "Por urgência", rows: byUrg }, { name: "Por dia", rows: byDay }]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byUrg}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="urgencia" /><YAxis /><Tooltip /><Bar dataKey="media" fill={COLORS[0]} /></BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={byDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dia" /><YAxis /><Tooltip /><Line type="monotone" dataKey="media" stroke={COLORS[1]} strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== 6. Consumo por Setor ===================== */
function WardReport({ filters }: { filters: Filters }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rep-ward", filters],
    queryFn: async () => {
      const { data: d } = await supabase.from("dispensations").select("ward,dispensed_at")
        .gte("dispensed_at", filters.from).lte("dispensed_at", filters.to + "T23:59:59");
      return d ?? [];
    },
  });

  const rows = useMemo(() => {
    const m = new Map<string, number>();
    (data ?? []).forEach((d: any) => {
      const w = d.ward || "Não informado";
      m.set(w, (m.get(w) ?? 0) + 1);
    });
    return Array.from(m.entries()).map(([setor, total]) => ({ setor, total }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  return (
    <Card>
      <CardHeader><CardTitle>Consumo por setor hospitalar</CardTitle></CardHeader>
      <CardContent>
        <ExportBar
          pdfTitle="Consumo por Setor" filters={buildFiltersText(filters)}
          sections={[{ heading: "Bolsas dispensadas", columns: ["Setor", "Total"], rows: rows.map((r) => [r.setor, r.total]) }]}
          xlsxName="consumo-setor.xlsx"
          sheets={[{ name: "Por setor", rows }]}
        />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rows} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" /><YAxis dataKey="setor" type="category" width={140} /><Tooltip />
            <Bar dataKey="total" fill={COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 rounded border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="text-left p-2">Setor</th><th className="text-left p-2">Total</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.setor} className="border-t"><td className="p-2">{r.setor}</td><td className="p-2">{r.total}</td></tr>)}</tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function KPI({ label, value }: { label: string; value: any }) {
  return (
    <Card><CardContent className="pt-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent></Card>
  );
}
