// api.js — Capa de comunicación con el backend Flask
const API = 'http://localhost:5000/api';

async function apiFetch(path, opts = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error del servidor');
    return data;
  } catch (e) {
    showToast(e.message, 'error');
    throw e;
  }
}

const api = {
  // Productos
  getProductos:  (cat) => apiFetch('/productos' + (cat ? `?categoria=${cat}` : '')),
  getProducto:   (id)  => apiFetch(`/productos/${id}`),
  crearProducto: (d)   => apiFetch('/productos', { method: 'POST', body: JSON.stringify(d) }),
  editarProducto:(id,d)=> apiFetch(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  borrarProducto:(id)  => apiFetch(`/productos/${id}`, { method: 'DELETE' }),
  agregarLicencia:(id,clave)=> apiFetch(`/productos/${id}/licencias`, { method: 'POST', body: JSON.stringify({clave}) }),
  // Clientes
  getClientes:   ()    => apiFetch('/clientes'),
  getCliente:    (id)  => apiFetch(`/clientes/${id}`),
  crearCliente:  (d)   => apiFetch('/clientes', { method: 'POST', body: JSON.stringify(d) }),
  editarCliente: (id,d)=> apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  borrarCliente: (id)  => apiFetch(`/clientes/${id}`, { method: 'DELETE' }),
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

// ── Utilidades UI ──────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.className = 'toast', 3200);
}

function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

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
    // legacy
    'Seguridad':                  'badge-seg',
    'Productividad':              'badge-prod',
    'SaaS':                       'badge-saas',
  };
  return `<span class="badge ${map[cat] || 'badge-gray'}">${cat}</span>`;
}
function idStr(obj) {
  return obj?.$oid || obj?.toString() || obj;
}