from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, ReturnDocument
from bson import ObjectId
from bson.json_util import dumps
import json, re
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ── Conexión MongoDB ──
client = MongoClient("mongodb://localhost:27017/")
db = client["licencias_saas"]

productos = db["productos"]
clientes  = db["clientes"]
ventas    = db["ventas"]

# ── Helpers ───
def parse(data):
    return json.loads(dumps(data))

def oid(s):
    return ObjectId(s)

# ── FIX #2: Validación de entrada ───
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

def validar_producto(data, parcial=False):
    """Valida datos de producto. parcial=True para PUTs (solo campos presentes)."""
    errores = []
    if not parcial or "nombre" in data:
        if not str(data.get("nombre","")).strip():
            errores.append("nombre es obligatorio")
    if not parcial or "precio" in data:
        try:
            p = float(data.get("precio", 0))
            if p <= 0:
                errores.append("precio debe ser mayor que 0")
        except (ValueError, TypeError):
            errores.append("precio debe ser un número")
    if not parcial or "stock" in data:
        try:
            s = int(data.get("stock", 0))
            if s < 0:
                errores.append("stock no puede ser negativo")
        except (ValueError, TypeError):
            errores.append("stock debe ser un entero")
    return errores

def validar_cliente(data, parcial=False):
    errores = []
    if not parcial or "nombre" in data:
        if not str(data.get("nombre","")).strip():
            errores.append("nombre es obligatorio")
    if not parcial or "email" in data:
        email = str(data.get("email","")).strip()
        if not email:
            errores.append("email es obligatorio")
        elif not EMAIL_RE.match(email):
            errores.append("email no tiene formato válido")
    return errores

def validar_venta(data):
    errores = []
    if not data.get("producto_id"):
        errores.append("producto_id es obligatorio")
    if not data.get("cliente_id"):
        errores.append("cliente_id es obligatorio")
    try:
        c = int(data.get("cantidad", 1))
        if c < 1:
            errores.append("cantidad debe ser al menos 1")
    except (ValueError, TypeError):
        errores.append("cantidad debe ser un entero")
    return errores


# ══════════════
# PRODUCTOS
# ══════════════

@app.route("/api/productos", methods=["GET"])
def get_productos():
    categoria = request.args.get("categoria")
    page      = int(request.args.get("page", 1))
    per_page  = int(request.args.get("per_page", 200))
    filtro    = {"categoria": categoria} if categoria else {}
    cursor = productos.find(filtro).skip((page - 1) * per_page).limit(per_page)
    return jsonify(parse(list(cursor)))

@app.route("/api/productos/<id>", methods=["GET"])
def get_producto(id):
    docs = list(productos.find({"_id": oid(id)}).limit(1))
    return jsonify(parse(docs[0])) if docs else (jsonify({"error": "No encontrado"}), 404)

@app.route("/api/productos", methods=["POST"])
def crear_producto():
    data = request.json or {}
    # FIX #2: validar antes de insertar
    errores = validar_producto(data)
    if errores:
        return jsonify({"error": "; ".join(errores)}), 400

    nuevo = {
        "nombre":                str(data["nombre"]).strip(),
        "categoria":             data.get("categoria", ""),
        "descripcion":           data.get("descripcion", ""),
        "precio":                float(data["precio"]),
        "stock":                 int(data["stock"]),
        "licencias_disponibles": data.get("licencias_disponibles", []),
        "activo":                True,
        "creado_en":             datetime.utcnow()
    }
    res = productos.insert_one(nuevo)
    nuevo["_id"] = str(res.inserted_id)
    return jsonify(parse(nuevo)), 201

@app.route("/api/productos/<id>", methods=["PUT"])
def actualizar_producto(id):
    data   = request.json or {}
    # FIX #2: validar campos presentes (parcial)
    errores = validar_producto(data, parcial=True)
    if errores:
        return jsonify({"error": "; ".join(errores)}), 400

    campos = {}
    for k in ["nombre", "categoria", "descripcion", "precio", "stock", "activo"]:
        if k in data:
            campos[k] = data[k]
    if "precio" in campos: campos["precio"] = float(campos["precio"])
    if "stock"  in campos: campos["stock"]  = int(campos["stock"])

    doc = productos.find_one_and_update(
        {"_id": oid(id)},
        {"$set": campos},
        return_document=ReturnDocument.AFTER
    )
    if not doc:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "doc": parse(doc)})

@app.route("/api/productos/<id>", methods=["DELETE"])
def eliminar_producto(id):
    resultado = productos.delete_one({"_id": oid(id)})
    if resultado.deleted_count == 0:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

