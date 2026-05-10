const IP_SERVIDOR = "192.168.1.2";
let todosLosEstudiantes = [];
let usuarioActual = null;
let sessionToken  = null;
let graficoRiesgo = null;
let graficoProgramas = null;

let paginaActual   = 1;
const FILAS_PAG    = 15;
let listaFiltrada  = [];

let modoOscuro = false;

function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (sessionToken) headers['X-Session-Token'] = sessionToken;
    return fetch(`http://${IP_SERVIDOR}:5000${url}`, { ...options, headers });
}

function mostrarToast(mensaje, tipo = 'info', duracion = 3500) {
    // tipo: 'success' | 'error' | 'info' | 'warning'
    const contenedor = document.getElementById('toast-container');
    if (!contenedor) return;

    const iconos = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast  = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `<span class="toast-icon">${iconos[tipo] || 'ℹ️'}</span><span class="toast-msg">${mensaje}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    contenedor.appendChild(toast);
    // Animar entrada
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    // Auto-eliminar
    setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duracion);
}

function mostrarSpinner() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.remove('hidden');
}
function ocultarSpinner() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('hidden');
}

const LOGS_STORAGE_KEY = 'isfi_activity_logs';

function registrarLog(accion, detalle) {
    if (!usuarioActual) return;
    const logs = JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || '[]');
    logs.unshift({ id: Date.now(), usuario: usuarioActual.nombre, rol: usuarioActual.rol, accion, detalle, timestamp: new Date().toISOString() });
    if (logs.length > 200) logs.splice(200);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
}

function obtenerLogs() { return JSON.parse(localStorage.getItem(LOGS_STORAGE_KEY) || '[]'); }

function limpiarLogs() {
    mostrarConfirmacion('¿Borrar todos los registros de actividad? Esta acción no se puede deshacer.', () => {
        localStorage.removeItem(LOGS_STORAGE_KEY);
        renderizarSeccionLogs();
        mostrarToast('Logs eliminados.', 'info');
    });
}

function exportarLogs() {
    const logs = obtenerLogs();
    if (logs.length === 0) { mostrarToast('No hay registros para exportar.', 'warning'); return; }
    const header = 'Fecha,Hora,Usuario,Rol,Acción,Detalle\n';
    const rows   = logs.map(l => {
        const d = new Date(l.timestamp);
        return `"${d.toLocaleDateString('es-CO')}","${d.toLocaleTimeString('es-CO')}","${l.usuario}","${l.rol}","${l.accion}","${l.detalle}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `logs_isfi_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

let filtroLogActivo = 'todas';
function filtrarLogs(tipo, el) {
    filtroLogActivo = tipo;
    document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    renderizarSeccionLogs();
}

function renderizarSeccionLogs() {
    const contenedor = document.getElementById('log-full-list');
    const resumen    = document.getElementById('log-resumen-grid');
    if (!contenedor || !resumen) return;
    const logs    = obtenerLogs();
    const logins  = logs.filter(l => l.accion === 'LOGIN').length;
    const regEst  = logs.filter(l => l.accion === 'REGISTRO_ESTUDIANTE').length;
    resumen.innerHTML = `
        <div class="notif-resumen-card" style="border-bottom:4px solid #1e3a8a;">
            <div class="num" style="color:#1e3a8a">${logs.length}</div><div class="label">📋 TOTAL EVENTOS</div>
        </div>
        <div class="notif-resumen-card" style="border-bottom:4px solid #10b981;">
            <div class="num" style="color:#10b981">${logins}</div><div class="label">🔐 INICIOS DE SESIÓN</div>
        </div>
        <div class="notif-resumen-card" style="border-bottom:4px solid #f59e0b;">
            <div class="num" style="color:#f59e0b">${regEst}</div><div class="label">👤 ESTUDIANTES REG.</div>
        </div>`;
    let filtrados = logs;
    if (filtroLogActivo === 'LOGIN') filtrados = logs.filter(l => l.accion === 'LOGIN');
    else if (filtroLogActivo === 'REGISTRO_ESTUDIANTE') filtrados = logs.filter(l => l.accion === 'REGISTRO_ESTUDIANTE');
    else if (filtroLogActivo === 'REGISTRO_USUARIO')    filtrados = logs.filter(l => l.accion === 'REGISTRO_USUARIO');
    const iconos  = { LOGIN:'🔐', REGISTRO_ESTUDIANTE:'👤', EDICION_ESTUDIANTE:'✏️', ELIMINACION_ESTUDIANTE:'🗑️', REGISTRO_USUARIO:'🔑', CIERRE_SESION:'🚪' };
    const colores = { LOGIN:'#1e3a8a', REGISTRO_ESTUDIANTE:'#10b981', EDICION_ESTUDIANTE:'#6366f1', ELIMINACION_ESTUDIANTE:'#e11d48', REGISTRO_USUARIO:'#f59e0b', CIERRE_SESION:'#e11d48' };
    if (filtrados.length === 0) { contenedor.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px">No hay registros en esta categoría.</p>'; return; }
    contenedor.innerHTML = filtrados.map(l => {
        const d = new Date(l.timestamp);
        const color = colores[l.accion] || '#64748b';
        const icono = iconos[l.accion] || '📌';
        return `<div class="notif-full-item" style="border-left:4px solid ${color};">
            <div style="display:flex;align-items:center;gap:14px;flex:1;">
                <div style="font-size:1.4rem;width:36px;text-align:center;">${icono}</div>
                <div class="notif-full-info" style="flex:1;"><strong>${l.detalle}</strong>
                <span>Usuario: <b>${l.usuario}</b> · Rol: ${l.rol}</span></div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:16px;">
                <span style="font-size:0.78rem;color:var(--text-muted);display:block;">${d.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'})}</span>
                <span style="font-size:0.85rem;font-weight:700;color:var(--text-dark);">${d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</span>
            </div>
        </div>`;
    }).join('');
}

function mostrarConfirmacion(mensaje, onConfirm, textoBoton = 'Confirmar', colorBoton = '#1e3a8a') {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-mensaje').textContent = mensaje;
    const btn = document.getElementById('confirm-ok');
    btn.textContent = textoBoton;
    btn.style.background = colorBoton;
    // Clonar para remover listeners previos
    const nuevo = btn.cloneNode(true);
    btn.parentNode.replaceChild(nuevo, btn);
    nuevo.addEventListener('click', () => {
        overlay.classList.add('hidden');
        onConfirm();
    });
    overlay.classList.remove('hidden');
}
function cerrarConfirmacion() {
    document.getElementById('confirm-overlay').classList.add('hidden');
}

const NOTIF_STORAGE_KEY = 'isfi_notificaciones_leidas';
let notificacionesActuales = [];
let filtroNotifActivo = 'todas';

function generarNotificaciones(estudiantes) {
    const enRiesgo = estudiantes.filter(e => e.categoria === 'Alto' || e.categoria === 'Medio');

    let leidasGuardadas = [];
    try {
        const raw = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
        leidasGuardadas = raw.map(e => typeof e === 'string' ? { id: e, categoria: null } : e);
    } catch(e) { leidasGuardadas = []; }

    notificacionesActuales = enRiesgo.map(est => {
        const id = `notif_${est.id || est.nombre.replace(/\s/g, '_')}`;
        const registro = leidasGuardadas.find(l => l.id === id);
        const leida    = registro ? registro.categoria === est.categoria : false;
        return {
            id, est, leida,
            titulo: est.nombre,
            categoria: est.categoria,
            detalle: `${est.programa} · Sem. ${est.semestre} · Prom: ${parseFloat(est.promedio).toFixed(1)} · Asist: ${est.asistencia}% · Deserción: ${(est.score*100).toFixed(0)}%`
        };
    });

    // Orden de llegada: no leídas primero, luego leídas;
    // dentro de cada grupo se mantiene el orden original del servidor.
    notificacionesActuales.sort((a, b) => {
        if (!a.leida && b.leida) return -1;
        if (a.leida && !b.leida) return 1;
        return 0;
    });
    actualizarBadge();
    // Siempre renderizar el panel lateral (campana) para que las alertas aparezcan al abrirlo.
    // Solo re-renderizar la sección completa si el usuario ya está en ella,
    // para no forzar un cambio de vista inesperado.
    renderizarPanelNotif();
    const seccionActiva = sessionStorage.getItem('isfi_seccion') || 'dashboard';
    if (seccionActiva === 'notificaciones') {
        renderizarSeccionNotif();
    }
}

function actualizarBadge() {
    const noLeidas = notificacionesActuales.filter(n => !n.leida).length;
    ['notif-count','nav-notif-badge'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.innerText = noLeidas; el.classList.toggle('hidden', noLeidas === 0); }
    });
}

