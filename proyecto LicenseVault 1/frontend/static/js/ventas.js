// ventas.js — FIX #5 skeleton, #6 caché, #7 errores, #9 display bug, #13 exportar CSV
let _ventas = [];
let _clientesMap = {};
let _ventPage = 1;
const _ventPerPage = 15;

async function renderVentas() {
  const page = document.getElementById('page-ventas');
  page.innerHTML = `
    <div class="page-header">
      <div><h1>Ventas</h1><p>Registro de distribución de licencias</p></div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-export" onclick="exportarVentas()">↓ Exportar CSV</button>
        <button class="btn btn-primary" onclick="modalCrearVenta()">+ Nueva venta</button>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-toolbar">
        <input class="search-input" id="ventSearch" placeholder="Buscar producto o cliente..." oninput="filtrarVentas()">
        <select class="search-input" id="ventEstado" style="max-width:150px" onchange="filtrarVentas()">
          <option value="">Todos los estados</option>
          <option value="completada">Completada</option>
          <option value="reembolsada">Reembolsada</option>
        </select>
      </div>
      <!-- FIX #5: skeleton -->
      <div id="ventTableBody">${skeletonTable(7, 10)}</div>
    </div>`;

  // FIX #6: usar caché para clientes, no hacer doble request innecesario
  const [ventasData, clientesData] = await Promise.all([api.getVentas(), api.getClientes()]);
  _ventas = ventasData;
  _clientesMap = {};
  clientesData.forEach(c => { _clientesMap[idStr(c._id)] = c.nombre; });
  _ventPage = 1;
  renderVentTable();
}

function filtrarVentas() {
  const q = document.getElementById('ventSearch').value.toLowerCase();
  const est = document.getElementById('ventEstado').value;
  renderVentTable(_ventas.filter(v => {
    const nombreCliente = (_clientesMap[idStr(v.cliente_id)] || '').toLowerCase();
    return (!q || v.producto_nombre.toLowerCase().includes(q) || nombreCliente.includes(q)) &&
           (!est || v.estado === est);
  }));
}

