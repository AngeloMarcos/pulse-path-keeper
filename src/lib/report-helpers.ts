import * as XLSX from "xlsx";
import { getHospitalName } from "./user-prefs";

export function exportToXLSX(filename: string, sheets: { name: string; rows: any[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 30));
  }
  XLSX.writeFile(wb, filename);
}

export function printReportPDF(opts: {
  title: string;
  subtitle?: string;
  filters?: Record<string, string>;
  sections: { heading: string; columns: string[]; rows: (string | number)[][] }[];
}) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  const filtersHtml = opts.filters
    ? `<div class="filters">${Object.entries(opts.filters).map(([k, v]) => `<span><b>${k}:</b> ${v}</span>`).join(" · ")}</div>`
    : "";
  const sec = opts.sections.map((s) => `
    <h2>${s.heading}</h2>
    <table>
      <thead><tr>${s.columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${s.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${opts.title}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: -apple-system, system-ui, sans-serif; font-size: 11px; color:#000; }
    h1 { font-size: 16px; text-align:center; margin: 0; color:#1F3864; }
    h2 { font-size: 12px; background:#1F3864; color:#fff; padding:4px 8px; margin: 12px 0 4px; }
    .header { text-align:center; border-bottom: 2px solid #1F3864; padding-bottom: 8px; margin-bottom: 10px; }
    .filters { font-size:10px; color:#444; margin: 6px 0 10px; text-align:center; }
    table { width:100%; border-collapse: collapse; margin: 4px 0 10px; }
    th, td { padding: 4px 6px; border: 1px solid #999; font-size:10px; text-align:left; }
    th { background:#f0f0f0; }
  </style></head><body>
  <div class="header">
    <h1>${opts.title}</h1>
    ${opts.subtitle ? `<div style="font-size:10px;">${opts.subtitle}</div>` : ""}
    <div style="font-size:10px; color:#666;">Emitido em ${new Date().toLocaleString("pt-BR")}</div>
  </div>
  ${filtersHtml}
  ${sec}
  <script>window.onload = () => window.print();</script>
  </body></html>`);
  w.document.close();
}

// Diff in seconds between two ISO timestamps; returns minutes (rounded)
export function minutesBetween(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return null;
  return Math.max(0, Math.round((db - da) / 60000));
}
