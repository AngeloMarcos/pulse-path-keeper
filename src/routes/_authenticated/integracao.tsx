import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/integracao")({ component: Page });

function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Integração HIS/LIS</h1>
      <Card>
        <CardHeader><CardTitle>Em construção</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Logs de eventos de integração com sistemas hospitalares (HIS) e laboratoriais (LIS) — disponível no próximo sprint.
        </CardContent>
      </Card>
    </div>
  );
}
