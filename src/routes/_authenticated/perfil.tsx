import { createFileRoute } from "@tanstack/react-router";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import { useUserPrefs } from "@/lib/user-prefs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BackButton } from "@/components/back-button";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/perfil")({ component: ProfilePage });

function ProfilePage() {
  const { profile, roles } = useAuth();
  const { hospital, contrast, setHospital, setContrast } = useUserPrefs();
  const [hospitalDraft, setHospitalDraft] = useState(hospital);

  const saveHospital = () => {
    setHospital(hospitalDraft.trim());
    toast.success("Nome do hospital atualizado");
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <BackButton />
      <h1 className="text-2xl font-semibold">Perfil & Preferências</h1>

      <Card>
        <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Nome</Label><Input value={profile?.full_name ?? ""} disabled /></div>
          <div><Label>E-mail</Label><Input value={profile?.email ?? ""} disabled /></div>
          <div><Label>Cargo(s)</Label><Input value={roles.map((r) => ROLE_LABELS[r]).join(", ")} disabled /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hospital</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="hosp">Nome exibido nos cabeçalhos e impressões</Label>
          <div className="flex gap-2">
            <Input id="hosp" value={hospitalDraft} onChange={(e) => setHospitalDraft(e.target.value)} />
            <button
              className="rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={saveHospital}
            >Salvar</button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Acessibilidade</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Modo de alto contraste</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Aumenta contraste de cores e bordas — recomendado para iluminação hospitalar intensa.
              </p>
            </div>
            <Switch checked={contrast} onCheckedChange={(v) => { setContrast(v); toast.success(v ? "Alto contraste ativado" : "Alto contraste desativado"); }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
