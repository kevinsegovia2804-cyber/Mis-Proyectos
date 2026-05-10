# LicenseVault — Sistema de Venta de Licencias de Software y SaaS

Plataforma web para gestionar inventario y distribución digital de licencias de software.
Desarrollado con **Python (Flask)**, **MongoDB** y **HTML/CSS/JS**.

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Python      | 3.9+          |
| MongoDB     | 6.0+          |
| mongosh     | 1.0+          |
| pip         | 23+           |

---

## Instalación paso a paso

### 1. Clonar / descomprimir el proyecto

```bash
cd licencias-saas
```

### 2. Instalar dependencias Python

```bash
pip install -r backend/requirements.txt
```

### 3. Iniciar MongoDB

```bash
# En Linux / macOS
sudo systemctl start mongod
# o
mongod --dbpath /data/db

# En Windows (si está como servicio)
net start MongoDB
```

### 4. Poblar la base de datos (seed)

```bash
# Genera +1000 documentos en cada colección
python seed/seed.py
```

### 5. Iniciar el servidor

```bash
python start.py
```

Abrir navegador en: **http://localhost:5000**

---

## Estructura del proyecto

```
licencias-saas/
├── backend/
│   ├── app.py            ← API REST Flask + Rutas aggregate
│   └── requirements.txt
├── frontend/
│   ├── index.html        ← SPA principal
│   └── static/
│       ├── css/
│       │   └── style.css
│       └── js/
│           ├── api.js        ← Capa de comunicación
│           ├── app.js        ← Router SPA
│           ├── dashboard.js  ← Módulo dashboard
│           ├── productos.js  ← CRUD productos
│           ├── clientes.js   ← CRUD clientes
│           ├── ventas.js     ← CRUD ventas
│           └── reportes.js   ← Visualización aggregates
├── seed/
│   └── seed.py           ← Generador de datos (1000+ docs/col)
├── start.py              ← Arranque integrado
└── README.md
```

---

## Colecciones MongoDB

### `productos`
```json
{
  "_id": ObjectId,
  "nombre": "Windows 11 Pro",
  "categoria": "Sistema Operativo",
  "descripcion": "...",
  "precio": 180.00,
  "stock": 95,
  "licencias_disponibles": ["LIC-XXXXX-...", ...],   // ARRAY EMBEBIDO
  "activo": true,
  "valoracion_promedio": 4.7,
  "etiquetas": ["popular", "bestseller"],
  "creado_en": ISODate
}
```

### `clientes`
```json
{
  "_id": ObjectId,
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "telefono": "+57 300 123 4567",
  "pais": "Colombia",
  "historial_compras": [               // ARRAY EMBEBIDO (documento)
    {
      "venta_id": ObjectId,            // REFERENCIA
      "producto": "Windows 11 Pro",
      "total": 180.00,
      "fecha": ISODate
    }
  ],
  "creado_en": ISODate
}
```

### `ventas`
```json
{
  "_id": ObjectId,
  "producto_id": ObjectId,             // REFERENCIA → productos
  "producto_nombre": "Windows 11 Pro",
  "cliente_id": ObjectId,              // REFERENCIA → clientes
  "cantidad": 2,
  "precio_unitario": 180.00,
  "total": 360.00,
  "claves_entregadas": ["LIC-...", "LIC-..."],  // ARRAY EMBEBIDO
  "estado": "completada",
  "metodo_pago": "tarjeta",
  "fecha": ISODate
}
```

---

## Índices definidos

```js
// productos
db.productos.createIndex({ "categoria": 1 })
db.productos.createIndex({ "nombre": 1 })
db.productos.createIndex({ "stock": 1 })

// clientes
db.clientes.createIndex({ "email": 1 }, { unique: true })
db.clientes.createIndex({ "pais": 1 })

// ventas
db.ventas.createIndex({ "fecha": -1 })
db.ventas.createIndex({ "producto_id": 1 })
db.ventas.createIndex({ "cliente_id": 1 })
```

---

## Consultas Aggregate (Requisito crítico)

### 1. Ventas totales por categoría de producto
Operadores: `$match` → `$lookup` → `$unwind` → `$group` → `$sort` → `$project`

```js
db.ventas.aggregate([
  { $match: { estado: "completada" } },
  { $lookup: {
      from: "productos",
      localField: "producto_id",
      foreignField: "_id",
      as: "producto_info"
  }},
  { $unwind: "$producto_info" },
  { $group: {
      _id: "$producto_info.categoria",
      total_ingresos: { $sum: "$total" },
      total_ventas:   { $sum: "$cantidad" },
      num_transacciones: { $sum: 1 }
  }},
  { $sort: { total_ingresos: -1 } },
  { $project: {
      categoria: "$_id", total_ingresos: 1,
      total_ventas: 1, num_transacciones: 1, _id: 0
  }}
])
```

### 2. Top 5 productos más vendidos
Operadores: `$match` → `$group` → `$sort` → `$limit` → `$project`

### 3. Ingresos por mes (análisis temporal)
Operadores: `$match` → `$group` (con `$year` / `$month`) → `$sort` → `$project`

### 4. Top 10 clientes con mayor gasto (JOIN)
Operadores: `$match` → `$group` → `$sort` → `$limit` → `$lookup` → `$unwind` → `$project`

---

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET    | `/api/productos` | Listar productos |
| POST   | `/api/productos` | Crear producto |
| PUT    | `/api/productos/:id` | Editar producto |
| DELETE | `/api/productos/:id` | Eliminar producto |
| POST   | `/api/productos/:id/licencias` | Agregar clave |
| GET    | `/api/clientes` | Listar clientes |
| POST   | `/api/clientes` | Crear cliente |
| PUT    | `/api/clientes/:id` | Editar cliente |
| DELETE | `/api/clientes/:id` | Eliminar cliente |
| GET    | `/api/ventas` | Listar ventas |
| POST   | `/api/ventas` | Crear venta |
| DELETE | `/api/ventas/:id` | Eliminar venta |
| GET    | `/api/reportes/dashboard` | Resumen general |
| GET    | `/api/reportes/ventas-por-categoria` | Aggregate 1 |
| GET    | `/api/reportes/top-productos` | Aggregate 2 |
| GET    | `/api/reportes/ingresos-por-mes` | Aggregate 3 |
| GET    | `/api/reportes/top-clientes` | Aggregate 4 |

---

## Verificar en mongosh

```js
// Conectar
mongosh

// Usar base de datos
use licencias_saas

// Verificar conteos
db.productos.countDocuments()   // >= 1000
db.clientes.countDocuments()    // >= 1000
db.ventas.countDocuments()      // >= 1000

// Ver índices
db.productos.getIndexes()

// Probar aggregate de categorías
db.ventas.aggregate([
  { $match: { estado: "completada" } },
  { $lookup: { from: "productos", localField: "producto_id",
               foreignField: "_id", as: "prod" } },
  { $unwind: "$prod" },
  { $group: { _id: "$prod.categoria", total: { $sum: "$total" } } },
  { $sort: { total: -1 } }
])
```

---

## Criterios de evaluación cubiertos

| Criterio | Implementación |
|----------|---------------|
| **Aggregate (25%)** | 4 pipelines: categorías, top productos, ingresos/mes, top clientes |
| **CRUD funcional (20%)** | Completo para productos, clientes y ventas |
| **Modelo de datos (20%)** | 3 colecciones, embedding, referencias ObjectId, índices |
| **Informe técnico (20%)** | Este README + comentarios en código |
| **Sustentación (15%)** | Interfaz visual con visualización de resultados |
