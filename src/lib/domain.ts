// Domain helpers and labels
import type { AppRole } from "./auth";

export const BLOOD_TYPE_LABELS: Record<string, string> = {
  O_NEG: "O-",
  O_POS: "O+",
  A_NEG: "A-",
  A_POS: "A+",
  B_NEG: "B-",
  B_POS: "B+",
  AB_NEG: "AB-",
  AB_POS: "AB+",
  NAO_TIPADO: "Não tipado",
};
export const BLOOD_TYPES = ["O_NEG","O_POS","A_NEG","A_POS","B_NEG","B_POS","AB_NEG","AB_POS"] as const;
export const BLOOD_TYPES_WITH_UNTYPED = [...BLOOD_TYPES, "NAO_TIPADO"] as const;

export const COMPONENT_LABELS: Record<string, string> = {
  CH: "Concentrado de Hemácias",
  CP: "Concentrado de Plaquetas",
  PFC: "Plasma Fresco Congelado",
  CRIO: "Crioprecipitado",
  GV: "Granulócitos",
  CH_IRR: "CH Irradiado",
  CH_LAV: "CH Lavado",
  CH_FIL: "CH Filtrado",
};
export const COMPONENT_TYPES = ["CH","CP","PFC","CRIO","GV","CH_IRR","CH_LAV","CH_FIL"] as const;
export const COMPONENT_MAIN = ["CH","CP","PFC","CRIO"] as const;

export const URGENCY_LABELS: Record<string, string> = {
  rotina: "Rotina",
  urgencia: "Urgência",
  emergencia: "Emergência",
  emergencia_absoluta: "Emergência absoluta",
};
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aguardando_amostra: "Aguardando amostra",
  testes_em_andamento: "Testes em andamento",
  pronto_dispensar: "Pronto p/ dispensar",
  dispensado: "Dispensado",
  transfundindo: "Transfundindo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
export const UNIT_STATUS_LABELS: Record<string, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  dispensado: "Dispensado",
  transfundido: "Transfundido",
  descartado: "Descartado",
  vencido: "Vencido",
};

export const REACTION_TYPE_LABELS: Record<string, string> = {
  rfnh: "RFNH (febril não hemolítica)",
  alergica_leve: "Alérgica leve",
  alergica_grave: "Alérgica grave",
  anafilaxia: "Anafilaxia",
  hemolitica_aguda: "Hemolítica aguda (suspeita)",
  hemolitica_tardia: "Hemolítica tardia (suspeita)",
  trali: "TRALI",
  taco: "TACO",
  bacteriana: "Contaminação bacteriana (suspeita)",
  hipotensao: "Hipotensão isolada",
  hipotensao_bradicinina: "Hipotensiva por bradicinina",
  outra: "Outra (especificar)",
};
export const SEVERITY_LABELS: Record<string, string> = {
  leve: "Leve",
  moderada: "Moderada",
  grave: "Grave",
  fatal: "Fatal",
};

export type SidebarItemConfig = {
  to: string;
  label: string;
  icon: string;
  roles: AppRole[] | "all";
};

export const SIDEBAR_ITEMS: SidebarItemConfig[] = [
  { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: "all" },
  { to: "/pacientes", label: "Pacientes", icon: "Users", roles: ["hemoterapeuta","biomedico","tecnico","medico","gestor"] },
  { to: "/solicitacoes", label: "Solicitações", icon: "ClipboardList", roles: "all" },
  { to: "/reserva-cirurgica", label: "Reserva Cirúrgica", icon: "CalendarClock", roles: ["hemoterapeuta","biomedico","tecnico","medico","gestor"] },
  { to: "/testes", label: "Testes Pré-Transfusionais", icon: "FlaskConical", roles: ["hemoterapeuta","biomedico","tecnico"] },
  { to: "/transfusoes", label: "Acompanhamento de Transfusão", icon: "Activity", roles: "all" },
  { to: "/reacoes", label: "Reações Adversas / FIT", icon: "AlertTriangle", roles: ["hemoterapeuta","biomedico","enfermeiro","medico","gestor"] },
  { to: "/estoque", label: "Estoque de Bolsas", icon: "Droplet", roles: ["hemoterapeuta","biomedico","tecnico","gestor"] },
  { to: "/integracao", label: "Integração HIS/LIS", icon: "Cable", roles: ["hemoterapeuta","gestor"] },
  { to: "/rastreabilidade", label: "Rastreabilidade", icon: "Search", roles: ["hemoterapeuta","biomedico","gestor"] },
  { to: "/relatorios", label: "Relatórios", icon: "BarChart3", roles: ["hemoterapeuta","gestor"] },
];

export function bloodTypeBadgeClass(bt: string): string {
  if (bt.endsWith("NEG")) return "bg-destructive/15 text-destructive border border-destructive/30";
  if (bt.endsWith("POS")) return "bg-primary/20 text-primary-foreground border border-primary/40";
  return "bg-muted text-muted-foreground border border-border";
}

export function expirationClass(date: string): string {
  const ms = new Date(date).getTime() - Date.now();
  const h = ms / 36e5;
  if (ms < 0) return "text-destructive font-semibold";
  if (h < 48) return "text-destructive font-semibold";
  if (h < 24 * 7) return "text-warning font-medium";
  return "text-foreground";
}

export function urgencyBadgeClass(u: string): string {
  if (u === "emergencia_absoluta") return "bg-destructive text-destructive-foreground pulse-emergency";
  if (u === "emergencia") return "bg-destructive/80 text-destructive-foreground";
  if (u === "urgencia") return "bg-warning text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

export function statusBadgeClass(s: string): string {
  switch (s) {
    case "pendente": return "bg-muted text-muted-foreground";
    case "em_analise": return "bg-primary/20 text-primary-foreground";
    case "aguardando_amostra": return "bg-warning/20 text-warning";
    case "testes_em_andamento": return "bg-warning/20 text-warning";
    case "pronto_dispensar": return "bg-success/20 text-success";
    case "dispensado": return "bg-primary/20 text-primary-foreground";
    case "transfundindo": return "bg-primary/30 text-primary-foreground";
    case "concluido": return "bg-success/30 text-success";
    case "transfundido": return "bg-success/30 text-success";
    case "cancelado": return "bg-destructive/20 text-destructive";
    case "disponivel": return "bg-success/20 text-success";
    case "reservado": return "bg-warning/20 text-warning";
    case "descartado": return "bg-destructive/20 text-destructive";
    case "vencido": return "bg-destructive/20 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}