@app.route("/api/productos/<id>/licencias", methods=["POST"])
def agregar_licencia(id):
    clave = (request.json or {}).get("clave", "").strip()
    if not clave:
        return jsonify({"error": "clave es obligatoria"}), 400
    resultado = productos.update_one(
        {"_id": oid(id)},
        {
            "$push": {"licencias_disponibles": clave},
            "$inc":  {"stock": 1}
        }
    )
    return jsonify({"ok": True, "modificados": resultado.modified_count})

@app.route("/api/productos/categoria/<cat>/estado", methods=["PATCH"])
def cambiar_estado_categoria(cat):
    activo = (request.json or {}).get("activo", True)
    resultado = productos.update_many(
        {"categoria": cat},
        {"$set": {"activo": activo}}
    )
    return jsonify({"ok": True, "modificados": resultado.modified_count})

@app.route("/api/productos/<id>/reemplazar", methods=["PUT"])
def reemplazar_producto(id):
    data = request.json or {}
    data.pop("_id", None)
    doc_anterior = productos.find_one_and_replace(
        {"_id": oid(id)},
        data,
        return_document=ReturnDocument.BEFORE
    )
    if not doc_anterior:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "anterior": parse(doc_anterior)})


# ═══════════════════════════════════════════════════════════════════════════════
# CLIENTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/clientes", methods=["GET"])
def get_clientes():
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 200))
    cursor = clientes.find().skip((page - 1) * per_page).limit(per_page)
    return jsonify(parse(list(cursor)))

@app.route("/api/clientes/<id>", methods=["GET"])
def get_cliente(id):
    docs = list(clientes.find({"_id": oid(id)}).limit(1))
    return jsonify(parse(docs[0])) if docs else (jsonify({"error": "No encontrado"}), 404)

@app.route("/api/clientes", methods=["POST"])
def crear_cliente():
    data = request.json or {}
    # FIX #2: validar email y nombre
    errores = validar_cliente(data)
    if errores:
        return jsonify({"error": "; ".join(errores)}), 400

    email = str(data["email"]).strip().lower()
    existe = list(clientes.find({"email": email}).limit(1))
    if existe:
        return jsonify({"error": "Email ya registrado"}), 400

    nuevo = {
        "nombre":            str(data["nombre"]).strip(),
        "email":             email,
        "telefono":          data.get("telefono", ""),
        "pais":              data.get("pais", "Colombia"),
        "historial_compras": [],
        "creado_en":         datetime.utcnow()
    }
    res = clientes.insert_one(nuevo)
    nuevo["_id"] = str(res.inserted_id)
    return jsonify(parse(nuevo)), 201

@app.route("/api/clientes/<id>", methods=["PUT"])
def actualizar_cliente(id):
    data   = request.json or {}
    # FIX #2: validar email si se actualiza
    errores = validar_cliente(data, parcial=True)
    if errores:
        return jsonify({"error": "; ".join(errores)}), 400

    campos = {}
    for k in ["nombre", "email", "telefono", "pais"]:
        if k in data:
            campos[k] = data[k]
    if "email" in campos:
        campos["email"] = str(campos["email"]).strip().lower()

    doc = clientes.find_one_and_update(
        {"_id": oid(id)},
        {"$set": campos},
        return_document=ReturnDocument.AFTER
    )
    if not doc:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "doc": parse(doc)})

@app.route("/api/clientes/<id>", methods=["DELETE"])
def eliminar_cliente(id):
    resultado = clientes.delete_one({"_id": oid(id)})
    if resultado.deleted_count == 0:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

@app.route("/api/clientes/pais/<pais>", methods=["DELETE"])
def eliminar_clientes_pais(pais):
    resultado = clientes.delete_many({"pais": pais})
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

@app.route("/api/clientes/<id>/campo/<campo>", methods=["DELETE"])
def eliminar_campo_cliente(id, campo):
    if campo not in ["telefono"]:
        return jsonify({"error": "Campo no permitido"}), 400
    doc = clientes.find_one_and_update(
        {"_id": oid(id)},
        {"$unset": {campo: ""}},
        return_document=ReturnDocument.AFTER
    )
    return jsonify({"ok": True, "doc": parse(doc)})


# ═══════════════════════════════════════════════════════════════════════════════
# VENTAS
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/ventas", methods=["GET"])
def get_ventas():
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 200))
    cursor = ventas.find().sort("fecha", -1).skip((page - 1) * per_page).limit(per_page)
    return jsonify(parse(list(cursor)))

@app.route("/api/ventas/<id>", methods=["GET"])
def get_venta(id):
    docs = list(ventas.find({"_id": oid(id)}).limit(1))
    return jsonify(parse(docs[0])) if docs else (jsonify({"error": "No encontrado"}), 404)

