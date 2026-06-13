import { Quote, DashboardData } from '../types';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function fmt(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n);
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function openPrintWindow(html: string, filename: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Permite ventanas emergentes para descargar el PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.document.title = filename;

  // Esperar a que cargue completamente antes de imprimir
  win.onload = () => {
    setTimeout(() => {
      win.print();
      // Cerrar la ventana después de imprimir (en la mayoría de navegadores)
      win.onafterprint = () => win.close();
    }, 400);
  };
}

// ─── Shared CSS ────────────────────────────────────────────────────────────────

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #1e293b;
    background: #fff;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4;
    margin: 15mm 16mm;
  }
  @media print {
    .no-print { display: none !important; }
    a { text-decoration: none; color: inherit; }
  }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; }
`;

// ─── Quote PDF ────────────────────────────────────────────────────────────────

export function downloadQuotePDF(
  quote: Quote,
  companyName: string,
  currency = 'MXN'
) {
  const items = quote.items ?? [];
  const subtotal  = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100), 0);
  const discAmt   = quote.discountType === 'fixed'
    ? quote.discountValue
    : subtotal * quote.discountValue / 100;
  const taxable   = subtotal - discAmt;
  const taxAmt    = taxable * quote.taxRate / 100;
  const total     = taxable + taxAmt;

  const statusLabel: Record<string, string> = {
    draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada', expired: 'Vencida',
  };
  const statusColor: Record<string, string> = {
    draft: '#64748b', sent: '#3b82f6', accepted: '#10b981', rejected: '#ef4444', expired: '#f59e0b',
  };

  const itemRows = items.map(item => {
    const lineDisc  = 1 - (item.discount ?? 0) / 100;
    const lineTotal = item.quantity * item.unitPrice * lineDisc;
    return `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;">${item.description}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(item.unitPrice, currency)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;">${item.discount ? item.discount + '%' : '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:500;">${fmt(lineTotal, currency)}</td>
      </tr>`;
  }).join('');

  const assigneeName = quote.assignee
    ? `${quote.assignee.firstName} ${quote.assignee.lastName}`
    : '—';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cotización ${quote.number}</title>
  <style>
    ${BASE_CSS}
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #1e3a5f;
    }
    .logo-mark {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      border-radius: 9px;
      background: linear-gradient(135deg, #1e3a5f, #0a1628);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-text { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: .5px; }
    .logo-text span { color: #3b82f6; }
    .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .quote-id-block { text-align: right; }
    .quote-number { font-size: 22px; font-weight: 800; color: #0f172a; }
    .quote-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .08em; }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      margin-top: 6px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 28px;
    }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; font-weight: 600; margin-bottom: 3px; }
    .meta-value { font-size: 13px; font-weight: 600; color: #0f172a; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .1em;
      color: #64748b;
      margin-bottom: 10px;
    }
    .items-table th {
      background: #0f172a;
      color: #e2e8f0;
      padding: 9px 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .items-table th:last-child,
    .items-table td:last-child { text-align: right; }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .totals-inner { width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #475569; }
    .total-row.grand {
      border-top: 2px solid #0f172a;
      margin-top: 8px;
      padding-top: 10px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .notes-box {
      margin-top: 28px;
      padding: 14px 16px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 3px solid #3b82f6;
    }
    .terms-box {
      margin-top: 14px;
      padding: 14px 16px;
      background: #fff7ed;
      border-radius: 8px;
      border-left: 3px solid #f59e0b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 12px 22px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(37,99,235,.4);
    }
  </style>
</head>
<body>

<!-- Print button (hidden in print) -->
<button class="print-btn no-print" onclick="window.print()">⬇ Guardar como PDF</button>

<!-- Header -->
<div class="header">
  <div class="logo-mark">
    <div class="logo-icon">
      <svg width="22" height="22" viewBox="0 0 34 34" fill="none">
        <defs>
          <linearGradient id="lg" x1="6" y1="24" x2="28" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
        <path d="M6 24 C10 20,14 22,18 17 C21 13,24 12,28 8" stroke="url(#lg)" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <circle cx="28" cy="8" r="3" fill="#60a5fa"/>
      </svg>
    </div>
    <div>
      <div class="logo-text">PROSPERA<span>.AI</span></div>
      <div class="company-sub">${companyName}</div>
    </div>
  </div>
  <div class="quote-id-block">
    <div class="quote-label">Cotización</div>
    <div class="quote-number">${quote.number}</div>
    <div>
      <span class="status-badge" style="background:${statusColor[quote.status] ?? '#64748b'}">
        ${statusLabel[quote.status] ?? quote.status}
      </span>
    </div>
  </div>
</div>

<!-- Meta info -->
<div class="meta-grid">
  <div>
    <div class="meta-label">Título</div>
    <div class="meta-value">${quote.title}</div>
  </div>
  ${quote.accountName ? `
  <div>
    <div class="meta-label">Cliente / Cuenta</div>
    <div class="meta-value">${quote.accountName}</div>
  </div>` : '<div></div>'}
  <div>
    <div class="meta-label">Responsable</div>
    <div class="meta-value">${assigneeName}</div>
  </div>
  <div>
    <div class="meta-label">Fecha de emisión</div>
    <div class="meta-value">${fmtDate(quote.createdAt)}</div>
  </div>
  ${quote.validUntil ? `
  <div>
    <div class="meta-label">Válida hasta</div>
    <div class="meta-value">${fmtDate(quote.validUntil)}</div>
  </div>` : '<div></div>'}
  <div>
    <div class="meta-label">Moneda</div>
    <div class="meta-value">${currency}</div>
  </div>
</div>

<!-- Items -->
<div class="section-title">Partidas</div>
<table class="items-table">
  <thead>
    <tr>
      <th style="width:45%;">Descripción</th>
      <th style="width:10%;text-align:center;">Cant.</th>
      <th style="width:15%;text-align:right;">Precio unit.</th>
      <th style="width:10%;text-align:right;">Desc.</th>
      <th style="width:20%;text-align:right;">Total</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<!-- Totals -->
<div class="totals">
  <div class="totals-inner">
    <div class="total-row"><span>Subtotal</span><span>${fmt(subtotal, currency)}</span></div>
    ${discAmt > 0 ? `<div class="total-row"><span>Descuento</span><span>−${fmt(discAmt, currency)}</span></div>` : ''}
    ${quote.taxRate > 0 ? `<div class="total-row"><span>IVA (${quote.taxRate}%)</span><span>${fmt(taxAmt, currency)}</span></div>` : ''}
    <div class="total-row grand"><span>TOTAL</span><span>${fmt(total, currency)}</span></div>
  </div>
</div>

<!-- Notes & Terms -->
${quote.notes ? `
<div class="notes-box">
  <div class="section-title" style="margin-bottom:6px;">Notas</div>
  <p style="color:#475569;font-size:13px;">${quote.notes}</p>
</div>` : ''}

${quote.terms ? `
<div class="terms-box">
  <div class="section-title" style="margin-bottom:6px;color:#92400e;">Términos y condiciones</div>
  <p style="color:#78350f;font-size:13px;">${quote.terms}</p>
</div>` : ''}

<!-- Footer -->
<div class="footer">
  <span>Generado por PROSPERA.AI · ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
  <span>${quote.number}</span>
</div>

</body>
</html>`;

  openPrintWindow(html, `Cotizacion-${quote.number}`);
}