function renderVentTable(list) {
  list = list || _ventas;
  const total = list.length;
  const pages = Math.ceil(total / _ventPerPage);
  const start = (_ventPage - 1) * _ventPerPage;
  const slice = list.slice(start, start + _ventPerPage);
  const tbody = document.getElementById('ventTableBody');
  if (!slice.length) {
    tbody.innerHTML = `<div class="empty-state"><div class="empty-icon">◇</div><p>Sin ventas</p></div>`;
    return;
  }
  tbody.innerHTML = `
    <table>
      <thead><tr>
        <th>Producto</th><th>Cliente</th><th>Cant.</th>
        <th>Total</th><th>Método</th><th>Estado</th><th>Fecha</th><th></th>
      </tr></thead>
      <tbody>
        ${slice.map(v => {
          const id = idStr(v._id);
          const estBadge = v.estado === 'completada' ? 'badge-ok' : 'badge-bad';
          return `<tr>
            <td><strong style="font-weight:500">${v.producto_nombre}</strong></td>
            <td style="font-size:.82rem;color:var(--text2)">${_clientesMap[idStr(v.cliente_id)] || String(idStr(v.cliente_id)).slice(-6)}</td>
            <td style="font-family:var(--mono)">${v.cantidad}</td>
            <td style="font-family:var(--mono);color:var(--green)">${formatMoney(v.total)}</td>
            <td><span class="badge badge-gray">${v.metodo_pago||'—'}</span></td>
            <td><span class="badge ${estBadge}">${v.estado}</span></td>
            <td style="font-size:.78rem;color:var(--text2)">${formatDate(v.fecha)}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="modalVerVenta('${id}')">Ver</button>
              <button class="btn btn-danger btn-sm" onclick="confirmarBorrarVenta('${id}')">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ${pages > 1 ? `
    <div class="pagination">
      <button class="page-btn" onclick="cambiarPagVent(${_ventPage-1})" ${_ventPage===1?'disabled':''}>‹</button>
      <span class="page-info">${_ventPage} / ${pages}</span>
      <button class="page-btn" onclick="cambiarPagVent(${_ventPage+1})" ${_ventPage===pages?'disabled':''}>›</button>
    </div>` : ''}`;
}

function cambiarPagVent(n) { _ventPage = n; renderVentTable(); }

// FIX #13: exportar ventas a CSV
function exportarVentas() {
  const data = _ventas.map(v => ({
    ...v,
    cliente_nombre: _clientesMap[idStr(v.cliente_id)] || idStr(v.cliente_id),
    fecha_str: formatDate(v.fecha),
  }));
  exportCSV(data, 'ventas.csv', [
    { key: 'producto_nombre', label: 'Producto' },
    { key: 'cliente_nombre',  label: 'Cliente' },
    { key: 'cantidad',        label: 'Cantidad' },
    { key: 'total',           label: 'Total', format: v => formatMoney(v) },
    { key: 'metodo_pago',     label: 'Método pago' },
    { key: 'estado',          label: 'Estado' },
    { key: 'fecha_str',       label: 'Fecha' },
  ]);
}

let _ventaProds = [];
let _ventaClis  = [];

async function modalCrearVenta() {
  // FIX #6: aprovechar la caché — no hace nuevo request si ya tenemos los datos
  [_ventaProds, _ventaClis] = await Promise.all([api.getProductos(), api.getClientes()]);

  openModal('Registrar Venta', `
    <div class="form-group"><label>Producto</label>
      <select class="form-control" id="vProd">
        <option value="">— Selecciona producto —</option>
        ${_ventaProds.filter(p => p.activo && p.stock > 0).map(p =>
          `<option value="${idStr(p._id)}">${p.nombre} (Stock: ${p.stock}) — ${formatMoney(p.precio)}</option>`
        ).join('')}
      </select></div>

    <div class="form-group">
      <label>Cliente</label>
      <input class="form-control" id="vCliSearch" placeholder="Buscar por nombre o email..."
        oninput="filtrarClientesVenta()" autocomplete="off"
        style="margin-bottom:.5rem">
      <select class="form-control" id="vCli" size="4"
        style="height:auto;padding:.3rem 0;display:none"
        onchange="seleccionarClienteVenta()"></select>
      <!-- FIX #9: usar clase CSS en vez de style inline para controlar visibilidad -->
      <div id="vCliSeleccionado" class="cli-sel-box" style="display:none">
        <span id="vCliSelNombre"></span>
        <button onclick="limpiarClienteVenta()"
          style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.9rem">✕</button>
      </div>
    </div>

    <div id="vNuevoClienteForm" style="display:none;border:1px solid var(--border2);
      border-radius:10px;padding:1rem;margin-bottom:.5rem;background:rgba(79,124,255,.04)">
      <p style="font-size:.75rem;font-family:var(--mono);color:var(--accent);margin-bottom:.8rem;letter-spacing:.3px">
        NUEVO CLIENTE — completá los datos para registrarlo</p>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:.7rem"><label>Nombre completo</label>
          <input class="form-control" id="vNombre" placeholder="Juan Pérez"></div>
        <div class="form-group" style="margin-bottom:.7rem"><label>Email</label>
          <input class="form-control" id="vEmail" type="email" placeholder="juan@email.com"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:.7rem"><label>Teléfono</label>
          <input class="form-control" id="vTel" placeholder="+57 300 123 4567"></div>
        <div class="form-group" style="margin-bottom:.7rem"><label>País</label>
          <select class="form-control" id="vPais">
            ${["Colombia","México","Argentina","Chile","Perú","Ecuador","Venezuela",
               "Uruguay","Bolivia","Paraguay","Costa Rica","Panamá","Otro"].map(p =>
              `<option>${p}</option>`).join('')}
          </select></div>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group"><label>Cantidad</label>
        <input class="form-control" id="vCant" type="number" min="1" value="1"></div>
      <div class="form-group"><label>Método de pago</label>
        <select class="form-control" id="vMetodo">
          <option>tarjeta</option>
          <option>paypal</option>
          <option>transferencia</option>
          <option>cripto</option>
        </select></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarVenta()">Procesar venta</button>
    </div>`);
}

function filtrarClientesVenta() {
  const q = document.getElementById('vCliSearch').value.trim().toLowerCase();
  const select = document.getElementById('vCli');
  const nuevoForm = document.getElementById('vNuevoClienteForm');

  if (!q) {
    select.style.display = 'none';
    nuevoForm.style.display = 'none';
    select.dataset.selectedId = '';
    return;
  }

  const matches = _ventaClis.filter(c =>
    c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  );

  select.innerHTML = matches.map(c =>
    `<option value="${idStr(c._id)}">${c.nombre} — ${c.email}</option>`
  ).join('');

  if (matches.length > 0) {
    select.style.display = 'block';
    nuevoForm.style.display = 'none';
  } else {
    select.style.display = 'none';
    nuevoForm.style.display = 'block';
    if (q.includes('@')) {
      document.getElementById('vEmail').value = q;
    } else {
      const parts = q.split(' ');
      document.getElementById('vNombre').value = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
  }
  select.dataset.selectedId = '';
}

function seleccionarClienteVenta() {
  const select = document.getElementById('vCli');
  const id = select.value;
  const cliente = _ventaClis.find(c => idStr(c._id) === id);
  if (!cliente) return;

  select.dataset.selectedId = id;
  select.style.display = 'none';
  document.getElementById('vCliSearch').style.display = 'none';
  document.getElementById('vNuevoClienteForm').style.display = 'none';

  // FIX #9: controlar visibilidad con style.display explícito (sin duplicados)
  const box = document.getElementById('vCliSeleccionado');
  document.getElementById('vCliSelNombre').textContent = `${cliente.nombre} — ${cliente.email}`;
  box.style.cssText = `
    display: flex;
    background: var(--bg3);
    border: 1px solid var(--accent);
    border-radius: 8px;
    padding: .5rem .85rem;
    font-size: .83rem;
    justify-content: space-between;
    align-items: center;
  `;
}

function limpiarClienteVenta() {
  const select = document.getElementById('vCli');
  select.dataset.selectedId = '';
  select.style.display = 'none';
  document.getElementById('vNuevoClienteForm').style.display = 'none';
  // FIX #9: ocultar con style directo, sin conflictos
  document.getElementById('vCliSeleccionado').style.display = 'none';
  const searchEl = document.getElementById('vCliSearch');
  searchEl.style.display = 'block';
  searchEl.value = '';
  searchEl.focus();
}

async function guardarVenta() {
  const producto_id = document.getElementById('vProd').value;
  const cantidad    = document.getElementById('vCant').value;
  const metodo_pago = document.getElementById('vMetodo').value;
  if (!producto_id) return showToast('Selecciona un producto', 'error');

  const selectEl  = document.getElementById('vCli');
  const nuevoForm = document.getElementById('vNuevoClienteForm');
  let cliente_id  = selectEl.dataset.selectedId || '';

  if (!cliente_id && nuevoForm.style.display === 'block') {
    const nombre = document.getElementById('vNombre').value.trim();
    const email  = document.getElementById('vEmail').value.trim();
    if (!nombre || !email) return showToast('Nombre y email son obligatorios para el nuevo cliente', 'error');
    try {
      const nuevo = await api.crearCliente({
        nombre, email,
        telefono: document.getElementById('vTel').value.trim(),
        pais:     document.getElementById('vPais').value,
      });
      cliente_id = idStr(nuevo._id);
      _clientesMap[cliente_id] = nombre;
      _ventaClis.push(nuevo);
    } catch(e) { return; }
  }

  if (!cliente_id) return showToast('Selecciona o ingresa un cliente', 'error');

  try {
    const venta = await api.crearVenta({ producto_id, cliente_id, cantidad, metodo_pago });
    _modalDirty = false;
    closeModal(true);
    showToast(`Venta procesada — ${venta.claves_entregadas?.length} clave(s) entregadas`, 'success');
    // Invalidar caché de productos (stock cambió)
    api.invalidarProductos();
    _ventas = await api.getVentas();
    _ventPage = 1;
    renderVentTable();
  } catch(e) {}
}

async function modalVerVenta(id) {
  const v = await api.getVentas();
  const venta = v.find(x => idStr(x._id) === id);
  if (!venta) return showToast('Venta no encontrada', 'error');
  openModal('Detalle de Venta', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1rem">
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">PRODUCTO</span>
        <p style="font-weight:500">${venta.producto_nombre}</p></div>
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">TOTAL</span>
        <p style="font-family:var(--mono);color:var(--green)">${formatMoney(venta.total)}</p></div>
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">CANTIDAD</span>
        <p style="font-family:var(--mono)">${venta.cantidad} und</p></div>
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">ESTADO</span>
        <p><span class="badge ${venta.estado==='completada'?'badge-ok':'badge-bad'}">${venta.estado}</span></p></div>
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">MÉTODO PAGO</span>
        <p><span class="badge badge-gray">${venta.metodo_pago||'—'}</span></p></div>
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">FECHA</span>
        <p style="font-size:.82rem">${formatDate(venta.fecha)}</p></div>
    </div>
    <div>
      <span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">CLAVES ENTREGADAS</span>
      <div class="keys-list">
        ${(venta.claves_entregadas||[]).map(c => `<span class="key-pill">${c}</span>`).join('') || '<span style="color:var(--text3);font-size:.8rem">Sin claves</span>'}
      </div>
    </div>`);
}

async function confirmarBorrarVenta(id) {
  const venta = _ventas.find(v => idStr(v._id) === id);
  const esCompletada = venta?.estado === 'completada';
  openModal('Confirmar eliminación', `
    <p style="color:var(--text2);margin-bottom:${esCompletada ? '1rem' : '1.5rem'}">¿Eliminar este registro de venta?</p>
    ${esCompletada ? `<div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:8px;padding:.7rem .9rem;margin-bottom:1.2rem;font-size:.82rem;color:var(--amber)">
      ⚠ Esta venta está <strong>completada</strong>. Al eliminarla se revertirá el stock y se limpiarán las claves entregadas del historial del cliente.
    </div>` : ''}
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal(true)">Cancelar</button>
      <button class="btn btn-danger" onclick="borrarVenta('${id}')">Eliminar</button>
    </div>`);
}

async function borrarVenta(id) {
  try {
    await api.borrarVenta(id);
    _modalDirty = false;
    closeModal(true);
    showToast('Venta eliminada y stock revertido', 'info');
    // Invalidar caché de productos (stock cambió)
    api.invalidarProductos();
    _ventas = await api.getVentas();
    _ventPage = 1;
    renderVentTable();
  } catch(e) {}
}