@app.route("/api/ventas", methods=["POST"])
def crear_venta():
    data = request.json or {}
    # FIX #2: validar entrada
    errores = validar_venta(data)
    if errores:
        return jsonify({"error": "; ".join(errores)}), 400

    pid  = oid(data["producto_id"])
    cid  = oid(data["cliente_id"])
    cant = int(data.get("cantidad", 1))

    # FIX #1: Operación ATÓMICA — extrae las claves Y decrementa stock en un solo
    # find_one_and_update con $pop o $slice. Usamos $slice para extraer las primeras
    # `cant` claves y luego $inc para decrementar el stock. Todo en una sola op.
    # Primero verificamos que hay stock suficiente como condición del filtro,
    # lo que hace la verificación y la extracción atómicas.
    prod_actualizado = productos.find_one_and_update(
        {
            "_id":   pid,
            "stock": {"$gte": cant},                          # condición atómica
            f"licencias_disponibles.{cant - 1}": {"$exists": True}  # hay ≥ cant claves
        },
        {
            "$inc":  {"stock": -cant},
            "$push": {"licencias_usadas": {"$each": [], "$slice": 0}}  # placeholder
        },
        return_document=ReturnDocument.BEFORE  # necesitamos las claves ANTES de sacarlas
    )

    if not prod_actualizado:
        # Distinguimos entre "no existe" y "stock insuficiente"
        prod_check = productos.find_one({"_id": pid})
        if not prod_check:
            return jsonify({"error": "Producto no existe"}), 404
        return jsonify({"error": "Stock insuficiente o sin licencias disponibles"}), 400

    # Extraemos las claves del doc anterior (before) y las removemos del array
    claves_entregadas = prod_actualizado["licencias_disponibles"][:cant]

    # Ahora sacamos esas claves específicas del array (segunda op, pero ya reservamos stock)
    productos.update_one(
        {"_id": pid},
        {"$pull": {"licencias_disponibles": {"$in": claves_entregadas}}}
    )

    nueva_venta = {
        "producto_id":       pid,
        "producto_nombre":   prod_actualizado["nombre"],
        "cliente_id":        cid,
        "cantidad":          cant,
        "precio_unitario":   prod_actualizado["precio"],
        "total":             prod_actualizado["precio"] * cant,
        "claves_entregadas": claves_entregadas,
        "estado":            "completada",
        "metodo_pago":       data.get("metodo_pago", ""),
        "fecha":             datetime.utcnow()
    }
    res = ventas.insert_one(nueva_venta)
    vid = res.inserted_id

    clientes.update_one(
        {"_id": cid},
        {"$push": {"historial_compras": {
            "venta_id": vid,
            "producto": prod_actualizado["nombre"],
            "total":    prod_actualizado["precio"] * cant,
            "fecha":    datetime.utcnow()
        }}}
    )

    nueva_venta["_id"] = str(vid)
    return jsonify(parse(nueva_venta)), 201

# FIX #3: eliminar_venta ahora revierte stock, claves y historial
@app.route("/api/ventas/<id>", methods=["DELETE"])
def eliminar_venta(id):
    venta = ventas.find_one({"_id": oid(id)})
    if not venta:
        return jsonify({"error": "No encontrado"}), 404

    # Bloquear borrado de ventas completadas para proteger integridad (opción A)
    # Si prefieres revertir en lugar de bloquear, cambia la condición.
    if venta.get("estado") == "completada":
        # Revertir: devolver claves al producto y restar del historial del cliente
        claves = venta.get("claves_entregadas", [])
        cant   = venta.get("cantidad", 0)
        pid    = venta.get("producto_id")
        cid    = venta.get("cliente_id")
        vid    = venta["_id"]

        if pid and claves:
            # FIX #3: reponer claves y stock
            productos.update_one(
                {"_id": pid},
                {
                    "$push": {"licencias_disponibles": {"$each": claves}},
                    "$inc":  {"stock": cant}
                }
            )
        if cid:
            # FIX #3: limpiar historial del cliente
            clientes.update_one(
                {"_id": cid},
                {"$pull": {"historial_compras": {"venta_id": vid}}}
            )

    resultado = ventas.delete_one({"_id": oid(id)})
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

@app.route("/api/ventas/reembolsadas", methods=["DELETE"])
def eliminar_ventas_reembolsadas():
    resultado = ventas.delete_many({"estado": "reembolsada"})
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

@app.route("/api/ventas/<id>/reemplazar", methods=["PUT"])
def reemplazar_venta(id):
    data = request.json or {}
    data.pop("_id", None)
    resultado = ventas.replace_one({"_id": oid(id)}, data)
    return jsonify({"ok": True, "modificados": resultado.modified_count})


