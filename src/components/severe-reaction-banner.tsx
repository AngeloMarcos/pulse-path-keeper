import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SevereReactionBanner() {
  const { user, hasRole } = useAuth();
  const [count, setCount] = useState(0);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .eq("type", "severe_reaction")
      .is("read_at", null);
    setCount(data?.length ?? 0);
  };

  useEffect(() => {
    if (!hasRole("hemoterapeuta")) return;
    load();
    const ch = supabase.channel("severe-banner-" + user!.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user!.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasRole("hemoterapeuta")]);

  if (!hasRole("hemoterapeuta") || count === 0) return null;

  const dismiss = async () => {
    await supabase.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user!.id).eq("type", "severe_reaction").is("read_at", null);
    setCount(0);
  };

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center gap-3 font-medium">
      <AlertOctagon className="h-5 w-5" />
      <span>REAÇÃO GRAVE — {count} notificação(ões) não lida(s) ao hemoterapeuta.</span>
      <Button size="sm" variant="secondary" className="ml-auto" onClick={dismiss}>Marcar como visto</Button>
    </div>
  );
}
