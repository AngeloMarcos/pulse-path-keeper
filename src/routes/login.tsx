import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Droplet, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) nav({ to: "/" });
  }, [loading, session, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setBusy(false);
    if (error) {
      toast.error("Falha no login", { description: error.message });
      return;
    }
    toast.success("Bem-vindo!");
    nav({ to: "/" });
  };

  const fillDemo = () => { setEmail("gestor@demo.com"); setPwd("Demo@2026!"); };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Droplet className="h-7 w-7 text-primary" fill="currentColor" />
          </div>
          <CardTitle className="text-2xl">SGAT</CardTitle>
          <CardDescription>Sistema de Gestão de Agência Transfusional</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha</Label>
              <Input id="pwd" type="password" autoComplete="current-password" required value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
          <div className="mt-4 space-y-3 text-center text-sm">
            <Link to="/signup" className="text-primary hover:underline">Criar conta</Link>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-left text-xs text-muted-foreground">
              🔒 <strong className="text-foreground">Acesso restrito.</strong> Todas as ações são auditadas.
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-3 text-left text-xs text-muted-foreground">
              <strong className="text-foreground">Conta demo (gestor):</strong>
              <div>gestor@demo.com / Demo@2026!</div>
              <button type="button" onClick={fillDemo} className="mt-1 text-primary hover:underline">
                Preencher automaticamente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
