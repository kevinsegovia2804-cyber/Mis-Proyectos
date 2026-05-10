// ========================
// 1. DEFINICIÓN DE SISTEMAS
// ========================
const sistemas = [
  { id: 's1', num: '01', tag: 'SISTEMA FRANCES', nombre: 'Sistema Frances (Cuota Constante)', desc: 'La cuota es constante. El interés baja y la amortización sube.', params: ['P','i','n'], hasSpecial: false, calcular: calcFrances },
  { id: 's2', num: '02', tag: 'SISTEMA ALEMAN', nombre: 'Sistema Aleman (Amortización Constante)', desc: 'La amortización es fija. Las cuotas son decrecientes.', params: ['P','i','n'], hasSpecial: false, calcular: calcAleman },
  { id: 's3', num: '03', tag: 'SISTEMA AMERICANO', nombre: 'Sistema Americano (Bullet)', desc: 'Intereses periódicos y capital al final.', params: ['P','i','n'], hasSpecial: false, calcular: calcAmericano },
  { id: 's4', num: '04', tag: 'GRADIENTE ARIT. CREC.', nombre: 'Gradiente Aritmético Creciente', desc: 'La cuota aumenta una cantidad fija G cada mes.', params: ['P','i','n'], hasSpecial: true, specialParams: [{key:'G', label:'Gradiente G ($)', default:100}], calcular: calcGradienteAritCreciente },
  { id: 's5', num: '05', tag: 'GRADIENTE ARIT. DECR.', nombre: 'Gradiente Aritmético Decreciente', desc: 'La cuota disminuye una cantidad fija G cada mes.', params: ['P','i','n'], hasSpecial: true, specialParams: [{key:'G', label:'Gradiente G ($)', default:100}], calcular: calcGradienteAritDecreciente },
  { id: 's6', num: '06', tag: 'GRADIENTE GEOM. CREC.', nombre: 'Gradiente Geométrico Creciente', desc: 'La cuota crece un porcentaje g cada mes.', params: ['P','i','n'], hasSpecial: true, specialParams: [{key:'g', label:'Crecimiento g (%)', default:2}], calcular: calcGradienteGeomCreciente },
  { id: 's7', num: '07', tag: 'GRADIENTE GEOM. DECR.', nombre: 'Gradiente Geométrico Decreciente', desc: 'La cuota decrece un porcentaje g cada mes.', params: ['P','i','n'], hasSpecial: true, specialParams: [{key:'g', label:'Decrecimiento g (%)', default:2}], calcular: calcGradienteGeomDecreciente },
  { id: 's8', num: '08', tag: 'GRACIA TOTAL', nombre: 'Periodo de Gracia Total', desc: 'No hay pagos en meses m, el interés se suma al capital.', params: ['P','i','n'], hasSpecial: true, specialParams: [{key:'m', label:'Meses Gracia', default:3}], calcular: calcGraciaTotal },
  { id: 's9', num: '09', tag: 'GRACIA PARCIAL', nombre: 'Periodo de Gracia Parcial', desc: 'Solo se pagan intereses en meses m.', params: ['P','i','n'], hasSpecial: true, specialParams: [{key:'m', label:'Meses Gracia', default:3}], calcular: calcGraciaParcial },
  { id: 's10', num: '10', tag: 'AMORT. CONSTANTE', nombre: 'Amortización Constante', desc: 'Variante técnica del sistema alemán.', params: ['P','i','n'], hasSpecial: false, calcular: calcAleman },
  { id: 's11', num: '11', tag: 'TASA VARIABLE', nombre: 'Tasa Variable', desc: 'La tasa cambia después de n1 periodos.', params: ['P','i','n'], hasSpecial: true, specialParams: [{key:'n1', label:'Mes Cambio', default:6},{key:'i2', label:'Tasa 2 (%)', default:2}], calcular: calcTasaVariable },
  { id: 's12', num: '12', tag: 'CAPITALIZACIÓN', nombre: 'Capitalización de Intereses', desc: 'Un solo pago al final (Monto Compuesto).', params: ['P','i','n'], hasSpecial: false, calcular: calcCapitalizacion },
  { id: 's13', num: '13', tag: 'CUOTA EXTRA', nombre: 'Cuotas Extraordinarias', desc: 'Pago adicional en el mes ke.', params: ['P','i','n'], hasSpecial: true, specialParams: [{key:'ke', label:'Mes Extra', default:6},{key:'CE', label:'Monto Extra', default:2000}], calcular: calcCuotasExtraordinarias },
  { id: 's14', num: '14', tag: 'ANTICIPADO', nombre: 'Sistema Anticipado', desc: 'Las cuotas se pagan al inicio de cada mes.', params: ['P','i','n'], hasSpecial: false, calcular: calcAnticipado }
];

