import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AlertOctagon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SevereReaction {
  id: string;
  severity: string;
  reaction_type: string;
  notification_datetime: string;
  patient_id: string;
  closed_at: string | null;
  patient?: { full_name: string } | null;
}

export function SevereReactionBanner() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const enabled = !!user && hasRole("hemoterapeuta");

  const { data: reactions = [] } = useQuery<SevereReaction[]>({
    queryKey: ["severe-reactions-active"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adverse_reactions")
        .select("id, severity, reaction_type, notification_datetime, patient_id, closed_at, patient:patients(full_name)")
        .in("severity", ["grave", "fatal"])
        .is("closed_at", null)
        .order("notification_datetime", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SevereReaction[];
    },
  });

  const visible = reactions.filter((r) => !dismissed.has(r.id));
  if (!enabled || visible.length === 0) return null;

  const r = visible[0];

  const dismiss = async () => {
    setDismissed((prev) => new Set(prev).add(r.id));
    if (user) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("related_id", r.id)
        .is("read_at", null);
    }
  };

  const openFit = () => {
    navigate({ to: "/reacoes", search: { id: r.id } as never });
  };

  return (
    <div className="sticky top-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 flex items-center gap-3 font-medium shadow-lg border-b-2 border-destructive-foreground/20 animate-pulse">
      <AlertOctagon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-sm">
        ⚠ REAÇÃO {r.severity.toUpperCase()} ATIVA —{" "}
        <strong>{r.patient?.full_name ?? "Paciente"}</strong> — {r.reaction_type} —{" "}
        {new Date(r.notification_datetime).toLocaleString("pt-BR")}
        {visible.length > 1 && (
          <span className="ml-2 text-xs opacity-90">(+{visible.length - 1} outra{visible.length > 2 ? "s" : ""})</span>
        )}
      </span>
      <Button size="sm" variant="secondary" onClick={openFit}>
        Abrir FIT
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive-foreground hover:bg-destructive-foreground/20" onClick={dismiss}>
        <X className="h-4 w-4 mr-1" />
        Dispensar
      </Button>
    </div>
  );
}
