import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export function ExpiringBanner() {
  const { data } = useQuery({
    queryKey: ["expiring-units"],
    queryFn: async () => {
      const limit = new Date(Date.now() + 48 * 36e5).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("blood_units")
        .select("id", { count: "exact" })
        .eq("status", "disponivel")
        .lte("expiration_date", limit);
      return data?.length ?? 0;
    },
    refetchInterval: 60_000,
  });
  if (!data) return null;
  return (
    <div className="bg-warning/15 border-b border-warning/40 text-warning-foreground px-4 py-2 flex items-center gap-2 text-sm">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <span><strong>{data}</strong> bolsa(s) vencendo em menos de 48h.</span>
      <Link to="/estoque" className="ml-auto text-primary hover:underline text-xs">Ver estoque</Link>
    </div>
  );
}