// ========================
// 2. FUNCIONES DE CÁLCULO
// ========================
function fmt(n) { return (isNaN(n) || !isFinite(n)) ? '0.00' : n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}); }

function getParams(id) {
  const P = parseFloat(document.getElementById(id + '_P')?.value || 10000);
  const i = parseFloat(document.getElementById(id + '_i')?.value || 1) / 100;
  const n = parseInt(document.getElementById(id + '_n')?.value || 12);
  return { P, i, n };
}

function getSpecialParam(id, key, def = 0) {
  const el = document.getElementById(id + '_' + key);
  return el ? parseFloat(el.value) : def;
}

// Motores de cálculo
function calcFrances(P, i, n) {
  const C = P * i / (1 - Math.pow(1 + i, -n));
  let rows = [], saldo = P;
  for (let k = 1; k <= n; k++) {
    const I = saldo * i; const A = C - I; saldo -= A;
    rows.push([k, C, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcAleman(P, i, n) {
  const A = P / n;
  let rows = [], saldo = P;
  for (let k = 1; k <= n; k++) {
    const I = saldo * i; const C = A + I; saldo -= A;
    rows.push([k, C, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcAmericano(P, i, n) {
  let rows = [];
  for (let k = 1; k <= n; k++) {
    const I = P * i; const A = (k === n) ? P : 0; const C = I + A;
    rows.push([k, C, I, A, (k === n ? 0 : P)]);
  }
  return { rows };
}

function calcGradienteAritCreciente(P, i, n, sp) {
  const G = sp.G || 100;
  const an = (1 - Math.pow(1 + i, -n)) / i;
  const Ga = (an - n * Math.pow(1 + i, -n)) / i;
  const C1 = (P - G * Ga) / an;
  let rows = [], saldo = P;
  for (let k = 1; k <= n; k++) {
    const Ck = C1 + (k - 1) * G;
    const I = saldo * i; const A = Ck - I; saldo -= A;
    rows.push([k, Ck, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcGradienteAritDecreciente(P, i, n, sp) {
  const G = sp.G || 100;
  const an = (1 - Math.pow(1 + i, -n)) / i;
  const Ga = (an - n * Math.pow(1 + i, -n)) / i;
  const C1 = (P + G * Ga) / an;
  let rows = [], saldo = P;
  for (let k = 1; k <= n; k++) {
    const Ck = C1 - (k - 1) * G;
    const I = saldo * i; const A = Ck - I; saldo -= A;
    rows.push([k, Ck, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcGradienteGeomCreciente(P, i, n, sp) {
  const g = (sp.g || 2) / 100;
  let C1 = (Math.abs(g - i) < 1e-10) ? P * i / (n * Math.pow(1 + i, 1 - n)) : P * (i - g) / (1 - Math.pow((1 + g) / (1 + i), n));
  let rows = [], saldo = P;
  for (let k = 1; k <= n; k++) {
    const Ck = C1 * Math.pow(1 + g, k - 1);
    const I = saldo * i; const A = Ck - I; saldo -= A;
    rows.push([k, Ck, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcGradienteGeomDecreciente(P, i, n, sp) {
  const g = (sp.g || 2) / -100;
  let C1 = P * (i - g) / (1 - Math.pow((1 + g) / (1 + i), n));
  let rows = [], saldo = P;
  for (let k = 1; k <= n; k++) {
    const Ck = C1 * Math.pow(1 + g, k - 1);
    const I = saldo * i; const A = Ck - I; saldo -= A;
    rows.push([k, Ck, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcGraciaTotal(P, i, n, sp) {
  const m = parseInt(sp.m) || 3;
  let rows = [], saldo = P;
  for (let k = 1; k <= m; k++) {
    const I = saldo * i; saldo += I;
    rows.push([k, 0, I, 0, saldo, 'GRACIA TOTAL']);
  }
  const C = saldo * i / (1 - Math.pow(1 + i, -n));
  for (let k = 1; k <= n; k++) {
    const I = saldo * i; const A = C - I; saldo -= A;
    rows.push([m + k, C, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcGraciaParcial(P, i, n, sp) {
  const m = parseInt(sp.m) || 3;
  let rows = [], saldo = P;
  for (let k = 1; k <= m; k++) {
    const I = saldo * i;
    rows.push([k, I, I, 0, saldo, 'GRACIA PARCIAL']);
  }
  const C = P * i / (1 - Math.pow(1 + i, -n));
  for (let k = 1; k <= n; k++) {
    const I = saldo * i; const A = C - I; saldo -= A;
    rows.push([m + k, C, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcTasaVariable(P, i, n, sp) {
  const n1 = parseInt(sp.n1) || 6;
  const i2 = (sp.i2 || 2) / 100;
  let rows = [], saldo = P;
  const C1 = P * i / (1 - Math.pow(1 + i, -n));
  for (let k = 1; k <= n1; k++) {
    const I = saldo * i; const A = C1 - I; saldo -= A;
    rows.push([k, C1, I, A, Math.max(0, saldo)]);
  }
  const C2 = saldo * i2 / (1 - Math.pow(1 + i2, -(n - n1)));
  for (let k = 1; k <= (n - n1); k++) {
    const I = saldo * i2; const A = C2 - I; saldo -= A;
    rows.push([n1 + k, C2, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

function calcCapitalizacion(P, i, n) {
  let rows = [], saldo = P;
  for (let k = 1; k <= n; k++) {
    const I = saldo * i;
    const C = (k === n) ? saldo + I : 0;
    const A = (k === n) ? saldo : 0;
    saldo += I;
    rows.push([k, C, I, A, (k === n ? 0 : saldo)]);
  }
  return { rows };
}

function calcCuotasExtraordinarias(P, i, n, sp) {
  const ke = sp.ke || 6;
  const CE = sp.CE || 2000;
  let rows = [], saldo = P;
  let cuotaNormal = P * i / (1 - Math.pow(1 + i, -n));
  for (let k = 1; k <= n; k++) {
    const I = saldo * i;
    let cuotaEfectiva = cuotaNormal;
    if (k === ke) cuotaEfectiva += CE;
    const A = cuotaEfectiva - I;
    saldo -= A;
    rows.push([k, cuotaEfectiva, I, A, Math.max(0, saldo), (k === ke ? 'EXTRA' : '')]);
    if (k === ke && saldo > 0) cuotaNormal = saldo * i / (1 - Math.pow(1 + i, -(n - k)));
  }
  return { rows };
}

function calcAnticipado(P, i, n) {
  const C = (P * i) / ((1 + i) * (1 - Math.pow(1 + i, -n)));
  let rows = [], saldo = P;
  for (let k = 1; k <= n; k++) {
    const I = (saldo - C) * i;
    const A = C;
    saldo = saldo - C - I;
    rows.push([k, C, I, A, Math.max(0, saldo)]);
  }
  return { rows };
}

// ==========================================
// 3. EXPORTACIÓN EXCEL CORREGIDA
// ==========================================
function buildWorksheetWithFormulas(s, result, P, i, n, sp) {
  const { rows } = result;
  const startRow = 12; 
  const endRow = startRow + rows.length - 1;

  let data = [
    [s.nombre.toUpperCase()],
    ["Capital Prestado (P):", P, "Tasa (%):", i * 100, "Periodos (n):", n],
    [],
    ["RESUMEN DE OPERACIÓN"],
    ["Total Intereses:", 0], 
    ["Total Pagado:", 0],    
    ["Costo Financiero:", 0],                               
    [],
    ["TABLA DE AMORTIZACIÓN"],
    ["Periodo", "Cuota Total", "Interés", "Amortización", "Saldo", "Nota"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Formateo de parámetros superiores
  ws['B2'] = { v: P, t: 'n', z: '"$"#,##0.00' };
  ws['D2'] = { v: i * 100, t: 'n', z: '0.00"%"' };
  ws['F2'] = { v: n, t: 'n' };

  // Fórmulas de Resumen
  ws['B5'] = { f: `SUM(C${startRow + 1}:C${endRow + 1})`, t: 'n', z: '"$"#,##0.00' };
  ws['B6'] = { f: `SUM(B${startRow + 1}:B${endRow + 1})`, t: 'n', z: '"$"#,##0.00' };
  ws['B7'] = { f: `B5/B2`, t: 'n', z: '0.00%' };

  // Llenado de filas de la tabla
  rows.forEach((r, idx) => {
    let cur = startRow + idx + 1;
    let prevRef = (idx === 0) ? "$B$2" : `E${cur - 1}`;
    
    ws[`A${cur}`] = { v: r[0], t: 'n' };
    
    // Fórmulas para Cuota (B), Interés (C), Amortización (D) y Saldo (E)
    if (s.id === 's1') {
        ws[`B${cur}`] = { f: `PMT($D$2/100, $F$2, -$B$2)`, t: 'n', z: '"$"#,##0.00' };
    } else if (s.id === 's2' || s.id === 's10') {
        ws[`B${cur}`] = { f: `($B$2/$F$2) + C${cur}`, t: 'n', z: '"$"#,##0.00' };
    } else if (s.id === 's3') {
        ws[`B${cur}`] = { f: `IF(A${cur}=$F$2, $B$2 + C${cur}, C${cur})`, t: 'n', z: '"$"#,##0.00' };
    } else {
        ws[`B${cur}`] = { v: r[1], t: 'n', z: '"$"#,##0.00' };
    }

    ws[`C${cur}`] = { f: `${prevRef}*($D$2/100)`, t: 'n', z: '"$"#,##0.00' };
    ws[`D${cur}`] = { f: `B${cur}-C${cur}`, t: 'n', z: '"$"#,##0.00' };
    ws[`E${cur}`] = { f: `MAX(0, ${prevRef}-D${cur})`, t: 'n', z: '"$"#,##0.00' };
    
    if (r[5]) ws[`F${cur}`] = { v: r[5], t: 's' };
  });

  // CRÍTICO: Definir el rango para que Excel no abra el archivo vacío
  ws['!ref'] = XLSX.utils.encode_range({s: {c:0, r:0}, e: {c:5, r:endRow}});
  ws['!cols'] = [{wch:10}, {wch:18}, {wch:18}, {wch:18}, {wch:18}, {wch:20}];
  return ws;
}

// ========================
// 4. INTERFAZ Y EVENTOS
// ========================
function renderOverview() {
  const grid = document.getElementById('overviewGrid');
  if(!grid) return;
  grid.innerHTML = sistemas.map(s => `
    <div class="overview-card" onclick="goToSistema('${s.id}')">
      <div class="oc-num">${s.num}</div>
      <div class="oc-name">${s.nombre}</div>
      <div class="oc-desc">${s.desc}</div>
    </div>
  `).join('');
}

function goToSistema(id) {
  const btn = document.querySelector(`[onclick*="showTab('${id}'"]`);
  if (btn) btn.click();
}

function renderSistema(s) {
  const cont = document.getElementById('content-' + s.id);
  const specials = s.hasSpecial ? `
    <div class="special-params" style="margin-top:15px; background: rgba(0,212,170,0.05); padding: 15px; border-radius: 8px;">
      ${s.specialParams.map(p => `
        <div class="param-group">
          <label>${p.label}</label>
          <input type="number" id="${s.id}_${p.key}" value="${p.default}" step="any" oninput="recalcSistema('${s.id}')"/>
        </div>
      `).join('')}
    </div>` : '';

  cont.innerHTML = `
    <div class="params-card">
      <div class="params-grid">
        <div class="param-group"><label>Capital (P)</label><input type="number" id="${s.id}_P" value="20000" oninput="recalcSistema('${s.id}')"/></div>
        <div class="param-group"><label>Tasa Periódica % (i)</label><input type="number" id="${s.id}_i" value="1.5" step="0.01" oninput="recalcSistema('${s.id}')"/></div>
        <div class="param-group"><label>Periodos (n)</label><input type="number" id="${s.id}_n" value="12" oninput="recalcSistema('${s.id}')"/></div>
      </div>
      ${specials}
      <button class="btn btn-excel" style="margin-top:20px; width:100%; background:#10b981;" onclick="exportarExcel('${s.id}')">Descargar Excel con Fórmulas</button>
    </div>
    <div id="table-${s.id}"></div>
  `;
  recalcSistema(s.id);
}

function recalcSistema(id) {
  const s = sistemas.find(x => x.id === id);
  const { P, i, n } = getParams(id);
  const sp = {};
  if (s.hasSpecial) s.specialParams.forEach(p => { sp[p.key] = getSpecialParam(id, p.key, p.default); });
  const result = s.calcular(P, i, n, sp);
  renderTable(id, s, result, P);
}

function renderTable(id, s, result, P) {
  const { rows } = result;
  document.getElementById('table-' + id).innerHTML = `
    <div class="table-wrapper">
      <table style="width:100%; border-collapse:collapse;">
        <thead><tr><th>#</th><th>Cuota</th><th>Interés</th><th>Amortización</th><th>Saldo</th><th>Nota</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr><td>${r[0]}</td><td>${fmt(r[1])}</td><td>${fmt(r[2])}</td><td>${fmt(r[3])}</td><td style="font-weight:bold;">${fmt(r[4])}</td><td>${r[5]||''}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function exportarExcel(id) {
  const s = sistemas.find(x => x.id === id);
  const { P, i, n } = getParams(id);
  const sp = {};
  if (s.hasSpecial) s.specialParams.forEach(p => { sp[p.key] = getSpecialParam(id, p.key, p.default); });
  const result = s.calcular(P, i, n, sp);
  const wb = XLSX.utils.book_new();
  const ws = buildWorksheetWithFormulas(s, result, P, i, n, sp);
  XLSX.utils.book_append_sheet(wb, ws, "Amortizacion");
  XLSX.writeFile(wb, `Amortizacion_${s.num}.xlsx`);
}

function exportarTodosExcel() {
  const wb = XLSX.utils.book_new();
  sistemas.forEach(s => {
    const { P, i, n } = getParams(s.id);
    const sp = {};
    if (s.hasSpecial) s.specialParams.forEach(p => { sp[p.key] = getSpecialParam(s.id, p.key, p.default); });
    const result = s.calcular(P, i, n, sp);
    const ws = buildWorksheetWithFormulas(s, result, P, i, n, sp);
    XLSX.utils.book_append_sheet(wb, ws, `S${s.num}`);
  });
  XLSX.writeFile(wb, "Sistemas_Completos.xlsx");
}

function showTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
  const cont = document.getElementById('content-' + id);
  if (cont && !cont.dataset.rendered) {
    const s = sistemas.find(x => x.id === id);
    if (s) renderSistema(s);
    cont.dataset.rendered = '1';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderOverview();
  const first = document.querySelector('.tab-btn');
  if (first) first.click();
});