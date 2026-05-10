// api.js — Capa de comunicación + utilidades UI
const API = 'http://localhost:5000/api';

async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    const data = await res.json();
    // FIX #7: propagar el mensaje de error específico del backend
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  } catch (e) {
    showToast(e.message, 'error');
    throw e;
  }
}

// FIX #6: caché liviana para productos y clientes (evita doble request en modal de ventas)
const _cache = { productos: null, clientes: null };

const api = {
  // Productos
  getProductos:  async (cat) => {
    if (!cat) {
      if (_cache.productos) return _cache.productos;
      const data = await apiFetch('/productos');
      _cache.productos = data;
      return data;
    }
    return apiFetch('/productos' + (cat ? `?categoria=${cat}` : ''));
  },
  invalidarProductos: () => { _cache.productos = null; },

  getProducto:   (id)  => apiFetch(`/productos/${id}`),
  crearProducto: async (d) => {
    const r = await apiFetch('/productos', { method: 'POST', body: JSON.stringify(d) });
    _cache.productos = null;
    return r;
  },
  editarProducto: async (id, d) => {
    const r = await apiFetch(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(d) });
    _cache.productos = null;
    return r;
  },
  borrarProducto: async (id) => {
    const r = await apiFetch(`/productos/${id}`, { method: 'DELETE' });
    _cache.productos = null;
    return r;
  },
  agregarLicencia: async (id, clave) => {
    const r = await apiFetch(`/productos/${id}/licencias`, { method: 'POST', body: JSON.stringify({clave}) });
    _cache.productos = null;
    return r;
  },

  // Clientes
  getClientes:  async () => {
    if (_cache.clientes) return _cache.clientes;
    const data = await apiFetch('/clientes');
    _cache.clientes = data;
    return data;
  },
  invalidarClientes: () => { _cache.clientes = null; },

  getCliente:    (id)  => apiFetch(`/clientes/${id}`),
  crearCliente:  async (d) => {
    const r = await apiFetch('/clientes', { method: 'POST', body: JSON.stringify(d) });
    _cache.clientes = null;
    return r;
  },
  editarCliente: async (id, d) => {
    const r = await apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(d) });
    _cache.clientes = null;
    return r;
  },
  borrarCliente: async (id) => {
    const r = await apiFetch(`/clientes/${id}`, { method: 'DELETE' });
    _cache.clientes = null;
    return r;
  },

  // Ventas
  getVentas:     ()    => apiFetch('/ventas'),
  crearVenta:    (d)   => apiFetch('/ventas', { method: 'POST', body: JSON.stringify(d) }),
  borrarVenta:   (id)  => apiFetch(`/ventas/${id}`, { method: 'DELETE' }),

  // Reportes
  getDashboard:    ()  => apiFetch('/reportes/dashboard'),
  getVentasCat:    ()  => apiFetch('/reportes/ventas-por-categoria'),
  getTopProductos: ()  => apiFetch('/reportes/top-productos'),
  getIngresosMes:  ()  => apiFetch('/reportes/ingresos-por-mes'),
  getTopClientes:  ()  => apiFetch('/reportes/top-clientes'),
};

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.className = 'toast', 3200);
}

// ── Modal ──────────────────────────────────────────────────────────────────
let _modalDirty = false;

function openModal(title, bodyHTML) {
  _modalDirty = false;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');

  // FIX #8: detectar cambios en el formulario del modal
  const body = document.getElementById('modalBody');
  body.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', () => { _modalDirty = true; }, { once: true });
    el.addEventListener('change', () => { _modalDirty = true; }, { once: true });
  });
}

function closeModal(force = false) {
  // FIX #8: avisar si hay cambios sin guardar
  if (!force && _modalDirty) {
    const notice = document.getElementById('modalDirtyNotice');
    if (notice) {
      notice.classList.add('visible');
      setTimeout(() => notice.classList.remove('visible'), 3000);
      return;
    }
  }
  _modalDirty = false;
  document.getElementById('modalOverlay').classList.remove('open');
}

// ── Skeleton loaders ────────────────────────────────────────────────────────
// FIX #5: helpers para renderizar skeletons mientras carga
function skeletonTable(cols = 5, rows = 8) {
  const widths = ['40%','20%','15%','12%','13%'];
  return `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
      <div style="display:flex;gap:.8rem;padding:.75rem 1rem;background:var(--bg3);border-bottom:1px solid var(--border)">
        ${Array(cols).fill(0).map((_, i) => `<div class="skeleton skeleton-text" style="width:${widths[i]||'10%'}"></div>`).join('')}
      </div>
      ${Array(rows).fill(0).map(() => `
        <div class="skeleton-table-row">
          ${Array(cols).fill(0).map((_, i) => `<div class="skeleton skeleton-text" style="width:${widths[i]||'10%'}"></div>`).join('')}
        </div>`).join('')}
    </div>`;
}

function skeletonStats(n = 5) {
  return `
    <div class="skeleton-stats">
      ${Array(n).fill(0).map(() => `<div class="skeleton skeleton-card"></div>`).join('')}
    </div>`;
}

// ── Formateadores ──────────────────────────────────────────────────────────
function formatMoney(n) {
  return '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s.$date || s);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function badgeCat(cat) {
  const map = {
    'Sistema Operativo':          'badge-so',
    'Ofimática (Suscripción)':    'badge-prod',
    'Ofimática (Permanente)':     'badge-prod',
    'Diseño y Creatividad':       'badge-saas',
    'Seguridad / Antivirus':      'badge-seg',
    'Diseño Técnico (CAD)':       'badge-saas',
    'Gestión de Documentos':      'badge-gray',
    'Gestión de Clientes':        'badge-so',
    'Contabilidad y Facturación': 'badge-warn',
    'Gestión de Proyectos':       'badge-prod',
    'Seguridad':                  'badge-seg',
    'Productividad':              'badge-prod',
    'SaaS':                       'badge-saas',
  };
  return `<span class="badge ${map[cat] || 'badge-gray'}">${cat}</span>`;
}
function idStr(obj) {
  return obj?.$oid || obj?.toString() || obj;
}

// ── FIX #13: Exportar a CSV ─────────────────────────────────────────────────
function exportCSV(data, filename, columns) {
  // columns: array de { key, label, format? }
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = c.key.split('.').reduce((o, k) => o?.[k], row) ?? '';
      if (c.format) val = c.format(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast(`${filename} exportado`, 'success');
}

// ── FIX #12: Theme toggle ────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('lv-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('lv-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('lv-theme', 'dark');
  }
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const isDark = theme === 'dark';
    btn.querySelector('.toggle-icon').textContent = isDark ? '☀' : '☾';
    btn.querySelector('.toggle-label').textContent = isDark ? 'Claro' : 'Oscuro';
  }
}

function toggleTheme() {
  const current = localStorage.getItem('lv-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}