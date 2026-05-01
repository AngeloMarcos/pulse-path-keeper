import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function BackButton({ to, label = "Voltar" }: { to?: string; label?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => (to ? router.navigate({ to }) : router.history.back())}
      className="gap-1"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </Button>
  );
}