function toggleNotificaciones() { document.getElementById('notif-panel').classList.toggle('hidden'); }

function filtrarNotifs(tipo, el) {
    filtroNotifActivo = tipo;
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    const tabActivo = el || (typeof event !== 'undefined' && event.target) || null;
    if (tabActivo) tabActivo.classList.add('active');
    renderizarPanelNotif();
}

function renderizarPanelNotif() {
    const lista = document.getElementById('notif-list'); if (!lista) return;
    let items = notificacionesActuales;
    if (filtroNotifActivo === 'Alto') items = items.filter(n => n.categoria === 'Alto');
    else if (filtroNotifActivo === 'Medio') items = items.filter(n => n.categoria === 'Medio');
    else if (filtroNotifActivo === 'no-leidas') items = items.filter(n => !n.leida);
    if (items.length === 0) { lista.innerHTML = '<p class="notif-empty">No hay alertas en esta categoría.</p>'; return; }
    lista.innerHTML = items.map(n => `
        <div class="notif-item ${n.leida?'':'no-leida'}" onclick="marcarLeida('${n.id}')">
            <div class="notif-dot-${n.categoria.toLowerCase()}"></div>
            <div class="notif-texto"><strong>${n.titulo}</strong><span>${n.detalle}</span>
            <span class="notif-meta">${n.leida?'✓ Revisado':'● Nuevo'} · Riesgo ${n.categoria}</span></div>
            <span class="badge badge-${n.categoria.toLowerCase()}">${n.categoria}</span>
        </div>`).join('');
}

function renderizarSeccionNotif() {
    const resumen  = document.getElementById('notif-resumen-grid');
    const fullList = document.getElementById('notif-full-list');
    if (!resumen || !fullList) return;
    const totalAlto  = notificacionesActuales.filter(n => n.categoria === 'Alto').length;
    const totalMedio = notificacionesActuales.filter(n => n.categoria === 'Medio').length;
    const noLeidas   = notificacionesActuales.filter(n => !n.leida).length;
    resumen.innerHTML = `
        <div class="notif-resumen-card" style="border-bottom:4px solid #e11d48;"><div class="num" style="color:#e11d48">${totalAlto}</div><div class="label">🔴 RIESGO ALTO</div></div>
        <div class="notif-resumen-card" style="border-bottom:4px solid #f59e0b;"><div class="num" style="color:#f59e0b">${totalMedio}</div><div class="label">🟡 RIESGO MEDIO</div></div>
        <div class="notif-resumen-card" style="border-bottom:4px solid #1e3a8a;"><div class="num" style="color:#1e3a8a">${noLeidas}</div><div class="label">🔔 SIN REVISAR</div></div>`;
    fullList.innerHTML = notificacionesActuales.map(n => `
        <div class="notif-full-item riesgo-${n.categoria.toLowerCase()} ${n.leida?'':'no-leida-full'}" id="full-${n.id}">
            <div class="notif-full-info"><strong>${n.titulo}${n.leida?'':'<span style="font-size:0.7rem;color:#e11d48;font-weight:700;margin-left:6px;">● NUEVO</span>'}</strong><span>${n.detalle}</span></div>
            <button class="btn-marcar-leida ${n.leida?'leida':''}" onclick="marcarLeida('${n.id}')" ${n.leida?'disabled':''}>
                ${n.leida?'✓ Revisado':'Marcar leída'}</button>
        </div>`).join('') || '<p style="color:var(--text-muted);text-align:center;padding:30px">Sin alertas de riesgo actualmente.</p>';
}