// ─── Dashboard Report PDF ──────────────────────────────────────────────────────

export function downloadDashboardPDF(
  data: DashboardData,
  periodLabel: string,
  companyName: string,
  currency = 'MXN'
) {
  const { kpis, recentActivities, leadsBySource, opportunitiesByStage } = data;

  const sourceRows = leadsBySource.map(s => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${s.source || 'Sin fuente'}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${s.count}</td>
    </tr>`).join('');

  const stageRows = opportunitiesByStage.map(s => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};margin-right:6px;"></span>
        ${s.stageName}
      </td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${s.count}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${fmt(s.value, currency)}</td>
    </tr>`).join('');

  const activityRows = recentActivities.slice(0, 10).map(a => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-transform:capitalize;">${a.type}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${a.subject}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;">${a.owner}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:11px;">${fmtDate(a.createdAt)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Informe PROSPERA.AI — ${periodLabel}</title>
  <style>
    ${BASE_CSS}
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 2px solid #1e3a5f;
      margin-bottom: 28px;
    }
    .logo-text { font-size: 20px; font-weight: 800; color: #0f172a; }
    .logo-text span { color: #3b82f6; }
    .period-badge {
      background: #eff6ff;
      color: #1d4ed8;
      padding: 4px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #bfdbfe;
    }
    .report-title { font-size: 14px; color: #475569; margin-top: 4px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px 16px;
      border: 1px solid #e2e8f0;
    }
    .kpi-card.highlight { background: #eff6ff; border-color: #bfdbfe; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #64748b; font-weight: 700; margin-bottom: 6px; }
    .kpi-value { font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1; }
    .kpi-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
    .kpi-growth { font-size: 12px; font-weight: 600; margin-left: 8px; }
    .section {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .1em;
      color: #64748b;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table th {
      background: #0f172a;
      color: #e2e8f0;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    .print-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 12px 22px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(37,99,235,.4);
    }
  </style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">⬇ Guardar como PDF</button>

<!-- Header -->
<div class="header">
  <div>
    <div class="logo-text">PROSPERA<span>.AI</span></div>
    <div class="report-title">Informe Ejecutivo — ${companyName}</div>
  </div>
  <div style="text-align:right;">
    <div class="period-badge">${periodLabel}</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Generado el ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </div>
</div>

<!-- KPIs -->
<div class="section">
  <div class="section-title">Indicadores clave del período</div>
  <div class="kpi-grid">
    <div class="kpi-card highlight">
      <div class="kpi-label">Leads totales</div>
      <div class="kpi-value">${kpis.totalLeads.value}</div>
      ${kpis.totalLeads.growth !== undefined ? `<div class="kpi-sub">Crecimiento: <span class="kpi-growth" style="color:${kpis.totalLeads.growth >= 0 ? '#10b981' : '#ef4444'}">${kpis.totalLeads.growth >= 0 ? '+' : ''}${kpis.totalLeads.growth}%</span></div>` : ''}
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Contactos</div>
      <div class="kpi-value">${kpis.totalContacts.value}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Oportunidades abiertas</div>
      <div class="kpi-value">${kpis.openOpportunities.value}</div>
      <div class="kpi-sub">Valor: ${fmt(kpis.openOpportunities.totalValue, currency)}</div>
    </div>
    <div class="kpi-card highlight">
      <div class="kpi-label">Oportunidades ganadas</div>
      <div class="kpi-value" style="color:#10b981;">${kpis.wonOpportunities.value}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tareas pendientes</div>
      <div class="kpi-value">${kpis.pendingTasks.value}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Tareas vencidas</div>
      <div class="kpi-value" style="color:${kpis.overdueTasks.value > 0 ? '#ef4444' : '#10b981'};">${kpis.overdueTasks.value}</div>
    </div>
  </div>
</div>

<!-- Two columns: leads por fuente + oportunidades por etapa -->
<div class="two-col section">
  <div>
    <div class="section-title">Leads por fuente</div>
    ${leadsBySource.length > 0 ? `
    <table class="data-table">
      <thead><tr><th>Fuente</th><th style="text-align:right;">Leads</th></tr></thead>
      <tbody>${sourceRows}</tbody>
    </table>` : '<p style="color:#94a3b8;font-size:12px;">Sin datos en el período.</p>'}
  </div>
  <div>
    <div class="section-title">Oportunidades por etapa</div>
    ${opportunitiesByStage.length > 0 ? `
    <table class="data-table">
      <thead><tr><th>Etapa</th><th style="text-align:center;">N°</th><th style="text-align:right;">Valor</th></tr></thead>
      <tbody>${stageRows}</tbody>
    </table>` : '<p style="color:#94a3b8;font-size:12px;">Sin datos en el período.</p>'}
  </div>
</div>

<!-- Actividades recientes -->
${recentActivities.length > 0 ? `
<div class="section">
  <div class="section-title">Actividades recientes (últimas 10)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width:15%;">Tipo</th>
        <th style="width:40%;">Asunto</th>
        <th style="width:25%;">Responsable</th>
        <th style="width:20%;">Fecha</th>
      </tr>
    </thead>
    <tbody>${activityRows}</tbody>
  </table>
</div>` : ''}

<!-- Footer -->
<div class="footer">
  <span>PROSPERA.AI · Informe Ejecutivo</span>
  <span>Período: ${periodLabel}</span>
</div>

</body>
</html>`;

  openPrintWindow(html, `Informe-PROSPERA-${periodLabel.replace(/\s/g, '-')}`);
}
