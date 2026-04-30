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
