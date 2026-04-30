import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { BLOOD_TYPES_WITH_UNTYPED, BLOOD_TYPE_LABELS, bloodTypeBadgeClass } from "@/lib/domain";
import { Plus, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/pacientes")({ component: PacientesPage });

const schema = z.object({
  full_name: z.string().min(2, "Nome obrigatório"),
  mrn: z.string().min(1, "Prontuário obrigatório"),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  blood_type: z.string().default("NAO_TIPADO"),
  pai_status: z.string().optional(),
  irradiation_required: z.boolean().default(false),
  cmv_negative_required: z.boolean().default(false),
  alerts: z.string().optional(),
});

function PacientesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["patients", search, page],
    queryFn: async () => {
      let q = supabase.from("patients").select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * 10, page * 10 + 9);
      if (search) q = q.or(`full_name.ilike.%${search}%,cpf.ilike.%${search}%,mrn.ilike.%${search}%`);
      const { data, count } = await q;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo Paciente</Button></SheetTrigger>
          <SheetContent className="overflow-auto w-full sm:max-w-lg">
            <SheetHeader><SheetTitle>Novo paciente</SheetTitle></SheetHeader>
            <PatientForm onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["patients"] }); }} />
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, CPF ou prontuário..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Prontuário</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Alertas</th>
                  <th className="text-left p-2">Nascimento</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((p: any) => (
                  <tr key={p.id} className="border-b hover:bg-muted/40">
                    <td className="p-2">
                      <Link to="/pacientes/$id" params={{ id: p.id }} className="text-primary hover:underline">{p.full_name}</Link>
                    </td>
                    <td className="p-2">{p.mrn}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${bloodTypeBadgeClass(p.blood_type)}`}>{BLOOD_TYPE_LABELS[p.blood_type]}</span>
                    </td>
                    <td className="p-2">
                      {(p.alerts || p.irradiation_required || p.cmv_negative_required) && <AlertCircle className="h-4 w-4 text-warning" />}
                    </td>
                    <td className="p-2 text-muted-foreground">{p.birth_date ? new Date(p.birth_date).toLocaleDateString("pt-BR") : "—"}</td>
                  </tr>
                ))}
                {data?.rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum paciente encontrado</td></tr>}
              </tbody>
            </table>
          )}
          <Pagination page={page} setPage={setPage} total={data?.count ?? 0} />
        </CardContent>
      </Card>
    </div>
  );
}

function PatientForm({ onSaved }: { onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const obj: any = Object.fromEntries(fd);
    obj.irradiation_required = fd.get("irradiation_required") === "on";
    obj.cmv_negative_required = fd.get("cmv_negative_required") === "on";
    const parsed = schema.safeParse(obj);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.from("patients").insert(parsed.data as any);
    setBusy(false);
    if (error) { toast.error("Erro ao salvar", { description: error.message }); return; }
    toast.success("Paciente cadastrado");
    onSaved();
  };
  return (
    <form onSubmit={submit} className="space-y-3 mt-4">
      <Field label="Nome completo" required><Input name="full_name" required /></Field>
      <Field label="Prontuário (MRN)" required><Input name="mrn" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CPF"><Input name="cpf" /></Field>
        <Field label="Nascimento"><Input name="birth_date" type="date" /></Field>
      </div>
      <Field label="Tipo sanguíneo">
        <Select name="blood_type" defaultValue="NAO_TIPADO">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {BLOOD_TYPES_WITH_UNTYPED.map((b) => <SelectItem key={b} value={b}>{BLOOD_TYPE_LABELS[b]}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="PAI">
        <Select name="pai_status">
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="negativo">Negativo</SelectItem>
            <SelectItem value="positivo">Positivo</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm"><Checkbox name="irradiation_required" /> Requer irradiação</label>
      <label className="flex items-center gap-2 text-sm"><Checkbox name="cmv_negative_required" /> Requer CMV negativo</label>
      <Field label="Alertas clínicos"><Textarea name="alerts" rows={3} /></Field>
      <Button type="submit" className="w-full" disabled={busy}>Salvar</Button>
    </form>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div className="space-y-1">
      <Label className={required ? "req-asterisk" : ""}>{label}</Label>
      {children}
    </div>
  );
}

function Pagination({ page, setPage, total }: { page: number; setPage: (n: number) => void; total: number }) {
  const pages = Math.ceil(total / 10);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-muted-foreground">Página {page + 1} de {pages} • {total} total</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
        <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
      </div>
    </div>
  );
}