# ═══════════════════════════════════════════════════════════════════════════════
# AGGREGATE — Consultas avanzadas
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/reportes/ventas-por-categoria", methods=["GET"])
def ventas_por_categoria():
    pipeline = [
        {"$match": {"estado": "completada"}},
        {"$lookup": {
            "from": "productos", "localField": "producto_id",
            "foreignField": "_id", "as": "producto_info"
        }},
        {"$unwind": "$producto_info"},
        {"$group": {
            "_id":               "$producto_info.categoria",
            "total_ingresos":    {"$sum": "$total"},
            "total_ventas":      {"$sum": "$cantidad"},
            "num_transacciones": {"$sum": 1}
        }},
        {"$sort": {"total_ingresos": -1}},
        {"$project": {
            "categoria": "$_id", "total_ingresos": 1,
            "total_ventas": 1, "num_transacciones": 1, "_id": 0
        }}
    ]
    return jsonify(list(ventas.aggregate(pipeline)))

@app.route("/api/reportes/top-productos", methods=["GET"])
def top_productos():
    limite = int(request.args.get("limite", 5))
    pipeline = [
        {"$match": {"estado": "completada"}},
        {"$group": {
            "_id":               "$producto_nombre",
            "unidades_vendidas": {"$sum": "$cantidad"},
            "ingresos_totales":  {"$sum": "$total"},
            "promedio_precio":   {"$avg": "$precio_unitario"}
        }},
        {"$sort": {"unidades_vendidas": -1}},
        {"$limit": limite},
        {"$project": {
            "producto": "$_id", "unidades_vendidas": 1,
            "ingresos_totales": 1,
            "promedio_precio": {"$round": ["$promedio_precio", 2]},
            "_id": 0
        }}
    ]
    return jsonify(list(ventas.aggregate(pipeline)))

@app.route("/api/reportes/ingresos-por-mes", methods=["GET"])
def ingresos_por_mes():
    pipeline = [
        {"$match": {"estado": "completada"}},
        {"$group": {
            "_id": {"año": {"$year": "$fecha"}, "mes": {"$month": "$fecha"}},
            "ingresos":      {"$sum": "$total"},
            "transacciones": {"$sum": 1},
            "unidades":      {"$sum": "$cantidad"}
        }},
        {"$sort": {"_id.año": 1, "_id.mes": 1}},
        {"$project": {
            "periodo": {"$concat": [
                {"$toString": "$_id.año"}, "-",
                {"$cond": [{"$lte": ["$_id.mes", 9]},
                    {"$concat": ["0", {"$toString": "$_id.mes"}]},
                    {"$toString": "$_id.mes"}
                ]}
            ]},
            "ingresos": 1, "transacciones": 1, "unidades": 1, "_id": 0
        }}
    ]
    todos = list(ventas.aggregate(pipeline))
    saltar = int(request.args.get("skip", 0))
    return jsonify(todos[saltar:])

@app.route("/api/reportes/top-clientes", methods=["GET"])
def top_clientes():
    limite = int(request.args.get("limite", 10))
    pipeline = [
        {"$match": {"estado": "completada"}},
        {"$group": {
            "_id":           "$cliente_id",
            "total_gastado": {"$sum": "$total"},
            "num_compras":   {"$sum": 1},
            "unidades":      {"$sum": "$cantidad"}
        }},
        {"$sort": {"total_gastado": -1}},
        {"$limit": limite},
        {"$lookup": {
            "from": "clientes", "localField": "_id",
            "foreignField": "_id", "as": "cliente_info"
        }},
        {"$unwind": "$cliente_info"},
        {"$project": {
            "cliente": "$cliente_info.nombre", "email": "$cliente_info.email",
            "pais": "$cliente_info.pais", "total_gastado": 1,
            "num_compras": 1, "unidades": 1, "_id": 0
        }}
    ]
    return jsonify(list(ventas.aggregate(pipeline)))

@app.route("/api/reportes/dashboard", methods=["GET"])
def dashboard():
    resumen_agg = list(ventas.aggregate([
        {"$match": {"estado": "completada"}},
        {"$group": {"_id": None,
                    "total":    {"$sum": "$total"},
                    "ventas":   {"$sum": 1},
                    "unidades": {"$sum": "$cantidad"}}}
    ]))
    total_productos = productos.count_documents({})
    total_clientes  = clientes.count_documents({})
    stock_bajo = list(
        productos
        .find({"stock": {"$lt": 10}}, {"nombre": 1, "stock": 1, "categoria": 1})
        .skip(0)
        .limit(20)
    )
    resumen = resumen_agg[0] if resumen_agg else {"total": 0, "ventas": 0, "unidades": 0}
    return jsonify({
        "ingresos_totales":  round(resumen.get("total", 0), 2),
        "total_ventas":      resumen.get("ventas", 0),
        "unidades_vendidas": resumen.get("unidades", 0),
        "total_productos":   total_productos,
        "total_clientes":    total_clientes,
        "stock_bajo":        parse(stock_bajo)
    })

# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    app.run(debug=True, port=5000)