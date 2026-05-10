// clientes.js
let _clientes = [];
let _cliPage = 1;
const _cliPerPage = 15;

async function renderClientes() {
  const page = document.getElementById('page-clientes');
  page.innerHTML = `
    <div class="page-header">
      <div><h1>Clientes</h1><p>Base de datos de clientes registrados</p></div>
      <button class="btn btn-primary" onclick="modalCrearCliente()">+ Nuevo cliente</button>
    </div>
    <div class="table-wrap">
      <div class="table-toolbar">
        <input class="search-input" id="cliSearch" placeholder="Buscar por nombre o email..." oninput="filtrarClientes()">
      </div>
      <div id="cliTableBody"><div class="loading">cargando...</div></div>
    </div>`;
  _clientes = await api.getClientes();
  _cliPage = 1;
  renderCliTable();
}

function filtrarClientes() {
  const q = document.getElementById('cliSearch').value.toLowerCase();
  renderCliTable(_clientes.filter(c =>
    c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.pais||'').toLowerCase().includes(q)
  ));
}

function renderCliTable(list) {
  list = list || _clientes;
  const total = list.length;
  const pages = Math.ceil(total / _cliPerPage);
  const start = (_cliPage - 1) * _cliPerPage;
  const slice = list.slice(start, start + _cliPerPage);
  const tbody = document.getElementById('cliTableBody');
  if (!slice.length) {
    tbody.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Sin clientes</p></div>`;
    return;
  }
  tbody.innerHTML = `
    <table>
      <thead><tr>
        <th>Nombre</th><th>Email</th><th>País</th><th>Teléfono</th>
        <th>Compras</th><th>Acciones</th>
      </tr></thead>
      <tbody>
        ${slice.map(c => {
          const id = idStr(c._id);
          return `<tr>
            <td><div style="display:flex;align-items:center;gap:8px">
              <div style="width:30px;height:30px;border-radius:50%;background:rgba(79,124,255,.15);
                display:flex;align-items:center;justify-content:center;font-size:.75rem;
                color:var(--accent);font-family:var(--mono)">${c.nombre.charAt(0).toUpperCase()}</div>
              <strong style="font-weight:500">${c.nombre}</strong>
            </div></td>
            <td style="color:var(--text2)">${c.email}</td>
            <td>${c.pais || '—'}</td>
            <td style="font-family:var(--mono);font-size:.78rem;color:var(--text2)">${c.telefono || '—'}</td>
            <td><span class="badge badge-gray">${(c.historial_compras||[]).length}</span></td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="modalVerCliente('${id}')">Ver</button>
              <button class="btn btn-secondary btn-sm" onclick="modalEditarCliente('${id}')">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="confirmarBorrarCliente('${id}','${c.nombre.replace(/'/g,"\\'")}')">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ${pages > 1 ? `
    <div class="pagination">
      <button class="page-btn" onclick="cambiarPagCli(${_cliPage-1})" ${_cliPage===1?'disabled':''}>‹</button>
      <span class="page-info">${_cliPage} / ${pages}</span>
      <button class="page-btn" onclick="cambiarPagCli(${_cliPage+1})" ${_cliPage===pages?'disabled':''}>›</button>
    </div>` : ''}`;
}

function cambiarPagCli(n) { _cliPage = n; renderCliTable(); }

function modalCrearCliente() {
  openModal('Nuevo Cliente', `
    <div class="form-row">
      <div class="form-group"><label>Nombre completo</label>
        <input class="form-control" id="cNombre" placeholder="Juan Pérez"></div>
      <div class="form-group"><label>Email</label>
        <input class="form-control" id="cEmail" type="email" placeholder="juan@email.com"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Teléfono</label>
        <input class="form-control" id="cTel" placeholder="+57 300 123 4567"></div>
      <div class="form-group"><label>País</label>
        <select class="form-control" id="cPais">
          ${["Colombia","México","Argentina","Chile","Perú","Ecuador","Venezuela",
             "Uruguay","Bolivia","Paraguay","Costa Rica","Panamá","Otro"].map(p =>
            `<option>${p}</option>`).join('')}
        </select></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarCliente()">Guardar</button>
    </div>`);
}

async function guardarCliente() {
  const nombre = document.getElementById('cNombre').value.trim();
  const email  = document.getElementById('cEmail').value.trim();
  if (!nombre || !email) return showToast('Nombre y email son obligatorios', 'error');
  try {
    await api.crearCliente({
      nombre, email,
      telefono: document.getElementById('cTel').value.trim(),
      pais:     document.getElementById('cPais').value,
    });
    closeModal(); showToast('Cliente registrado', 'success');
    _clientes = await api.getClientes(); _cliPage = 1; renderCliTable();
  } catch(e) {}
}

async function modalVerCliente(id) {
  const c = await api.getCliente(id);
  const hist = (c.historial_compras || []).slice(-5).reverse();
  openModal('Perfil del Cliente', `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:1.2rem">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(79,124,255,.15);
        display:flex;align-items:center;justify-content:center;font-size:1.2rem;
        color:var(--accent);font-family:var(--display);font-weight:700">
        ${c.nombre.charAt(0).toUpperCase()}</div>
      <div>
        <p style="font-weight:700;font-family:var(--display)">${c.nombre}</p>
        <p style="font-size:.8rem;color:var(--text2)">${c.email}</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1.2rem">
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">PAÍS</span><p>${c.pais||'—'}</p></div>
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">TELÉFONO</span><p style="font-family:var(--mono)">${c.telefono||'—'}</p></div>
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">COMPRAS TOTALES</span>
        <p style="font-family:var(--mono);color:var(--green)">${(c.historial_compras||[]).length}</p></div>
      <div><span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">REGISTRADO</span>
        <p style="font-size:.82rem">${formatDate(c.creado_en)}</p></div>
    </div>
    <div>
      <span style="color:var(--text3);font-size:.73rem;font-family:var(--mono)">ÚLTIMAS COMPRAS</span>
      ${hist.length ? `<table style="margin-top:.5rem;width:100%">
        <thead><tr>
          <th style="font-size:.7rem;color:var(--text3);text-align:left;padding:.4rem .5rem">Producto</th>
          <th style="font-size:.7rem;color:var(--text3);text-align:right;padding:.4rem .5rem">Total</th>
          <th style="font-size:.7rem;color:var(--text3);text-align:right;padding:.4rem .5rem">Fecha</th>
        </tr></thead><tbody>
        ${hist.map(h => `<tr style="border-top:1px solid var(--border)">
          <td style="padding:.4rem .5rem;font-size:.8rem">${h.producto}</td>
          <td style="padding:.4rem .5rem;font-size:.78rem;font-family:var(--mono);text-align:right;color:var(--green)">${formatMoney(h.total)}</td>
          <td style="padding:.4rem .5rem;font-size:.76rem;text-align:right;color:var(--text2)">${formatDate(h.fecha)}</td>
        </tr>`).join('')}
        </tbody></table>` :
        '<p style="color:var(--text3);font-size:.82rem;margin-top:.5rem">Sin compras registradas</p>'}
    </div>`);
}

async function modalEditarCliente(id) {
  const c = await api.getCliente(id);
  openModal('Editar Cliente', `
    <div class="form-row">
      <div class="form-group"><label>Nombre</label>
        <input class="form-control" id="ecNombre" value="${c.nombre}"></div>
      <div class="form-group"><label>Email</label>
        <input class="form-control" id="ecEmail" type="email" value="${c.email}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Teléfono</label>
        <input class="form-control" id="ecTel" value="${c.telefono||''}"></div>
      <div class="form-group"><label>País</label>
        <select class="form-control" id="ecPais">
          ${["Colombia","México","Argentina","Chile","Perú","Ecuador","Venezuela",
             "Uruguay","Bolivia","Paraguay","Costa Rica","Panamá","Otro"].map(p =>
            `<option ${c.pais===p?'selected':''}>${p}</option>`).join('')}
        </select></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarEdicionCliente('${id}')">Guardar</button>
    </div>`);
}

async function guardarEdicionCliente(id) {
  try {
    await api.editarCliente(id, {
      nombre:   document.getElementById('ecNombre').value,
      email:    document.getElementById('ecEmail').value,
      telefono: document.getElementById('ecTel').value,
      pais:     document.getElementById('ecPais').value,
    });
    closeModal(); showToast('Cliente actualizado', 'success');
    _clientes = await api.getClientes(); _cliPage = 1; renderCliTable();
  } catch(e) {}
}

async function confirmarBorrarCliente(id, nombre) {
  openModal('Confirmar eliminación', `
    <p style="color:var(--text2);margin-bottom:1.5rem">¿Eliminar al cliente <strong style="color:var(--text)">"${nombre}"</strong>?</p>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="borrarCliente('${id}')">Eliminar</button>
    </div>`);
}

async function borrarCliente(id) {
  await api.borrarCliente(id); closeModal();
  showToast('Cliente eliminado', 'info');
  _clientes = await api.getClientes(); _cliPage = 1; renderCliTable();
}
