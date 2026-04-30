// Compatibility & label helpers for blood units
import { BLOOD_TYPE_LABELS } from "./domain";

// ABO compatibility for red cells (recipient -> compatible donors)
const RBC_COMPAT: Record<string, string[]> = {
  O_NEG: ["O_NEG"],
  O_POS: ["O_NEG", "O_POS"],
  A_NEG: ["O_NEG", "A_NEG"],
  A_POS: ["O_NEG", "O_POS", "A_NEG", "A_POS"],
  B_NEG: ["O_NEG", "B_NEG"],
  B_POS: ["O_NEG", "O_POS", "B_NEG", "B_POS"],
  AB_NEG: ["O_NEG", "A_NEG", "B_NEG", "AB_NEG"],
  AB_POS: ["O_NEG", "O_POS", "A_NEG", "A_POS", "B_NEG", "B_POS", "AB_NEG", "AB_POS"],
};

export function compatibleUnitsFor(recipientBloodType: string, component: string): string[] {
  // Red-cell components: use RBC compatibility
  if (component === "CH" || component === "CH_IRR" || component === "CH_LAV" || component === "CH_FIL" || component === "GV") {
    return RBC_COMPAT[recipientBloodType] ?? [];
  }
  // Plasma reverse: O recipient takes any plasma (here: keep simple = same group + universal)
  // For PFC/CRIO/CP simple rule: same ABO when known; allow any if recipient unknown.
  if (component === "PFC" || component === "CRIO" || component === "CP") {
    const rh = recipientBloodType.endsWith("NEG") ? "NEG" : "POS";
    const abo = recipientBloodType.split("_")[0];
    return [`${abo}_NEG`, `${abo}_POS`, `AB_${rh}`, "AB_NEG", "AB_POS"];
  }
  return Object.keys(BLOOD_TYPE_LABELS).filter((b) => b !== "NAO_TIPADO");
}

export function aboFromBloodType(bt: string): string {
  if (!bt || bt === "NAO_TIPADO") return "";
  return bt.split("_")[0];
}
export function rhFromBloodType(bt: string): "+" | "-" | "" {
  if (!bt || bt === "NAO_TIPADO") return "";
  return bt.endsWith("NEG") ? "-" : "+";
}

export const STORAGE_LOCATIONS = [
  "Geladeira AT-01",
  "Geladeira AT-02",
  "Geladeira AT-03",
  "Freezer AT-01",
  "Freezer AT-02",
  "Câmara de Plaquetas AT-01",
];

export const DISCARD_REASONS = [
  "Vencimento",
  "Hemólise",
  "Contaminação",
  "Perda de integridade",
  "Outro",
];

export const RETURN_REASONS = [
  "Cirurgia cancelada",
  "Transfusão suspensa",
  "Pedido cancelado",
  "Outro",
];

// Visual barcode (Code 128 simulado usando linhas verticais determinísticas)
export function barcodeBars(text: string): { width: number; black: boolean }[] {
  const bars: { width: number; black: boolean }[] = [];
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) & 0xffff;
  for (let i = 0; i < 60; i++) {
    seed = (seed * 1103515245 + 12345) & 0xffffffff;
    const w = ((seed >> 8) % 3) + 1;
    bars.push({ width: w, black: i % 2 === 0 });
  }
  return bars;
}

export function printDispensationLabel(opts: {
  patient_name: string; mrn: string; bag_number: string; blood_type: string;
  expiration_date: string; released_at: string; professional: string; component: string;
}) {
  const w = window.open("", "_blank", "width=520,height=380");
  if (!w) return;
  const bars = barcodeBars(opts.bag_number).map((b) => `<span style="display:inline-block;width:${b.width}px;height:46px;background:${b.black ? "#000" : "transparent"}"></span>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta ${opts.bag_number}</title>
  <style>
    @page { size: 100mm 70mm; margin: 4mm; }
    body { font-family: -apple-system, system-ui, sans-serif; font-size: 11px; color:#000; margin:0; padding: 6px; }
    .head { border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; display:flex; justify-content:space-between; }
    .name { font-size: 13px; font-weight: 700; }
    .row { display:flex; justify-content: space-between; margin: 2px 0; }
    .bc { text-align:center; margin: 6px 0; line-height: 0; }
    .bc-num { line-height: normal; font-family: monospace; font-size: 11px; margin-top: 2px; }
    .foot { font-size: 9px; color:#444; border-top:1px dashed #888; padding-top:3px; margin-top:6px; }
  </style></head><body>
  <div class="head"><div><strong>SGAT — Etiqueta de Dispensação</strong></div><div>${opts.component}</div></div>
  <div class="name">${opts.patient_name}</div>
  <div class="row"><span>Prontuário</span><strong>${opts.mrn}</strong></div>
  <div class="row"><span>Grupo</span><strong>${opts.blood_type}</strong></div>
  <div class="row"><span>Validade</span><strong>${new Date(opts.expiration_date).toLocaleDateString("pt-BR")}</strong></div>
  <div class="row"><span>Liberada em</span><strong>${new Date(opts.released_at).toLocaleString("pt-BR")}</strong></div>
  <div class="bc">${bars}<div class="bc-num">${opts.bag_number}</div></div>
  <div class="foot">Liberado por: ${opts.professional}</div>
  <script>window.onload = () => window.print();</script>
  </body></html>`;
  w.document.write(html); w.document.close();
}
