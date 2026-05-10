"""
seed.py — Genera +1000 documentos por colección en MongoDB
Uso: python seed.py
"""
from pymongo import MongoClient
from datetime import datetime, timedelta
import random
import string
import uuid

client = MongoClient("mongodb://localhost:27017/")
db = client["licencias_saas"]

# Limpiar colecciones existentes
db.productos.drop()
db.clientes.drop()
db.ventas.drop()
print("✓ Colecciones limpiadas")

# ─────────────────────────────────────────────────────────────────────────────
# ÍNDICES
# ─────────────────────────────────────────────────────────────────────────────
db.productos.create_index("categoria")
db.productos.create_index("nombre")
db.productos.create_index("stock")
db.clientes.create_index("email", unique=True)
db.clientes.create_index("pais")
db.ventas.create_index("fecha")
db.ventas.create_index("producto_id")
db.ventas.create_index("cliente_id")
db.ventas.create_index([("fecha", -1)])
print("✓ Índices creados")

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def clave_aleatoria(prefijo="LIC"):
    parte = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"{prefijo}-{parte}-{parte[:4]}-{parte[1:5]}-{parte[2:]}"

def fecha_aleatoria(dias_atras=365):
    delta = random.randint(0, dias_atras)
    return datetime.utcnow() - timedelta(days=delta)

# ─────────────────────────────────────────────────────────────────────────────
# CATÁLOGO DE PRODUCTOS BASE
# ─────────────────────────────────────────────────────────────────────────────
catalogo = [
    # Sistemas Operativos
    {"nombre": "Windows 11 Pro",         "categoria": "Sistema Operativo", "precio": 49900},

    # Ofimática
    {"nombre": "Microsoft 365 Personal", "categoria": "Ofimática (Suscripción)", "precio": 36999},
    {"nombre": "Office 2024 Pro Plus",   "categoria": "Ofimática (Permanente)", "precio": 69300},

    # Diseño y Creatividad
    {"nombre": "Adobe Creative Cloud",   "categoria": "Diseño y Creatividad", "precio": 650000}, 

    # Seguridad / Antivirus
    {"nombre": "Kaspersky Plus (2026)",  "categoria": "Seguridad / Antivirus", "precio": 129000},

    # Diseño Técnico (CAD)
    {"nombre": "Autodesk AutoCAD",       "categoria": "Diseño Técnico (CAD)", "precio": 129700},

    # Gestión de Documentos
    {"nombre": "Nitro PDF Pro 10",       "categoria": "Gestión de Documentos", "precio": 45500},

    # Gestión de Clientes
    {"nombre": "Salesforce CRM",         "categoria": "Gestión de Clientes", "precio": 390000},

    # Contabilidad y Facturación
    {"nombre": "Siigo Nube (Emprendedor)", "categoria": "Contabilidad y Facturación", "precio": 69900},

    # Gestión de Proyectos
    {"nombre": "Atlassian Jira",         "categoria": "Gestión de Proyectos", "precio": 72800}
]

# Insertar productos con licencias embebidas y suficiente variedad para >1000 docs
productos_lista = []
for i, prod in enumerate(catalogo):
    stock_inicial = random.randint(50, 200)
    licencias = [clave_aleatoria(prod["nombre"][:3].upper()) for _ in range(stock_inicial)]
    doc = {
        "nombre":       prod["nombre"],
        "categoria":    prod["categoria"],
        "descripcion":  f"Licencia digital original de {prod['nombre']}. Entrega inmediata vía email.",
        "precio":       prod["precio"],
        "stock":        stock_inicial,
        "licencias_disponibles": licencias,   # ARRAY EMBEBIDO
        "activo":       True,
        "valoracion_promedio": round(random.uniform(3.5, 5.0), 1),
        "num_resenas":  random.randint(10, 500),
        "etiquetas":    random.sample(["popular","oferta","nuevo","bestseller","premium"], k=random.randint(1,3)),
        "creado_en":    fecha_aleatoria(730)
    }
    productos_lista.append(doc)
res_prod = db.productos.insert_many(productos_lista)
print(f"✓ Productos insertados: {len(res_prod.inserted_ids)}")

# ─────────────────────────────────────────────────────────────────────────────
# CLIENTES  (≥1000)
# ─────────────────────────────────────────────────────────────────────────────
nombres = ["Andrés","Camila","Diego","Valentina","Sebastián","Laura","Julián",
           "Isabella","Mateo","Daniela","Samuel","Alejandra","Felipe","Natalia",
           "Carlos","Sofía","Miguel","Paula","David","Mariana","José","Ana",
           "Luis","Gabriela","Pablo","Catalina","Jorge","Melissa","Tomás","Sara"]
