// app.js — Router principal
const pages = {
  dashboard: { render: renderDashboard,  title: 'Dashboard' },
  productos: { render: renderProductos,  title: 'Productos' },
  clientes:  { render: renderClientes,   title: 'Clientes' },
  ventas:    { render: renderVentas,     title: 'Ventas' },
  reportes:  { render: renderReportes,   title: 'Reportes' },
};

let currentPage = 'dashboard';

function navigateTo(name) {
  if (!pages[name]) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  document.querySelector(`[data-page="${name}"]`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent = pages[name].title;
  currentPage = name;
  pages[name].render();
  document.getElementById('sidebar').classList.remove('open');
}

// Navegación por click en sidebar
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.page));
});

// Botón menú mobile
document.getElementById('menuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// FIX #8: cerrar modal — primer click muestra aviso si hay cambios, segundo cierra de verdad
let _closeAttempts = 0;
function handleModalClose() {
  const notice = document.getElementById('modalDirtyNotice');
  if (_modalDirty) {
    _closeAttempts++;
    if (_closeAttempts >= 2) {
      _closeAttempts = 0;
      _modalDirty = false;
      document.getElementById('modalOverlay').classList.remove('open');
    } else {
      notice.classList.add('visible');
      setTimeout(() => notice.classList.remove('visible'), 3000);
    }
  } else {
    _closeAttempts = 0;
    _modalDirty = false;
    document.getElementById('modalOverlay').classList.remove('open');
  }
}

document.getElementById('modalClose').addEventListener('click', handleModalClose);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) handleModalClose();
});

// Cerrar sidebar al hacer click fuera en mobile
document.getElementById('main').addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
});

// FIX #12: inicializar tema guardado
initTheme();

// Iniciar en dashboard
navigateTo('dashboard');