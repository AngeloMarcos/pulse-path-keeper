import { createFileRoute, Outlet, Navigate, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import { SIDEBAR_ITEMS } from "@/lib/domain";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { ExpiringBanner } from "@/components/expiring-banner";
import { SevereReactionBanner } from "@/components/severe-reaction-banner";
import {
  LayoutDashboard, Users, ClipboardList, FlaskConical, Droplet, Activity,
  AlertTriangle, BarChart3, LogOut, Settings, Loader2,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, ClipboardList, FlaskConical, Droplet, Activity, AlertTriangle, BarChart3,
};

export const Route = createFileRoute("/_authenticated")({ component: AuthLayout });

function AuthLayout() {
  const { loading, session, profile, roles } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" />;
  if (!profile?.active || roles.length === 0) return <Navigate to="/pending" />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center px-3 gap-2 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1" />
            <NotificationBell />
          </header>
          <SevereReactionBanner />
          <ExpiringBanner />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const { profile, roles, hasRole, hasAnyRole, signOut } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visibleItems = SIDEBAR_ITEMS.filter((it) => it.roles === "all" || hasAnyRole(it.roles));
  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-destructive/15 flex items-center justify-center">
            <Droplet className="h-4 w-4 text-destructive" />
          </div>
          <div className="font-semibold text-sm">HemoVida</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((it) => {
                const Icon = ICONS[it.icon] ?? LayoutDashboard;
                const active = pathname === it.to || pathname.startsWith(it.to + "/");
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.to}>
                        <Icon className="h-4 w-4" />
                        <span>{it.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {hasRole("gestor") && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/usuarios")}>
                    <Link to="/usuarios">
                      <Settings className="h-4 w-4" />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile?.full_name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {roles.map((r) => ROLE_LABELS[r]).join(", ")}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={async () => { await signOut(); nav({ to: "/login" }); }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