apellidos = ["García","Rodríguez","Martínez","López","González","Pérez","Sánchez",
             "Ramírez","Torres","Flores","Rivera","Gómez","Díaz","Reyes","Cruz",
             "Vargas","Morales","Ortiz","Gutiérrez","Chávez","Ramos","Herrera",
             "Medina","Ruiz","Castro","Suárez","Mendoza","Silva","Jiménez","Núñez"]
paises = ["Colombia","México","Argentina","Chile","Perú","Ecuador","Venezuela",
          "Uruguay","Bolivia","Paraguay","Costa Rica","Panamá","Honduras","Guatemala"]
dominios = ["gmail.com","hotmail.com","yahoo.com","outlook.com","empresa.co",
            "corp.com","business.net","trabajo.com"]

clientes_lista = []
emails_usados = set()
for i in range(70):
    nombre   = random.choice(nombres)
    apellido = random.choice(apellidos)
    dominio  = random.choice(dominios)
    base_email = f"{nombre.lower()}.{apellido.lower()}{random.randint(1,999)}@{dominio}"
    if base_email in emails_usados:
        base_email = f"{nombre.lower()}{i}@{dominio}"
    emails_usados.add(base_email)
    clientes_lista.append({
        "nombre":    f"{nombre} {apellido}",
        "email":     base_email,
        "telefono":  f"+57{random.randint(3000000000,3219999999)}",
        "pais":      random.choice(paises),
        "historial_compras": [],   # se llenará al crear ventas
        "creado_en": fecha_aleatoria(730)
    })

res_cli = db.clientes.insert_many(clientes_lista)
ids_clientes   = res_cli.inserted_ids
ids_productos  = res_prod.inserted_ids
print(f"✓ Clientes insertados: {len(ids_clientes)}")

# ─────────────────────────────────────────────────────────────────────────────
# VENTAS  (≥1000)
# ─────────────────────────────────────────────────────────────────────────────
# Recargar productos para tener datos completos
prods_db = list(db.productos.find({}, {"_id":1,"nombre":1,"precio":1,"categoria":1}))

ventas_lista = []
historial_map = {}   # cliente_id -> lista de entradas

for _ in range(904):
    prod   = random.choice(prods_db)
    cli_id = random.choice(ids_clientes)
    cant   = random.randint(1, 5)
    precio = prod["precio"]
    total  = round(precio * cant, 2)
    fecha  = fecha_aleatoria(365)

    claves = [clave_aleatoria("VNT") for _ in range(cant)]

    venta = {
        "producto_id":      prod["_id"],
        "producto_nombre":  prod["nombre"],
        "cliente_id":       cli_id,
        "cantidad":         cant,
        "precio_unitario":  precio,
        "total":            total,
        "claves_entregadas": claves,   # ARRAY EMBEBIDO de claves
        "estado":           random.choices(["completada","reembolsada"], weights=[95,5])[0],
        "metodo_pago":      random.choice(["tarjeta","paypal","transferencia","cripto"]),
        "fecha":            fecha
    }
    ventas_lista.append(venta)

    # Construir historial por cliente
    if cli_id not in historial_map:
        historial_map[cli_id] = []
    historial_map[cli_id].append({
        "producto": prod["nombre"],
        "total":    total,
        "fecha":    fecha
    })

res_ven = db.ventas.insert_many(ventas_lista)
ids_ventas = res_ven.inserted_ids

# Actualizar historial de clientes en bulk
from pymongo import UpdateOne
ops = []
for i, vid in enumerate(ids_ventas):
    venta = ventas_lista[i]
    ops.append(UpdateOne(
        {"_id": venta["cliente_id"]},
        {"$push": {"historial_compras": {
            "venta_id":  vid,
            "producto":  venta["producto_nombre"],
            "total":     venta["total"],
            "fecha":     venta["fecha"]
        }}}
    ))
db.clientes.bulk_write(ops)

print(f"✓ Ventas insertadas:  {len(ids_ventas)}")

# ─────────────────────────────────────────────────────────────────────────────
print("\n══════════════════════════════════════════")
print("  BASE DE DATOS 'licencias_saas' lista")
print(f"  Productos : {db.productos.count_documents({})}")
print(f"  Clientes  : {db.clientes.count_documents({})}")
print(f"  Ventas    : {db.ventas.count_documents({})}")
print("══════════════════════════════════════════")
