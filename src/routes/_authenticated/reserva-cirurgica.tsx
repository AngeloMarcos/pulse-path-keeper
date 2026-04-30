import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reserva-cirurgica")({ component: Page });

function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reserva Cirúrgica</h1>
      <Card>
        <CardHeader><CardTitle>Em construção</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Módulo de reserva de bolsas para cirurgias programadas — disponível no próximo sprint.
        </CardContent>
      </Card>
    </div>
  );
}