function marcarLeida(id) {
    const notif = notificacionesActuales.find(n => n.id === id);
    if (!notif || notif.leida) return;
    notif.leida = true;
    let leidas = [];
    try { leidas = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]'); } catch(e) {}
    leidas = leidas.map(e => typeof e === 'string' ? { id: e, categoria: null } : e);
    const idx = leidas.findIndex(l => l.id === id);
    const entrada = { id, categoria: notif.categoria };
    if (idx === -1) leidas.push(entrada); else leidas[idx] = entrada;
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(leidas));
    actualizarBadge(); renderizarPanelNotif(); renderizarSeccionNotif();
}

function marcarTodasLeidas() {
    let leidas = [];
    try { leidas = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]'); } catch(e) {}
    leidas = leidas.map(e => typeof e === 'string' ? { id: e, categoria: null } : e);
    notificacionesActuales.forEach(n => {
        n.leida = true;
        const idx = leidas.findIndex(l => l.id === n.id);
        const entrada = { id: n.id, categoria: n.categoria };
        if (idx === -1) leidas.push(entrada); else leidas[idx] = entrada;
    });
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(leidas));
    actualizarBadge(); renderizarPanelNotif(); renderizarSeccionNotif();
}

// ════════════════════════════════════════════
//  CARGA DE ESTUDIANTES
// ════════════════════════════════════════════
async function cargarEstudiantes() {
    mostrarSpinner();
    try {
        const res = await apiFetch('/api/estudiantes');
        if (res.status === 401) { cerrarSesion(true); return; }
        todosLosEstudiantes = await res.json();
        if (usuarioActual) {
            poblarFiltroSemestres();
            if (usuarioActual.rol !== 'profesor') {
                poblarFiltroProgramas();
                poblarFiltroEstrato();
            }
            filtrarDatos();
            generarNotificaciones(todosLosEstudiantes);
        }
    } catch (e) {
        mostrarToast('No se pudo conectar al servidor.', 'error');
    } finally {
        ocultarSpinner();
    }
}

