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
  // Ocultar páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  // Mostrar página seleccionada
  document.getElementById(`page-${name}`).classList.add('active');
  document.querySelector(`[data-page="${name}"]`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent = pages[name].title;
  currentPage = name;
  pages[name].render();
  // Cerrar sidebar en mobile
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

// Cerrar modal
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// Cerrar sidebar al hacer click fuera en mobile
document.getElementById('main').addEventListener('click', () => {
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
});

// Iniciar en dashboard
navigateTo('dashboard');
