import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Droplet, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/esqueci-senha")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) {
      toast.error("Erro ao enviar e-mail", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("E-mail de redefinição enviado");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Droplet className="h-7 w-7 text-primary" fill="currentColor" />
          </div>
          <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
          <CardDescription>
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center text-sm">
              <p className="rounded-md border border-border bg-muted/40 p-4">
                Se houver uma conta para <strong className="text-foreground">{email}</strong>,
                você receberá um e-mail com instruções para redefinir sua senha.
              </p>
              <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link de redefinição
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" /> Voltar ao login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
