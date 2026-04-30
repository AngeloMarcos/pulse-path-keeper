import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/rastreabilidade")({ component: Page });

function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Rastreabilidade</h1>
      <Card>
        <CardHeader><CardTitle>Em construção</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Consulta da auditoria completa: do código ISBT 128 da bolsa até o paciente transfundido — disponível no próximo sprint.
        </CardContent>
      </Card>
    </div>
  );
}
