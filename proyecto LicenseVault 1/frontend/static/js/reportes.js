// reportes.js — Visualización de las 4 consultas aggregate
async function renderReportes() {
  const page = document.getElementById('page-reportes');
  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Reportes & Análisis</h1>
        <p>Consultas avanzadas con pipeline de agregación MongoDB</p>
      </div>
    </div>

    <div class="report-grid" style="margin-bottom:1.2rem">
      <div class="report-card" id="rep-categorias">
        <h3>▦ Ventas por Categoría <span style="font-size:.72rem;color:var(--text3);font-family:var(--mono)">$match $group $sort $lookup $project</span></h3>
        <div class="loading">ejecutando aggregate...</div>
      </div>
      <div class="report-card" id="rep-top-prod">
        <h3>▲ Top 5 Productos <span style="font-size:.72rem;color:var(--text3);font-family:var(--mono)">$group $sort $limit $project</span></h3>
        <div class="loading">ejecutando aggregate...</div>
      </div>
    </div>
    <div class="report-grid">
      <div class="report-card" id="rep-meses">
        <h3>◇ Ingresos por Mes <span style="font-size:.72rem;color:var(--text3);font-family:var(--mono)">$match $group $sort</span></h3>
        <div class="loading">ejecutando aggregate...</div>
      </div>
      <div class="report-card" id="rep-clientes">
        <h3>◈ Top 10 Clientes <span style="font-size:.72rem;color:var(--text3);font-family:var(--mono)">$group $sort $lookup $project</span></h3>
        <div class="loading">ejecutando aggregate...</div>
      </div>
    </div>`;

  const [cats, topProd, meses, topCli] = await Promise.all([
    api.getVentasCat(),
    api.getTopProductos(),
    api.getIngresosMes(),
    api.getTopClientes(),
  ]);

  // ── 1. Ventas por categoría ────────────────────────────────────────────────
  const maxCat = Math.max(...cats.map(c => c.total_ingresos), 1);
  const catColors = ['var(--accent)', 'var(--red)', 'var(--amber)', 'var(--green)'];
  document.getElementById('rep-categorias').innerHTML = `
    <h3>▦ Ventas por Categoría <span style="font-size:.72rem;color:var(--text3);font-family:var(--mono)">$match $group $sort $lookup $project</span></h3>
    <table style="width:100%;font-size:.8rem;margin-bottom:.8rem">
      <thead><tr>
        <th style="color:var(--text3);font-size:.7rem;font-family:var(--mono);text-align:left;padding:.4rem">Categoría</th>
        <th style="color:var(--text3);font-size:.7rem;font-family:var(--mono);text-align:right;padding:.4rem">Ingresos</th>
        <th style="color:var(--text3);font-size:.7rem;font-family:var(--mono);text-align:right;padding:.4rem">Transacc.</th>
      </tr></thead>
      <tbody>
      ${cats.map(c => `<tr style="border-top:1px solid var(--border)">
        <td style="padding:.4rem">${badgeCat(c.categoria)}</td>
        <td style="padding:.4rem;text-align:right;font-family:var(--mono);color:var(--green)">${formatMoney(c.total_ingresos)}</td>
        <td style="padding:.4rem;text-align:right;font-family:var(--mono);color:var(--text2)">${c.num_transacciones}</td>
      </tr>`).join('')}
      </tbody>
    </table>
    ${cats.map((c, i) => `
      <div class="chart-bar-row">
        <span class="chart-bar-label">${c.categoria}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width:${Math.round(c.total_ingresos/maxCat*100)}%;background:${catColors[i%4]}"></div>
        </div>
        <span class="chart-bar-val">${Math.round(c.total_ingresos/maxCat*100)}%</span>
      </div>`).join('')}`;

  // ── 2. Top 5 productos ─────────────────────────────────────────────────────
  const maxProd = Math.max(...topProd.map(p => p.unidades_vendidas), 1);
  document.getElementById('rep-top-prod').innerHTML = `
    <h3>▲ Top 5 Productos <span style="font-size:.72rem;color:var(--text3);font-family:var(--mono)">$group $sort $limit $project</span></h3>
    ${topProd.map((p, i) => `
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.9rem">
        <span style="font-family:var(--mono);font-size:.8rem;color:var(--text3);min-width:18px">#${i+1}</span>
        <div style="flex:1;min-width:0">
          <p style="font-size:.82rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.25rem">${p.producto}</p>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${Math.round(p.unidades_vendidas/maxProd*100)}%;background:var(--accent2)"></div>
          </div>
        </div>
        <div style="text-align:right;min-width:70px">
          <p style="font-family:var(--mono);font-size:.78rem;color:var(--green)">${formatMoney(p.ingresos_totales)}</p>
          <p style="font-size:.72rem;color:var(--text3)">${p.unidades_vendidas} uds</p>
        </div>
      </div>`).join('')}`;

  // ── 3. Ingresos por mes ────────────────────────────────────────────────────
  const ultMeses = meses.slice(-12);
  const maxMes = Math.max(...ultMeses.map(m => m.ingresos), 1);
  const barH = 80;
  const barW = Math.max(24, Math.floor(400 / Math.max(ultMeses.length, 1)));
  const svgW = ultMeses.length * (barW + 4) + 40;
  document.getElementById('rep-meses').innerHTML = `
    <h3>◇ Ingresos por Mes <span style="font-size:.72rem;color:var(--text3);font-family:var(--mono)">$match $group $sort</span></h3>
    <div style="overflow-x:auto">
      <svg viewBox="0 0 ${svgW} ${barH+40}" xmlns="http://www.w3.org/2000/svg" style="width:100%;min-width:${Math.min(svgW,300)}px">
        ${ultMeses.map((m, i) => {
          const h = Math.max(4, Math.round(m.ingresos / maxMes * barH));
          const x = 20 + i * (barW + 4);
          const y = barH - h;
          return `
            <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="rgba(79,124,255,.6)"/>
            <text x="${x + barW/2}" y="${barH + 14}" text-anchor="middle"
              style="font-size:9px;fill:#525a7a;font-family:monospace">${m.periodo}</text>
            <text x="${x + barW/2}" y="${y - 4}" text-anchor="middle"
              style="font-size:8px;fill:#8891b4;font-family:monospace">${m.ingresos >= 1000000 ? (m.ingresos/1000000).toFixed(1)+"M" : Math.round(m.ingresos/1000)+"k"}</text>`;
        }).join('')}
      </svg>
    </div>
    <table style="width:100%;font-size:.78rem;margin-top:.5rem">
      <thead><tr>
        <th style="color:var(--text3);font-size:.68rem;font-family:var(--mono);padding:.3rem;text-align:left">Período</th>
        <th style="color:var(--text3);font-size:.68rem;font-family:var(--mono);padding:.3rem;text-align:right">Ingresos</th>
        <th style="color:var(--text3);font-size:.68rem;font-family:var(--mono);padding:.3rem;text-align:right">Transacc.</th>
      </tr></thead><tbody>
      ${ultMeses.slice(-6).map(m => `<tr style="border-top:1px solid var(--border)">
        <td style="padding:.3rem;font-family:var(--mono);color:var(--text2)">${m.periodo}</td>
        <td style="padding:.3rem;text-align:right;font-family:var(--mono);color:var(--green)">${formatMoney(m.ingresos)}</td>
        <td style="padding:.3rem;text-align:right;color:var(--text2)">${m.transacciones}</td>
      </tr>`).join('')}
      </tbody>
    </table>`;

  // ── 4. Top clientes ────────────────────────────────────────────────────────
  document.getElementById('rep-clientes').innerHTML = `
    <h3>◈ Top 10 Clientes <span style="font-size:.72rem;color:var(--text3);font-family:var(--mono)">$group $sort $lookup $project</span></h3>
    <table style="width:100%;font-size:.78rem">
      <thead><tr>
        <th style="color:var(--text3);font-size:.7rem;font-family:var(--mono);padding:.4rem;text-align:left">#</th>
        <th style="color:var(--text3);font-size:.7rem;font-family:var(--mono);padding:.4rem;text-align:left">Cliente</th>
        <th style="color:var(--text3);font-size:.7rem;font-family:var(--mono);padding:.4rem;text-align:left">País</th>
        <th style="color:var(--text3);font-size:.7rem;font-family:var(--mono);padding:.4rem;text-align:right">Gastado</th>
        <th style="color:var(--text3);font-size:.7rem;font-family:var(--mono);padding:.4rem;text-align:right">Compras</th>
      </tr></thead>
      <tbody>
      ${topCli.map((c, i) => `<tr style="border-top:1px solid var(--border)">
        <td style="padding:.4rem;font-family:var(--mono);color:var(--text3)">${i+1}</td>
        <td style="padding:.4rem">
          <p style="font-weight:500;font-size:.82rem">${c.cliente}</p>
          <p style="font-size:.73rem;color:var(--text3)">${c.email}</p>
        </td>
        <td style="padding:.4rem;color:var(--text2);font-size:.78rem">${c.pais||'—'}</td>
        <td style="padding:.4rem;text-align:right;font-family:var(--mono);color:var(--green)">${formatMoney(c.total_gastado)}</td>
        <td style="padding:.4rem;text-align:right;font-family:var(--mono)">${c.num_compras}</td>
      </tr>`).join('')}
      </tbody>
    </table>`;
}