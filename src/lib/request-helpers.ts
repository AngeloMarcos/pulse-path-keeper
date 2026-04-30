// Helpers: print HTML form (PDF via window.print) and LIS mock
export function simulateLisFetch(): Promise<{ hb: number; ht: number; platelets: number; tp: number; ttpa: number }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({
      hb: +(7 + Math.random() * 5).toFixed(1),
      ht: +(22 + Math.random() * 15).toFixed(1),
      platelets: Math.round(50 + Math.random() * 250),
      tp: +(1 + Math.random() * 0.5).toFixed(2),
      ttpa: +(28 + Math.random() * 15).toFixed(1),
    }), 800);
  });
}

export function printRequestPDF(req: {
  patient_name: string; mrn: string; bed?: string; blood_type: string;
  diagnosis: string; clinical_indication: string; component_type: string;
  quantity: number; urgency: string; hb?: number | null; ht?: number | null;
  platelets?: number | null; tp?: number | null; ttpa?: number | null;
  special?: string[]; emergency_justification?: string | null;
  observations?: string; physician_name: string; crm?: string; created_at: string;
}) {
  const w = window.open("", "_blank", "width=820,height=1100");
  if (!w) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Solicitação Transfusional</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: -apple-system, system-ui, sans-serif; font-size: 12px; color:#000; }
    h1 { font-size: 16px; text-align:center; margin: 0 0 4px; }
    h2 { font-size: 13px; background:#1F3864; color:#fff; padding:4px 8px; margin: 12px 0 6px; }
    .header { text-align:center; border-bottom: 2px solid #1F3864; padding-bottom: 8px; margin-bottom: 10px; }
    table { width:100%; border-collapse: collapse; margin: 4px 0; }
    td { padding: 4px 6px; border: 1px solid #ccc; vertical-align: top; }
    .label { background:#f5f5f5; font-weight:600; width:30%; }
    .sig { margin-top: 40px; display:flex; justify-content: space-between; }
    .sig div { width:45%; border-top:1px solid #000; padding-top:4px; text-align:center; font-size:11px; }
    .urg { color:#b00; font-weight:bold; }
  </style></head><body>
  <div class="header">
    <h1>SGAT — Solicitação de Transfusão</h1>
    <div>Hospital — Agência Transfusional</div>
    <div style="font-size:10px; color:#555;">Emitido em ${new Date(req.created_at).toLocaleString("pt-BR")}</div>
  </div>
  <h2>1. Identificação do Paciente</h2>
  <table>
    <tr><td class="label">Nome</td><td>${req.patient_name}</td></tr>
    <tr><td class="label">Prontuário (MRN)</td><td>${req.mrn}</td></tr>
    <tr><td class="label">Leito / Setor</td><td>${req.bed ?? "—"}</td></tr>
    <tr><td class="label">Tipo sanguíneo</td><td>${req.blood_type}</td></tr>
  </table>
  <h2>2. Dados Clínicos</h2>
  <table>
    <tr><td class="label">Diagnóstico</td><td>${req.diagnosis}</td></tr>
    <tr><td class="label">Indicação clínica</td><td>${req.clinical_indication}</td></tr>
    <tr><td class="label">Hb / Ht</td><td>${req.hb ?? "—"} g/dL &nbsp;/&nbsp; ${req.ht ?? "—"} %</td></tr>
    <tr><td class="label">Plaquetas</td><td>${req.platelets ?? "—"} × 10³/µL</td></tr>
    <tr><td class="label">TP / TTPA</td><td>${req.tp ?? "—"} INR &nbsp;/&nbsp; ${req.ttpa ?? "—"} s</td></tr>
  </table>
  <h2>3. Hemocomponente Solicitado</h2>
  <table>
    <tr><td class="label">Tipo</td><td>${req.component_type}</td></tr>
    <tr><td class="label">Quantidade</td><td>${req.quantity}</td></tr>
    <tr><td class="label">Urgência</td><td class="${req.urgency.includes("emergencia") ? "urg" : ""}">${req.urgency}</td></tr>
    <tr><td class="label">Requisitos especiais</td><td>${(req.special && req.special.length) ? req.special.join(", ") : "—"}</td></tr>
    ${req.emergency_justification ? `<tr><td class="label">Justificativa de emergência</td><td>${req.emergency_justification}</td></tr>` : ""}
    ${req.observations ? `<tr><td class="label">Observações</td><td>${req.observations}</td></tr>` : ""}
  </table>
  <div class="sig">
    <div>${req.physician_name}<br/><small>${req.crm ? "CRM " + req.crm : "Médico solicitante"}</small></div>
    <div>Agência Transfusional<br/><small>Recebimento</small></div>
  </div>
  <script>window.onload = () => { window.print(); };</script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}

export type VitalRow = {
  label: string;
  datetime?: string | null;
  pas?: number | null;
  pad?: number | null;
  fc?: number | null;
  temp?: number | null;
  spo2?: number | null;
  obs?: string | null;
};

export function printTransfusionForm(t: {
  patient_name: string; mrn: string; bed?: string;
  patient_blood_type: string; bag_number: string; bag_blood_type: string;
  component_type: string; volume_total: number;
  started_at: string; finished_at?: string | null;
  technician_at?: string; nurse?: string; ward?: string;
  access_route?: string; flow_rate?: string;
  vitals: VitalRow[];
  intercurrence?: boolean; intercurrence_desc?: string;
  intercurrence_time?: string; intercurrence_action?: string;
  suspended?: boolean; volume_transfused?: number | null; bag_destination?: string;
  volume_transfused_ml?: number | null;
  checklist?: Record<string, boolean>;
}) {
  const w = window.open("", "_blank", "width=820,height=1100");
  if (!w) return;
  const vrow = (v: VitalRow) => `<tr>
    <td class="label">${v.label}</td>
    <td>${v.datetime ? new Date(v.datetime).toLocaleString("pt-BR") : "—"}</td>
    <td>${v.pas ?? "—"}/${v.pad ?? "—"}</td>
    <td>${v.fc ?? "—"}</td><td>${v.temp ?? "—"}</td>
    <td>${v.spo2 ?? "—"}</td><td>${v.obs ?? "—"}</td>
  </tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>POP-GSAT-05 Acompanhamento de Transfusão</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: -apple-system, system-ui, sans-serif; font-size: 11px; color:#000; }
    h1 { font-size: 15px; text-align:center; margin: 0; }
    h2 { font-size: 12px; background:#1F3864; color:#fff; padding:4px 8px; margin: 10px 0 4px; }
    .header { text-align:center; border-bottom: 2px solid #1F3864; padding-bottom: 6px; margin-bottom: 8px; }
    table { width:100%; border-collapse: collapse; margin: 3px 0; }
    td, th { padding: 3px 5px; border: 1px solid #999; vertical-align: top; font-size:10px; }
    .label { background:#f0f0f0; font-weight:600; }
    .sig { margin-top: 30px; display:flex; justify-content: space-between; }
    .sig div { width:45%; border-top:1px solid #000; padding-top:4px; text-align:center; font-size:10px; }
  </style></head><body>
  <div class="header">
    <h1>POP-GSAT-05 — Formulário de Acompanhamento de Transfusão</h1>
    <div style="font-size:10px;">Hospital — Agência Transfusional · SGAT</div>
  </div>
  <h2>1. Identificação</h2>
  <table>
    <tr><td class="label">Paciente</td><td>${t.patient_name}</td><td class="label">Prontuário</td><td>${t.mrn}</td></tr>
    <tr><td class="label">Leito/Setor</td><td>${t.bed ?? t.ward ?? "—"}</td><td class="label">Tipo paciente</td><td>${t.patient_blood_type}</td></tr>
    <tr><td class="label">Código bolsa</td><td>${t.bag_number}</td><td class="label">Tipo bolsa</td><td>${t.bag_blood_type}</td></tr>
    <tr><td class="label">Hemocomponente</td><td>${t.component_type}</td><td class="label">Volume total</td><td>${t.volume_total} ml</td></tr>
    <tr><td class="label">Técnico AT</td><td>${t.technician_at ?? "—"}</td><td class="label">Enfermeiro(a)</td><td>${t.nurse ?? "—"}</td></tr>
    <tr><td class="label">Via de acesso</td><td>${t.access_route ?? "—"}</td><td class="label">Fluxo</td><td>${t.flow_rate ?? "—"}</td></tr>
  </table>
  <h2>2. Sinais Vitais</h2>
  <table>
    <thead><tr><th>Momento</th><th>Data/hora</th><th>PA (mmHg)</th><th>FC</th><th>Temp</th><th>SpO₂</th><th>Obs</th></tr></thead>
    <tbody>${t.vitals.map(vrow).join("")}</tbody>
  </table>
  <h2>3. Intercorrências</h2>
  <table>
    <tr><td class="label">Ocorreu intercorrência?</td><td>${t.intercurrence ? "SIM" : "NÃO"}</td></tr>
    ${t.intercurrence ? `
    <tr><td class="label">Descrição</td><td>${t.intercurrence_desc ?? "—"}</td></tr>
    <tr><td class="label">Horário</td><td>${t.intercurrence_time ?? "—"}</td></tr>
    <tr><td class="label">Conduta</td><td>${t.intercurrence_action ?? "—"}</td></tr>
    <tr><td class="label">Suspensa?</td><td>${t.suspended ? "SIM" : "NÃO"}</td></tr>
    ${t.suspended ? `
    <tr><td class="label">Volume até suspensão</td><td>${t.volume_transfused ?? "—"} ml</td></tr>
    <tr><td class="label">Destino da bolsa</td><td>${t.bag_destination ?? "—"}</td></tr>` : ""}
    ` : ""}
  </table>
  <h2>4. Finalização</h2>
  <table>
    <tr><td class="label">Início</td><td>${new Date(t.started_at).toLocaleString("pt-BR")}</td>
        <td class="label">Término</td><td>${t.finished_at ? new Date(t.finished_at).toLocaleString("pt-BR") : "—"}</td></tr>
    <tr><td class="label">Volume total transfundido</td><td colspan="3">${t.volume_transfused_ml ?? "—"} ml</td></tr>
  </table>
  ${t.checklist ? `<table><tbody>${Object.entries(t.checklist).map(([k,v])=>`<tr><td>${v?"☑":"☐"} ${k}</td></tr>`).join("")}</tbody></table>` : ""}
  <div class="sig">
    <div>${t.technician_at ?? ""}<br/><small>Técnico AT — entrega</small></div>
    <div>${t.nurse ?? ""}<br/><small>Enfermeiro(a) — recebimento</small></div>
  </div>
  <script>window.onload = () => { window.print(); };</script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}
