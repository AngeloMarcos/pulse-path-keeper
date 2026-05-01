import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface Notif {
  id: string;
  title: string;
  body: string | null;
  severity: string;
  type: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
}

const SEVERE = new Set(["grave", "fatal", "critical"]);

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: items = [] } = useQuery<Notif[]>({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notif[];
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notifications-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const unread = useMemo(() => items.filter((i) => !i.read_at), [items]);
  const hasSevere = useMemo(() => unread.some((i) => SEVERE.has(i.severity)), [unread]);

  const markAll = async () => {
    if (!userId) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", userId);
    queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
  };

  const openItem = async (n: Notif) => {
    if (!n.read_at && userId) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    }
    if (n.related_id) {
      navigate({ to: "/reacoes", search: { id: n.related_id } as never });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span
              className={`absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                hasSevere
                  ? "bg-destructive text-destructive-foreground animate-pulse ring-2 ring-destructive/40"
                  : "bg-destructive text-destructive-foreground"
              }`}
            >
              {unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <strong className="text-sm">Notificações</strong>
          {unread.length > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">Nenhuma notificação</div>
          )}
          {items.map((n) => {
            const severe = SEVERE.has(n.severity);
            return (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`w-full text-left p-3 border-b last:border-0 text-sm hover:bg-muted/60 transition-colors ${
                  !n.read_at ? "bg-muted/40" : ""
                }`}
              >
                <div className={`font-medium ${severe ? "text-destructive" : ""}`}>{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString("pt-BR")}
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
