// dashboard.js
async function renderDashboard() {
  const page = document.getElementById('page-dashboard');
  page.innerHTML = `<div class="loading">cargando dashboard...</div>`;
  try {
    const d = await api.getDashboard();
    const stockAlerts = (d.stock_bajo || []).slice(0, 6).map(p => `
      <div class="alert-item">
        <span>${p.nombre}</span>
        <span class="alert-stock">${p.stock} uds</span>
      </div>`).join('') || '<p style="color:var(--text3);font-size:.82rem">Sin alertas de stock 🎉</p>';

    page.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visión general del sistema de licencias</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card" style="--accent-bar:var(--green)">
          <div class="stat-label">ingresos totales</div>
          <div class="stat-value">${formatMoney(d.ingresos_totales)}</div>
          <div class="stat-sub">ventas completadas</div>
        </div>
        <div class="stat-card" style="--accent-bar:var(--accent)">
          <div class="stat-label">transacciones</div>
          <div class="stat-value">${d.total_ventas.toLocaleString()}</div>
          <div class="stat-sub">órdenes procesadas</div>
        </div>
        <div class="stat-card" style="--accent-bar:var(--accent2)">
          <div class="stat-label">licencias vendidas</div>
          <div class="stat-value">${d.unidades_vendidas.toLocaleString()}</div>
          <div class="stat-sub">unidades distribuidas</div>
        </div>
        <div class="stat-card" style="--accent-bar:var(--amber)">
          <div class="stat-label">productos</div>
          <div class="stat-value">${d.total_productos}</div>
          <div class="stat-sub">en catálogo</div>
        </div>
        <div class="stat-card" style="--accent-bar:var(--red)">
          <div class="stat-label">clientes</div>
          <div class="stat-value">${d.total_clientes.toLocaleString()}</div>
          <div class="stat-sub">registrados</div>
        </div>
      </div>

      <div class="report-grid">
        <div class="report-card">
          <h3>⚠ Stock crítico (< 10 unidades)</h3>
          <div class="alert-list">${stockAlerts}</div>
        </div>
        <div class="report-card" id="dash-cat-chart">
          <h3>Ingresos por categoría</h3>
          <div class="loading">cargando...</div>
        </div>
      </div>`;

    // Cargar mini gráfico de categorías
    const cats = await api.getVentasCat();
    const max = Math.max(...cats.map(c => c.total_ingresos), 1);
    const colors = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--accent2)'];
    document.getElementById('dash-cat-chart').innerHTML = `
      <h3>Ingresos por categoría</h3>
      ${cats.map((c, i) => `
        <div class="chart-bar-row">
          <span class="chart-bar-label">${c.categoria}</span>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width:${Math.round(c.total_ingresos/max*100)}%;background:${colors[i%4]}"></div>
          </div>
          <span class="chart-bar-val">${formatMoney(c.total_ingresos)}</span>
        </div>`).join('')}`;
  } catch(e) { page.innerHTML = `<p style="color:var(--red)">Error cargando dashboard</p>`; }
}
