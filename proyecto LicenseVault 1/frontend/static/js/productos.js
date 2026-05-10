// productos.js — FIX #5 skeleton, #7 errores, #13 exportar CSV
let _productos = [];
let _prodPage = 1;
const _prodPerPage = 15;

async function renderProductos() {
  const page = document.getElementById('page-productos');
  page.innerHTML = `
    <div class="page-header">
      <div><h1>Productos</h1><p>Catálogo de licencias digitales</p></div>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-export" onclick="exportarProductos()">↓ Exportar CSV</button>
        <button class="btn btn-primary" onclick="modalCrearProducto()">+ Nuevo producto</button>
      </div>
    </div>
    <div class="table-wrap">
      <div class="table-toolbar">
        <input class="search-input" id="prodSearch" placeholder="Buscar producto..." oninput="filtrarProductos()">
        <select class="search-input" id="prodCat" style="max-width:220px" onchange="filtrarProductos()">
          <option value="">Todas las categorías</option>
          <option>Sistema Operativo</option>
          <option>Ofimática (Suscripción)</option>
          <option>Ofimática (Permanente)</option>
          <option>Diseño y Creatividad</option>
          <option>Seguridad / Antivirus</option>
          <option>Diseño Técnico (CAD)</option>
          <option>Gestión de Documentos</option>
          <option>Gestión de Clientes</option>
          <option>Contabilidad y Facturación</option>
          <option>Gestión de Proyectos</option>
        </select>
      </div>
      <!-- FIX #5: skeleton mientras carga -->
      <div id="prodTableBody">${skeletonTable(6, 8)}</div>
    </div>`;
  await loadProductos();
}

async function loadProductos() {
  const cat = document.getElementById('prodCat')?.value || '';
  _productos = await api.getProductos(cat);
  _prodPage = 1;
  renderProdTable();
}

function filtrarProductos() {
  const q = document.getElementById('prodSearch').value.toLowerCase();
  const cat = document.getElementById('prodCat').value;
  const filtered = _productos.filter(p =>
    (!q || p.nombre.toLowerCase().includes(q)) &&
    (!cat || p.categoria === cat)
  );
  renderProdTable(filtered);
}

function renderProdTable(list) {
  list = list || _productos;
  const total = list.length;
  const pages = Math.ceil(total / _prodPerPage);
  const start = (_prodPage - 1) * _prodPerPage;
  const slice = list.slice(start, start + _prodPerPage);

  const tbody = document.getElementById('prodTableBody');
  if (!slice.length) {
    tbody.innerHTML = `<div class="empty-state"><div class="empty-icon">◻</div><p>Sin productos</p></div>`;
    return;
  }
  tbody.innerHTML = `
    <table>
      <thead><tr>
        <th>Nombre</th><th>Categoría</th><th>Precio</th>
        <th>Stock</th><th>Estado</th><th>Acciones</th>
      </tr></thead>
      <tbody>
        ${slice.map(p => {
          const id = idStr(p._id);
          const stockBadge = p.stock < 5 ? 'badge-bad' : p.stock < 20 ? 'badge-warn' : 'badge-ok';
          return `<tr>
            <td><strong style="font-weight:500">${p.nombre}</strong></td>
            <td>${badgeCat(p.categoria)}</td>
            <td style="font-family:var(--mono)">${formatMoney(p.precio)}</td>
            <td><span class="badge ${stockBadge}">${p.stock}</span></td>
            <td>${p.activo
              ? '<span class="badge badge-ok">Activo</span>'
              : '<span class="badge badge-bad">Inactivo</span>'}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="modalVerProducto('${id}')">Ver</button>
              <button class="btn btn-secondary btn-sm" onclick="modalEditarProducto('${id}')">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="confirmarBorrarProducto('${id}','${p.nombre.replace(/'/g,"\\'")}')">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ${pages > 1 ? `
    <div class="pagination">
      <button class="page-btn" onclick="cambiarPagProd(${_prodPage-1})" ${_prodPage===1?'disabled':''}>‹</button>
      <span class="page-info">${_prodPage} / ${pages}</span>
      <button class="page-btn" onclick="cambiarPagProd(${_prodPage+1})" ${_prodPage===pages?'disabled':''}>›</button>
    </div>` : ''}`;
}

