import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Droplet, Loader2 } from "lucide-react";

export const Route = createFileRoute("/redefinir-senha")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    // Supabase coloca o token no hash (#access_token=...&type=recovery) e dispara
    // o evento PASSWORD_RECOVERY assim que processa a sessão.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setRecoveryReady(true);
      }
    });
    // Caso o usuário já tenha sessão de recovery hidratada
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) {
      toast.error("A senha deve ter ao menos 8 caracteres");
      return;
    }
    if (pwd !== pwd2) {
      toast.error("As senhas não coincidem");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) {
      toast.error("Erro ao redefinir senha", { description: error.message });
      return;
    }
    toast.success("Senha redefinida com sucesso");
    await supabase.auth.signOut();
    nav({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Droplet className="h-7 w-7 text-primary" fill="currentColor" />
          </div>
          <CardTitle className="text-2xl">Redefinir senha</CardTitle>
          <CardDescription>
            {recoveryReady
              ? "Defina uma nova senha para sua conta."
              : "Validando link de recuperação..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd">Nova senha</Label>
              <Input
                id="pwd"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                disabled={!recoveryReady}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd2">Confirmar nova senha</Label>
              <Input
                id="pwd2"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                disabled={!recoveryReady}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !recoveryReady}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
