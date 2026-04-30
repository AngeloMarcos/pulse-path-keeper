import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface Notif { id: string; title: string; body: string | null; severity: string; read_at: string | null; created_at: string; }

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
    setItems((data ?? []) as Notif[]);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("notif-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unread = items.filter((i) => !i.read_at).length;

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", user.id);
    load();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <strong className="text-sm">Notificações</strong>
          {unread > 0 && <button onClick={markAll} className="text-xs text-primary hover:underline">Marcar lidas</button>}
        </div>
        <div className="max-h-80 overflow-auto">
          {items.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação</div>}
          {items.map((n) => (
            <div key={n.id} className={`p-3 border-b last:border-0 text-sm ${!n.read_at ? "bg-muted/40" : ""}`}>
              <div className={`font-medium ${n.severity === "critical" ? "text-destructive" : ""}`}>{n.title}</div>
              {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