function cambiarPagProd(n) {
  _prodPage = n;
  renderProdTable();
}

// FIX #13: exportar productos a CSV
function exportarProductos() {
  exportCSV(_productos, 'productos.csv', [
    { key: 'nombre',    label: 'Nombre' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'precio',    label: 'Precio', format: v => formatMoney(v) },
    { key: 'stock',     label: 'Stock' },
    { key: 'activo',    label: 'Estado', format: v => v ? 'Activo' : 'Inactivo' },
  ]);
}

function modalCrearProducto() {
  openModal('Nuevo Producto', `
    <div class="form-group"><label>Nombre</label>
      <input class="form-control" id="pNombre" placeholder="Ej: Windows 11 Pro"></div>
    <div class="form-row">
      <div class="form-group"><label>Categoría</label>
        <select class="form-control" id="pCat">
          <option>Sistema Operativo</option>
          <option>Ofimática (Suscripción)</option>
          <option>Ofimática (Permanente)</option>
          <option>Diseño y Creatividad</option>
          <option>Seguridad / Antivirus</option>
          <option>Diseño Técnico (CAD)</option>
          <option>Gestión de Documentos</option>
          <option>Gestión de Clientes</option>
          <option>Contabilidad y Facturación</option>
          <option>Gestión de Proyectos</option>
        </select></div>
      <div class="form-group"><label>Precio (USD)</label>
        <input class="form-control" id="pPrecio" type="number" min="0.01" step="0.01" placeholder="99.00"></div>
    </div>
    <div class="form-group"><label>Descripción</label>
      <textarea class="form-control" id="pDesc" placeholder="Descripción del producto..."></textarea></div>
    <div class="form-group"><label>Stock inicial</label>
      <input class="form-control" id="pStock" type="number" min="0" value="50"></div>
    <div class="form-group"><label>Claves de licencia (una por línea)</label>
      <textarea class="form-control" id="pClaves" rows="4" placeholder="LIC-XXXXX-XXXX&#10;LIC-YYYYY-YYYY"></textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarProducto()">Guardar</button>
    </div>`);
}

async function guardarProducto() {
  const nombre = document.getElementById('pNombre').value.trim();
  const categoria = document.getElementById('pCat').value;
  const precio = document.getElementById('pPrecio').value;
  const descripcion = document.getElementById('pDesc').value.trim();
  const stock = document.getElementById('pStock').value;
  const clavesRaw = document.getElementById('pClaves').value.trim();
  // FIX #7: mensajes de error del backend llegan via showToast en api.js
  if (!nombre || !precio) return showToast('Nombre y precio son obligatorios', 'error');
  const licencias = clavesRaw ? clavesRaw.split('\n').map(c => c.trim()).filter(Boolean) : [];
  try {
    await api.crearProducto({ nombre, categoria, descripcion, precio, stock, licencias_disponibles: licencias });
    _modalDirty = false;
    closeModal(true);
    showToast('Producto creado', 'success');
    await loadProductos();
  } catch(e) { /* error ya mostrado en api.js */ }
}

