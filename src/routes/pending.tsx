import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/pending")({ component: PendingPage });

function PendingPage() {
  const { loading, session, profile, roles, signOut, refresh } = useAuth();
  const nav = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" />;
  if (profile?.active && roles.length > 0) return <Navigate to="/dashboard" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
            <Clock className="h-6 w-6 text-warning" />
          </div>
          <CardTitle>Aguardando aprovação</CardTitle>
          <CardDescription>
            Sua conta ({profile?.email}) foi criada com sucesso. Um gestor precisa aprovar e atribuir seu cargo antes do acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={async () => { await refresh(); }}>Verificar novamente</Button>
          <Button variant="outline" onClick={async () => { await signOut(); nav({ to: "/login" }); }}>
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