// ════════════════════════════════════════════
//  LOGIN / LOGOUT
// ════════════════════════════════════════════
async function intentarLogin() {
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value;
    if (!user || !pass) { mostrarToast('Ingrese usuario y contraseña.', 'warning'); return; }

    const btn = document.querySelector('.login-form button');
    btn.disabled = true; btn.textContent = 'Ingresando…';

    try {
        const res = await fetch(`http://${IP_SERVIDOR}:5000/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: user, clave: pass })
        });

        if (res.ok) {
            const data = await res.json();
            sessionToken  = data.token;
            usuarioActual = data;
            sessionStorage.setItem('isfi_session', JSON.stringify(data));
            sessionStorage.setItem('isfi_token', sessionToken);
            document.getElementById("login-screen").classList.add("hidden");
            document.getElementById("main-dashboard").classList.remove("hidden");
            configurarDashboard();
            registrarLog('LOGIN', `${usuarioActual.nombre} inició sesión como ${usuarioActual.rol}`);
            await cargarEstudiantes();
        } else {
            mostrarToast('Usuario o contraseña incorrectos.', 'error');
        }
    } catch (e) {
        mostrarToast('El servidor no responde. Verifique la conexión.', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Ingresar al Sistema';
    }
}

// Soporte Enter en login
document.addEventListener('DOMContentLoaded', () => {
    ['username','password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') intentarLogin(); });
    });
});

function cerrarSesion(forzado = false) {
    const hacer = async () => {
        registrarLog('CIERRE_SESION', `${usuarioActual?.nombre || 'Usuario'} cerró sesión`);
        try { await apiFetch('/api/logout', { method: 'POST' }); } catch(_) {}
        sessionToken  = null; usuarioActual = null;
        sessionStorage.removeItem('isfi_session');
        sessionStorage.removeItem('isfi_token');
        location.reload();
    };
    if (forzado) { hacer(); return; }
    mostrarConfirmacion('¿Estás seguro de que deseas cerrar sesión?', hacer, 'Cerrar sesión', '#e11d48');
}

// ════════════════════════════════════════════
//  CONFIGURACIÓN DASHBOARD POR ROL
// ════════════════════════════════════════════
function configurarDashboard() {
    document.getElementById("display-role").innerText = usuarioActual.nombre;
    const nombres   = usuarioActual.nombre.trim().split(' ');
    const iniciales = nombres.length >= 2 ? nombres[0][0]+nombres[1][0] : nombres[0].substring(0,2);
    document.getElementById("user-initials").innerText = iniciales.toUpperCase();

    const navGest     = document.getElementById("nav-gest");
    const navUsuarios = document.getElementById("nav-usuarios");
    const navNotif    = document.getElementById("nav-notif");
    const filtroProg  = document.getElementById("container-filtro-programa");
    const campana     = document.getElementById("notification-bell");

    if (usuarioActual.rol === 'profesor') {
        navGest.classList.remove("hidden");
        navUsuarios.classList.add("hidden");
        navNotif.classList.add("hidden");
        filtroProg.classList.add("hidden");
        campana.style.display = "none";
        document.getElementById("welcome-msg").innerText = `Facultad: ${usuarioActual.grado_asignado}`;
    } else {
        navGest.classList.add("hidden");
        navUsuarios.classList.toggle("hidden", usuarioActual.rol !== 'director');
        navNotif.classList.remove("hidden");
        filtroProg.classList.remove("hidden");
        campana.style.display = "flex";
        document.getElementById("welcome-msg").innerText = usuarioActual.rol === 'director' ? "Dirección Institucional" : "Bienestar Institucional";
        const filtroEstr = document.getElementById("container-filtro-estrato");
        if (filtroEstr) filtroEstr.classList.remove("hidden");
        const navLogs = document.getElementById('nav-logs');
        if (navLogs) navLogs.classList.toggle('hidden', usuarioActual.rol !== 'director');
    }
    document.querySelectorAll('.col-bienestar').forEach(el => el.classList.toggle('hidden', usuarioActual.rol !== 'bienestar'));
}

// ════════════════════════════════════════════
//  FILTROS Y RENDERIZADO
// ════════════════════════════════════════════
function poblarFiltroProgramas() {
    const selector = document.getElementById("filter-programa");
    const programas = [...new Set(todosLosEstudiantes.map(e => e.programa))];
    selector.innerHTML = '<option value="">Todos los Programas</option>';
    programas.forEach(p => { const o = document.createElement("option"); o.value=p; o.textContent=p; selector.appendChild(o); });
}

function poblarFiltroSemestres() {
    const selector = document.getElementById("filter-semestre");
    if (!selector) return;
    const semestres = [...new Set(todosLosEstudiantes.map(e => parseInt(e.semestre)))].sort((a,b)=>a-b);
    selector.innerHTML = '<option value="">Todos los Semestres</option>';
    semestres.forEach(s => { const o = document.createElement("option"); o.value=s; o.textContent=`Semestre ${s}`; selector.appendChild(o); });
}

function filtrarDatos() {
    const busq    = document.getElementById("search-name").value.toLowerCase();
    const fProg   = document.getElementById("filter-programa").value;
    const fRiesgo = document.getElementById("filter-riesgo").value;
    const fSem    = document.getElementById("filter-semestre")?.value || "";
    const fEstr   = document.getElementById("filter-estrato")?.value || "";

    listaFiltrada = todosLosEstudiantes.filter(est => {
        const matchesName   = est.nombre.toLowerCase().includes(busq);
        const matchesProg   = usuarioActual.rol === "profesor"
            ? est.programa.toLowerCase() === usuarioActual.grado_asignado.toLowerCase()
            : (fProg === "" || est.programa === fProg);
        const matchesRiesgo = (fRiesgo === "" || est.categoria === fRiesgo);
        const matchesSem    = (fSem === "" || String(est.semestre) === String(fSem));
        const matchesEstr   = (fEstr === "" || String(est.estrato) === String(fEstr));
        return matchesName && matchesProg && matchesRiesgo && matchesSem && matchesEstr;
    });

    paginaActual = 1;
    actualizarKPIs(listaFiltrada);
    renderizarTablaRiesgo(listaFiltrada);
    actualizarGraficas(listaFiltrada);

    // Gestión del profesor: buscador propio
    if (usuarioActual.rol === 'profesor') {
        const busqGest = document.getElementById("search-gestion")?.value.toLowerCase() || '';
        const gestionFiltrados = listaFiltrada.filter(e => e.nombre.toLowerCase().includes(busqGest));
        renderizarGestion(gestionFiltrados);
    }
}

// Buscador en tabla de gestión (profesor)
function filtrarGestion() {
    if (!usuarioActual) return;
    const busq = document.getElementById("search-gestion")?.value.toLowerCase() || '';
    const base = todosLosEstudiantes.filter(e =>
        e.programa.toLowerCase() === usuarioActual.grado_asignado.toLowerCase()
    );
    renderizarGestion(base.filter(e => e.nombre.toLowerCase().includes(busq)));
}

function actualizarKPIs(lista) {
    if (lista.length === 0) { ['stat-total','count-alto','stat-asis','stat-nota'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerText='0';}); return; }
    document.getElementById("stat-total").innerText  = lista.length;
    document.getElementById("count-alto").innerText  = lista.filter(e=>e.categoria==="Alto").length;
    const asis = lista.reduce((a,b)=>a+parseFloat(b.asistencia),0)/lista.length;
    const nota = lista.reduce((a,b)=>a+parseFloat(b.promedio),0)/lista.length;
    document.getElementById("stat-asis").innerText = `${asis.toFixed(0)}%`;
    document.getElementById("stat-nota").innerText = nota.toFixed(1);
}

function actualizarGraficas(lista) {
    const ctxRiesgo = document.getElementById('chartRiesgo')?.getContext('2d');
    const ctxProg   = document.getElementById('chartProgramas')?.getContext('2d');
    if (!ctxRiesgo || !ctxProg) return;
    const conteo = { Alto: lista.filter(e=>e.categoria==='Alto').length, Medio: lista.filter(e=>e.categoria==='Medio').length, Bajo: lista.filter(e=>e.categoria==='Bajo').length };
    if (graficoRiesgo)    graficoRiesgo.destroy();
    if (graficoProgramas) graficoProgramas.destroy();
    graficoRiesgo = new Chart(ctxRiesgo, {
        type: 'doughnut',
        data: { labels:['Alto','Medio','Bajo'], datasets:[{data:[conteo.Alto,conteo.Medio,conteo.Bajo],backgroundColor:['#e11d48','#f59e0b','#10b981'],borderWidth:0}] },
        options: { plugins:{legend:{position:'bottom'}}, cutout:'70%', maintainAspectRatio:false }
    });
    const progs    = [...new Set(lista.map(e=>e.programa))];
    const dataProgs = progs.map(p=>{ const sub=lista.filter(e=>e.programa===p); return (sub.reduce((a,b)=>a+parseFloat(b.promedio),0)/sub.length).toFixed(1); });
    graficoProgramas = new Chart(ctxProg, {
        type: 'bar',
        data: { labels:progs, datasets:[{label:'Promedio',data:dataProgs,backgroundColor:'#1e3a8a',borderRadius:8}] },
        options: { scales:{y:{max:5}}, plugins:{legend:{display:false}}, maintainAspectRatio:false }
    });
}

function renderizarTablaRiesgo(lista) {
    const cuerpo = document.querySelector("#tabla-estudiantes tbody"); if (!cuerpo) return;
    const totalPags = Math.max(1, Math.ceil(lista.length / FILAS_PAG));
    if (paginaActual > totalPags) paginaActual = totalPags;
    const inicio  = (paginaActual - 1) * FILAS_PAG;
    const pagina  = lista.slice(inicio, inicio + FILAS_PAG);

    cuerpo.innerHTML = "";
    pagina.forEach(est => {
        cuerpo.innerHTML += `<tr>
            <td><strong>${est.nombre}</strong></td>
            <td>${est.programa}</td>
            <td>${est.semestre}</td>
            <td>${parseFloat(est.promedio).toFixed(1)}</td>
            <td>${est.asistencia}%</td>
            <td class="${usuarioActual.rol!=='bienestar'?'hidden':''}">${est.estrato}</td>
            <td style="font-weight:bold">${(est.score*100).toFixed(0)}%</td>
            <td><span class="badge badge-${est.categoria.toLowerCase()}">${est.categoria}</span></td>
            <td>
                ${usuarioActual.rol === 'profesor' ? `<button class="btn-accion btn-editar btn-sm" onclick="abrirModalEditar(${est.id})">✏ Editar</button>` : ''}
                <button class="btn-accion btn-sm" style="background:#f1f5f9;color:#475569;margin-top:4px;" onclick="verFichaEstudiante(${est.id})">📄 Ficha</button>
            </td>
        </tr>`;
    });

    renderizarPaginacion(lista.length, totalPags);
}

function renderizarPaginacion(total, totalPags) {
    let contenedor = document.getElementById('paginacion-dashboard');
    if (!contenedor) {
        const tc = document.querySelector('.table-card');
        if (!tc) return;
        contenedor = document.createElement('div');
        contenedor.id = 'paginacion-dashboard';
        contenedor.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 0 0;flex-wrap:wrap;gap:8px;';
        tc.appendChild(contenedor);
    }
    const desde = Math.min((paginaActual - 1) * FILAS_PAG + 1, total);
    const hasta  = Math.min(paginaActual * FILAS_PAG, total);
    const btnStyle = (activo) => `padding:6px 12px;border-radius:8px;border:1px solid #e2e8f0;background:${activo?'var(--primary)':'white'};color:${activo?'white':'var(--text-muted)'};cursor:${activo?'default':'pointer'};font-weight:600;font-size:0.8rem;`;

    let botonesHTML = '';
    for (let i = 1; i <= totalPags; i++) {
        if (totalPags <= 7 || i === 1 || i === totalPags || Math.abs(i - paginaActual) <= 1) {
            botonesHTML += `<button style="${btnStyle(i===paginaActual)}" onclick="irPagina(${i})">${i}</button>`;
        } else if (Math.abs(i - paginaActual) === 2) {
            botonesHTML += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
        }
    }
    contenedor.innerHTML = `
        <span style="font-size:0.82rem;color:var(--text-muted);">Mostrando <b>${desde}–${hasta}</b> de <b>${total}</b> estudiantes</span>
        <div style="display:flex;gap:4px;align-items:center;">
            <button style="${btnStyle(false)}${paginaActual===1?'opacity:0.4;cursor:not-allowed;':''}" onclick="irPagina(${paginaActual-1})" ${paginaActual===1?'disabled':''}>‹ Ant</button>
            ${botonesHTML}
            <button style="${btnStyle(false)}${paginaActual===totalPags?'opacity:0.4;cursor:not-allowed;':''}" onclick="irPagina(${paginaActual+1})" ${paginaActual===totalPags?'disabled':''}>Sig ›</button>
        </div>`;
}

function irPagina(n) {
    const totalPags = Math.max(1, Math.ceil(listaFiltrada.length / FILAS_PAG));
    if (n < 1 || n > totalPags) return;
    paginaActual = n;
    renderizarTablaRiesgo(listaFiltrada);
}

function renderizarGestion(lista) {
    const cuerpo = document.querySelector("#tabla-gestion tbody"); if (!cuerpo) return;
    cuerpo.innerHTML = "";
    lista.forEach(est => {
        cuerpo.innerHTML += `<tr>
            <td><strong>${est.nombre}</strong></td>
            <td>${est.programa}</td>
            <td>${est.semestre}° sem.</td>
            <td>
                <button class="btn-accion btn-sm" style="background:#f1f5f9;color:#475569;" onclick="verFichaEstudiante(${est.id})">📄 Ficha</button>
            </td>
        </tr>`;
    });
}

// ════════════════════════════════════════════
//  SECCIÓN NAVEGACIÓN
// ════════════════════════════════════════════
function mostrarSeccion(tipo) {
    sessionStorage.setItem('isfi_seccion', tipo);
    cerrarSidebar();
    // Mapa explícito sección → id de elemento (evita la línea duplicada de section-dashboard)
    const mapaSecciones = {
        dashboard:      'section-dashboard',
        estudiantes:    'section-gestion',
        usuarios:       'section-usuarios',
        notificaciones: 'section-notificaciones',
        logs:           'section-logs'
    };
    Object.entries(mapaSecciones).forEach(([nombre, id]) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', tipo !== nombre);
    });
    ['nav-dash','nav-gest','nav-usuarios','nav-notif','nav-logs'].forEach(id => {
        const sec = id.replace('nav-','').replace('dash','dashboard').replace('gest','estudiantes').replace('usuarios','usuarios').replace('notif','notificaciones').replace('logs','logs');
        const el  = document.getElementById(id);
        if (el) el.classList.toggle('active', tipo === sec);
    });
    if (tipo === 'usuarios')       renderizarUsuarios();
    if (tipo === 'notificaciones') renderizarSeccionNotif();
    if (tipo === 'logs')           renderizarSeccionLogs();
    document.getElementById('notif-panel').classList.add('hidden');
}

// ════════════════════════════════════════════
//  CRUD ESTUDIANTES
// ════════════════════════════════════════════
async function guardarNuevoEstudiante() {
    const datos = {
        nombre:     document.getElementById('new-nombre').value.trim(),
        programa:   usuarioActual.grado_asignado,
        semestre:   document.getElementById('new-semestre').value,
        asistencia: document.getElementById('new-asistencia').value,
        promedio:   document.getElementById('new-promedio').value,
        estrato:    document.getElementById('new-estrato').value
    };
    // Validación cliente
    if (!datos.nombre) { mostrarToast('El nombre no puede estar vacío.', 'warning'); return; }
    const asist = parseFloat(datos.asistencia), prom = parseFloat(datos.promedio);
    const sem   = parseInt(datos.semestre),     estr = parseInt(datos.estrato);
    if (isNaN(asist)||asist<0||asist>100) { mostrarToast('La asistencia debe estar entre 0 y 100.', 'warning'); return; }
    if (isNaN(prom)||prom<0||prom>5)      { mostrarToast('El promedio debe estar entre 0.0 y 5.0.', 'warning'); return; }
    if (isNaN(sem)||sem<1||sem>12)         { mostrarToast('El semestre debe estar entre 1 y 12.', 'warning'); return; }
    if (isNaN(estr)||estr<1||estr>6)       { mostrarToast('El estrato debe estar entre 1 y 6.', 'warning'); return; }

    mostrarSpinner();
    try {
        const res = await apiFetch('/api/guardar_estudiante', { method:'POST', body: JSON.stringify(datos) });
        const json = await res.json();
        if (res.ok) {
            registrarLog('REGISTRO_ESTUDIANTE', `${usuarioActual.nombre} registró a "${datos.nombre}" en ${datos.programa}`);
            mostrarToast(`Estudiante "${datos.nombre}" registrado correctamente.`, 'success');
            document.getElementById('form-nuevo-estudiante').classList.add('hidden');
            // Limpiar campos
            ['new-nombre','new-semestre','new-asistencia','new-promedio','new-estrato'].forEach(id => document.getElementById(id).value = '');
            await cargarEstudiantes();
        } else {
            mostrarToast(json.error || 'Error al guardar el estudiante.', 'error');
        }
    } catch(e) {
        mostrarToast('No se pudo conectar al servidor.', 'error');
    } finally {
        ocultarSpinner();
    }
}

function eliminarEstudiante(id, nombre) {
    mostrarConfirmacion(
        `¿Estás seguro de que deseas eliminar a "${nombre}"? Esta acción no se puede deshacer.`,
        async () => {
            mostrarSpinner();
            try {
                const res  = await apiFetch('/api/eliminar_estudiante', { method:'POST', body: JSON.stringify({ id }) });
                const json = await res.json();
                if (res.ok) {
                    registrarLog('ELIMINACION_ESTUDIANTE', `${usuarioActual.nombre} eliminó al estudiante "${nombre}"`);
                    mostrarToast(`Estudiante "${nombre}" eliminado.`, 'success');
                    await cargarEstudiantes();
                } else {
                    mostrarToast(json.error || 'Error al eliminar.', 'error');
                }
            } catch(e) {
                mostrarToast('No se pudo conectar al servidor.', 'error');
            } finally {
                ocultarSpinner();
            }
        },
        'Eliminar',
        '#e11d48'
    );
}

// ════════════════════════════════════════════
//  MODAL EDITAR ESTUDIANTE
// ════════════════════════════════════════════
function abrirModalEditar(id) {
    const est = todosLosEstudiantes.find(e => e.id === id); if (!est) return;
    document.getElementById('edit-id').value        = est.id;
    document.getElementById('edit-nombre').textContent = est.nombre;
    document.getElementById('edit-programa').value  = est.programa;
    document.getElementById('edit-semestre').value  = est.semestre;
    document.getElementById('edit-promedio').value  = est.promedio;
    document.getElementById('edit-asistencia').value = est.asistencia;
    document.getElementById('edit-estrato').value   = est.estrato;
    document.getElementById('modal-editar-overlay').classList.remove('hidden');
}
function cerrarModalEditar() { document.getElementById('modal-editar-overlay').classList.add('hidden'); }

async function guardarEdicionEstudiante() {
    const id         = parseInt(document.getElementById('edit-id').value);
    const semestre   = document.getElementById('edit-semestre').value;
    const promedio   = document.getElementById('edit-promedio').value;
    const asistencia = document.getElementById('edit-asistencia').value;
    const estrato    = document.getElementById('edit-estrato').value;
    const nombre     = document.getElementById('edit-nombre').textContent;

    // Validación cliente
    const asist = parseFloat(asistencia), prom = parseFloat(promedio);
    const sem   = parseInt(semestre),     estr = parseInt(estrato);
    if (isNaN(asist)||asist<0||asist>100) { mostrarToast('Asistencia debe estar entre 0 y 100.', 'warning'); return; }
    if (isNaN(prom)||prom<0||prom>5)      { mostrarToast('Promedio debe estar entre 0.0 y 5.0.', 'warning'); return; }
    if (isNaN(sem)||sem<1||sem>12)         { mostrarToast('Semestre debe estar entre 1 y 12.', 'warning'); return; }
    if (isNaN(estr)||estr<1||estr>6)       { mostrarToast('Estrato debe estar entre 1 y 6.', 'warning'); return; }

    const btn = document.getElementById('btn-guardar-edicion');
    btn.disabled = true; btn.innerText = 'Guardando…';
    mostrarSpinner();
    try {
        const res  = await apiFetch('/api/actualizar_estudiante', { method:'POST', body: JSON.stringify({id,semestre,promedio,asistencia,estrato}) });
        const json = await res.json();
        if (res.ok) {
            registrarLog('EDICION_ESTUDIANTE', `${usuarioActual.nombre} editó a "${nombre}" (sem:${semestre}, prom:${promedio}, asist:${asistencia}%)`);
            mostrarToast(`Datos de "${nombre}" actualizados.`, 'success');
            cerrarModalEditar();
            await cargarEstudiantes();
        } else {
            mostrarToast(json.error || 'Error al guardar.', 'error');
        }
    } catch(e) {
        mostrarToast('No se pudo conectar al servidor.', 'error');
    } finally {
        btn.disabled = false; btn.innerText = 'Guardar Cambios';
        ocultarSpinner();
    }
}

// ════════════════════════════════════════════
//  USUARIOS
// ════════════════════════════════════════════
async function renderizarUsuarios() {
    mostrarSpinner();
    try {
        const res     = await apiFetch('/api/usuarios');
        const usuarios = await res.json();
        const cuerpo  = document.querySelector("#tabla-usuarios tbody"); if (!cuerpo) return;
        cuerpo.innerHTML = "";
        usuarios.forEach(u => {
            cuerpo.innerHTML += `<tr>
                <td>${u.usuario}</td><td>${u.nombre}</td>
                <td><span class="badge badge-bajo">${u.rol}</span></td>
                <td>${u.grado_asignado}</td>
            </tr>`;
        });
    } catch(e) {
        mostrarToast('Error al cargar usuarios.', 'error');
    } finally {
        ocultarSpinner();
    }
}

async function guardarNuevoUsuario() {
    const datos = {
        usuario:         document.getElementById('u-user').value.trim(),
        clave:           document.getElementById('u-pass').value,
        nombre:          document.getElementById('u-nombre').value.trim(),
        rol:             document.getElementById('u-rol').value,
        grado_asignado:  document.getElementById('u-grado').value.trim()
    };
    if (!datos.usuario || !datos.clave || !datos.nombre) { mostrarToast('Completa todos los campos obligatorios.', 'warning'); return; }
    mostrarSpinner();
    try {
        const res  = await apiFetch('/api/guardar_usuario', { method:'POST', body: JSON.stringify(datos) });
        const json = await res.json();
        if (res.ok) {
            registrarLog('REGISTRO_USUARIO', `${usuarioActual.nombre} creó el usuario "${datos.usuario}" con rol ${datos.rol}`);
            mostrarToast(`Usuario "${datos.usuario}" creado correctamente.`, 'success');
            document.getElementById('form-nuevo-usuario').classList.add('hidden');
            ['u-user','u-pass','u-nombre','u-grado'].forEach(id => document.getElementById(id).value = '');
            await renderizarUsuarios();
        } else {
            mostrarToast(json.error || 'Error al crear el usuario.', 'error');
        }
    } catch(e) {
        mostrarToast('No se pudo conectar al servidor.', 'error');
    } finally {
        ocultarSpinner();
    }
}

// ════════════════════════════════════════════
//  EXPORTAR TABLA DE ESTUDIANTES
// ════════════════════════════════════════════
function exportarEstudiantes() {
    if (todosLosEstudiantes.length === 0) { mostrarToast('No hay datos para exportar.', 'warning'); return; }
    const header = 'ID,Nombre,Programa,Semestre,Asistencia,Promedio,Estrato,Score,Riesgo\n';
    const rows   = todosLosEstudiantes.map(e =>
        `${e.id},"${e.nombre}","${e.programa}",${e.semestre},${e.asistencia},${e.promedio},${e.estrato},${e.score},"${e.categoria}"`
    ).join('\n');
    const blob   = new Blob(['\uFEFF'+header+rows], { type:'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a'); a.href=url; a.download=`estudiantes_isfi_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    mostrarToast('Tabla exportada correctamente.', 'success');
}

// ════════════════════════════════════════════
//  MODO OSCURO
// ════════════════════════════════════════════
function toggleModoOscuro() {
    modoOscuro = !modoOscuro;
    document.body.classList.toggle('dark-mode', modoOscuro);
    localStorage.setItem('isfi_dark', modoOscuro ? '1' : '0');
    const btn = document.getElementById('btn-dark-mode');
    if (btn) btn.title = modoOscuro ? 'Modo claro' : 'Modo oscuro';
    if (btn) btn.innerHTML = modoOscuro
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

// ════════════════════════════════════════════
//  FICHA PDF DE ESTUDIANTE
// ════════════════════════════════════════════
function verFichaEstudiante(id) {
    const est = todosLosEstudiantes.find(e => e.id === id); if (!est) return;
    const score = (est.score * 100).toFixed(0);
    const colorRiesgo = est.categoria === 'Alto' ? '#e11d48' : est.categoria === 'Medio' ? '#f59e0b' : '#10b981';
    const fecha = new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });
    const recomendacion = est.categoria === 'Alto'
        ? 'Intervención urgente recomendada. Contactar al estudiante y activar protocolo de acompañamiento institucional.'
        : est.categoria === 'Medio'
        ? 'Seguimiento periódico. Programar reunión con el tutor asignado para identificar factores de riesgo.'
        : 'Estudiante dentro de parámetros normales. Continuar monitoreo rutinario.';

    const ventana = window.open('', '_blank', 'width=700,height=900');
    ventana.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>Ficha – ${est.nombre}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; padding: 32px; }
        .header { background: #1e3a8a; color: white; padding: 28px 32px; border-radius: 12px 12px 0 0; display:flex; justify-content:space-between; align-items:center; }
        .header h1 { font-size: 1.3rem; }
        .header p  { font-size: 0.8rem; opacity: 0.8; margin-top: 4px; }
        .header .badge-riesgo { background: ${colorRiesgo}; color:white; padding:6px 18px; border-radius:20px; font-weight:800; font-size:0.9rem; }
        .card { background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; }
        .score-bar-wrap { margin: 20px 0; }
        .score-label { display:flex; justify-content:space-between; font-size:0.82rem; font-weight:700; margin-bottom:6px; color:#64748b; }
        .score-bar { height: 12px; background: #f1f5f9; border-radius: 6px; overflow:hidden; }
        .score-fill { height: 100%; background: ${colorRiesgo}; border-radius: 6px; width: ${score}%; transition: width 0.5s; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
        .kpi { background: #f8fafc; padding: 16px; border-radius: 10px; border-left: 4px solid #1e3a8a; }
        .kpi small { font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase; display:block; }
        .kpi strong { font-size: 1.4rem; font-weight: 800; color: #1e293b; }
        .recomendacion { background: ${est.categoria==='Alto'?'#fef2f2':est.categoria==='Medio'?'#fffbeb':'#f0fdf4'}; border: 1px solid ${colorRiesgo}; border-radius: 10px; padding: 16px 20px; margin-top: 20px; }
        .recomendacion p { font-size: 0.88rem; line-height: 1.6; color: #1e293b; }
        .footer { margin-top: 28px; text-align:center; font-size:0.75rem; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:16px; }
        .btn-print { display:block; margin: 20px auto 0; padding:12px 32px; background:#1e3a8a; color:white; border:none; border-radius:8px; font-weight:700; font-size:0.9rem; cursor:pointer; }
        @media print { .btn-print { display:none; } body { background:white; padding:16px; } }
    </style></head><body>
    <div class="header">
        <div>
            <h1>📋 Ficha Estudiantil — ISFI Analytics</h1>
            <p>Generada el ${fecha} · Modelo Predictivo de Deserción v1.0</p>
        </div>
        <span class="badge-riesgo">Riesgo ${est.categoria}</span>
    </div>
    <div class="card">
        <h2 style="font-size:1.5rem;margin-bottom:4px;">${est.nombre}</h2>
        <p style="color:#64748b;font-size:0.9rem;">${est.programa} · Semestre ${est.semestre} · Estrato ${est.estrato}</p>
        <div class="score-bar-wrap">
            <div class="score-label"><span>Score de Deserción</span><span>${score}%</span></div>
            <div class="score-bar"><div class="score-fill"></div></div>
        </div>
        <div class="grid">
            <div class="kpi"><small>Asistencia</small><strong>${est.asistencia}%</strong></div>
            <div class="kpi"><small>Promedio Académico</small><strong>${parseFloat(est.promedio).toFixed(1)} / 5.0</strong></div>
            <div class="kpi"><small>Semestre Actual</small><strong>${est.semestre}°</strong></div>
            <div class="kpi"><small>Estrato Socioeconómico</small><strong>${est.estrato}</strong></div>
        </div>
        <div class="recomendacion">
            <p><strong>📌 Recomendación institucional:</strong><br>${recomendacion}</p>
        </div>
        <div class="footer">ISFI Analytics · Sistema de Alertas Tempranas · Documento generado automáticamente</div>
        <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar como PDF</button>
    </div>
    </body></html>`);
    ventana.document.close();
}

// ════════════════════════════════════════════
//  POBLAR FILTRO ESTRATO (Bienestar)
// ════════════════════════════════════════════
function poblarFiltroEstrato() {
    const selector = document.getElementById("filter-estrato");
    if (!selector) return;
    selector.innerHTML = '<option value="">Todos los Estratos</option>';
    for (let i = 1; i <= 6; i++) {
        const o = document.createElement("option");
        o.value = i; o.textContent = `Estrato ${i}`;
        selector.appendChild(o);
    }
}
function mostrarFormulario()       { document.getElementById('form-nuevo-estudiante').classList.toggle('hidden'); }
function mostrarFormularioUsuario(){ document.getElementById('form-nuevo-usuario').classList.toggle('hidden'); }

// ════════════════════════════════════════════
//  SIDEBAR MÓVIL
// ════════════════════════════════════════════
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('visible');
}
function cerrarSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('visible');
}

// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════
window.onload = async () => {
    // Restaurar modo oscuro
    if (localStorage.getItem('isfi_dark') === '1') toggleModoOscuro();

    // Cerrar modal al hacer click fuera
    document.getElementById('modal-editar-overlay').addEventListener('click', function(e) {
        if (e.target === this) cerrarModalEditar();
    });

    // Restaurar sesión si existe
    const sesionGuardada = sessionStorage.getItem('isfi_session');
    const tokenGuardado  = sessionStorage.getItem('isfi_token');
    if (sesionGuardada && tokenGuardado) {
        usuarioActual = JSON.parse(sesionGuardada);
        sessionToken  = tokenGuardado;
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("main-dashboard").classList.remove("hidden");
        configurarDashboard();
        await cargarEstudiantes();
        const seccionGuardada = sessionStorage.getItem('isfi_seccion') || 'dashboard';
        mostrarSeccion(seccionGuardada);
    } else {
        // Pre-cargar para el filtro de programas en login (opcional)
    }
};