async function modalVerProducto(id) {
  const p = await api.getProducto(id);
  const claves = (p.licencias_disponibles || []).slice(0, 20);
  openModal('Detalle del Producto', `
    <div style="display:grid;gap:.7rem">
      <div><span style="color:var(--text3);font-size:.75rem;font-family:var(--mono)">NOMBRE</span>
        <p style="font-weight:600;font-family:var(--display)">${p.nombre}</p></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.7rem">
        <div><span style="color:var(--text3);font-size:.75rem;font-family:var(--mono)">CATEGORÍA</span>
          <p>${badgeCat(p.categoria)}</p></div>
        <div><span style="color:var(--text3);font-size:.75rem;font-family:var(--mono)">PRECIO</span>
          <p style="font-family:var(--mono);color:var(--green)">${formatMoney(p.precio)}</p></div>
        <div><span style="color:var(--text3);font-size:.75rem;font-family:var(--mono)">STOCK</span>
          <p style="font-family:var(--mono)">${p.stock} unidades</p></div>
        <div><span style="color:var(--text3);font-size:.75rem;font-family:var(--mono)">ESTADO</span>
          <p>${p.activo ? '<span class="badge badge-ok">Activo</span>' : '<span class="badge badge-bad">Inactivo</span>'}</p></div>
      </div>
      ${p.descripcion ? `<div><span style="color:var(--text3);font-size:.75rem;font-family:var(--mono)">DESCRIPCIÓN</span>
        <p style="font-size:.83rem;color:var(--text2)">${p.descripcion}</p></div>` : ''}
      <div>
        <span style="color:var(--text3);font-size:.75rem;font-family:var(--mono)">CLAVES DISPONIBLES (${p.licencias_disponibles?.length || 0})</span>
        <div class="keys-list">
          ${claves.map(c => `<span class="key-pill">${c}</span>`).join('')}
          ${(p.licencias_disponibles?.length || 0) > 20 ? `<span class="key-pill" style="color:var(--text3)">+${p.licencias_disponibles.length - 20} más</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:.5rem;margin-top:.5rem">
        <input class="form-control" id="nuevaClave" placeholder="Nueva clave de licencia" style="flex:1">
        <button class="btn btn-success btn-sm" onclick="agregarClave('${id}')">+ Agregar</button>
      </div>
    </div>`);
}

async function agregarClave(id) {
  const clave = document.getElementById('nuevaClave').value.trim();
  if (!clave) return showToast('Ingresa una clave', 'error');
  try {
    await api.agregarLicencia(id, clave);
    showToast('Clave agregada', 'success');
    await modalVerProducto(id);
    await loadProductos();
  } catch(e) {}
}

async function modalEditarProducto(id) {
  const p = await api.getProducto(id);
  openModal('Editar Producto', `
    <div class="form-group"><label>Nombre</label>
      <input class="form-control" id="epNombre" value="${p.nombre}"></div>
    <div class="form-row">
      <div class="form-group"><label>Categoría</label>
        <select class="form-control" id="epCat">
          ${['Sistema Operativo','Ofimática (Suscripción)','Ofimática (Permanente)','Diseño y Creatividad','Seguridad / Antivirus','Diseño Técnico (CAD)','Gestión de Documentos','Gestión de Clientes','Contabilidad y Facturación','Gestión de Proyectos'].map(c =>
            `<option ${p.categoria===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Precio</label>
        <input class="form-control" id="epPrecio" type="number" min="0.01" step="0.01" value="${p.precio}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Stock</label>
        <input class="form-control" id="epStock" type="number" min="0" value="${p.stock}"></div>
      <div class="form-group"><label>Estado</label>
        <select class="form-control" id="epActivo">
          <option value="true" ${p.activo?'selected':''}>Activo</option>
          <option value="false" ${!p.activo?'selected':''}>Inactivo</option>
        </select></div>
    </div>
    <div class="form-group"><label>Descripción</label>
      <textarea class="form-control" id="epDesc">${p.descripcion||''}</textarea></div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarEdicionProducto('${id}')">Guardar cambios</button>
    </div>`);
}

async function guardarEdicionProducto(id) {
  try {
    await api.editarProducto(id, {
      nombre:      document.getElementById('epNombre').value,
      categoria:   document.getElementById('epCat').value,
      precio:      document.getElementById('epPrecio').value,
      stock:       document.getElementById('epStock').value,
      descripcion: document.getElementById('epDesc').value,
      activo:      document.getElementById('epActivo').value === 'true',
    });
    _modalDirty = false;
    closeModal(true);
    showToast('Producto actualizado', 'success');
    await loadProductos();
  } catch(e) {}
}

async function confirmarBorrarProducto(id, nombre) {
  openModal('Confirmar eliminación', `
    <p style="color:var(--text2);margin-bottom:1.5rem">¿Eliminar el producto <strong style="color:var(--text)">"${nombre}"</strong>? Esta acción no se puede deshacer.</p>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal(true)">Cancelar</button>
      <button class="btn btn-danger" onclick="borrarProducto('${id}')">Eliminar</button>
    </div>`);
}

async function borrarProducto(id) {
  try {
    await api.borrarProducto(id);
    _modalDirty = false;
    closeModal(true);
    showToast('Producto eliminado', 'info');
    await loadProductos();
  } catch(e) {}
}