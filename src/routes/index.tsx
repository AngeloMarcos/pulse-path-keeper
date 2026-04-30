import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { loading, session, profile, roles } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (!session) return <Navigate to="/login" />;
  if (!profile?.active || roles.length === 0) return <Navigate to="/pending" />;
  return <Navigate to="/dashboard" />;
}

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
