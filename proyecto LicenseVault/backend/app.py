from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient, ReturnDocument
from bson import ObjectId
from bson.json_util import dumps
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# ── Conexión MongoDB ──────────────────────────────────────────────────────────
client = MongoClient("mongodb://localhost:27017/")
db = client["licencias_saas"]

productos = db["productos"]
clientes  = db["clientes"]
ventas    = db["ventas"]

# ── Helpers ───────────────────────────────────────────────────────────────────
def parse(data):
    return json.loads(dumps(data))

def oid(s):
    return ObjectId(s)


# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTOS
# ═══════════════════════════════════════════════════════════════════════════════

# find() + skip() + limit() — listado paginado con filtro opcional por categoría
@app.route("/api/productos", methods=["GET"])
def get_productos():
    categoria = request.args.get("categoria")
    page      = int(request.args.get("page", 1))
    per_page  = int(request.args.get("per_page", 200))
    filtro    = {"categoria": categoria} if categoria else {}
    # find() recorre la colección aplicando el filtro
    # skip() salta los registros de páginas anteriores
    # limit() acota la cantidad de resultados devueltos
    cursor = productos.find(filtro).skip((page - 1) * per_page).limit(per_page)
    return jsonify(parse(list(cursor)))

# find() + limit(1) — detalle de un producto
@app.route("/api/productos/<id>", methods=["GET"])
def get_producto(id):
    # find() con limit(1) es equivalente a find_one pero muestra el uso del cursor
    docs = list(productos.find({"_id": oid(id)}).limit(1))
    return jsonify(parse(docs[0])) if docs else (jsonify({"error": "No encontrado"}), 404)

# insert_one — crear producto nuevo
@app.route("/api/productos", methods=["POST"])
def crear_producto():
    data = request.json
    nuevo = {
        "nombre":                data["nombre"],
        "categoria":             data["categoria"],
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

# findOneAndUpdate + $set — actualizar campos y retornar doc modificado
@app.route("/api/productos/<id>", methods=["PUT"])
def actualizar_producto(id):
    data   = request.json
    campos = {}
    for k in ["nombre", "categoria", "descripcion", "precio", "stock", "activo"]:
        if k in data:
            campos[k] = data[k]
    if "precio" in campos: campos["precio"] = float(campos["precio"])
    if "stock"  in campos: campos["stock"]  = int(campos["stock"])

    # findOneAndUpdate: busca, aplica $set y devuelve el documento actualizado
    # $set: solo modifica los campos especificados, deja el resto intacto
    doc = productos.find_one_and_update(
        {"_id": oid(id)},
        {"$set": campos},
        return_document=ReturnDocument.AFTER
    )
    if not doc:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "doc": parse(doc)})

# deleteOne — eliminar exactamente un producto
@app.route("/api/productos/<id>", methods=["DELETE"])
def eliminar_producto(id):
    # deleteOne: elimina el primer documento que coincida (aquí solo hay uno por _id)
    resultado = productos.delete_one({"_id": oid(id)})
    if resultado.deleted_count == 0:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

# updateOne + $inc + $push — agregar clave al producto e incrementar stock
@app.route("/api/productos/<id>/licencias", methods=["POST"])
def agregar_licencia(id):
    clave = request.json.get("clave")
    # updateOne: modifica exactamente 1 documento que coincida con el filtro
    # $inc: incrementa el campo "stock" en +1 de forma atómica
    resultado = productos.update_one(
        {"_id": oid(id)},
        {
            "$push": {"licencias_disponibles": clave},
            "$inc":  {"stock": 1}
        }
    )
    return jsonify({"ok": True, "modificados": resultado.modified_count})

# updateMany + $set — activar/desactivar todos los productos de una categoría
@app.route("/api/productos/categoria/<cat>/estado", methods=["PATCH"])
def cambiar_estado_categoria(cat):
    activo = request.json.get("activo", True)
    # updateMany: aplica el cambio a TODOS los documentos que cumplan el filtro
    # $set: actualiza solo el campo "activo" sin tocar el resto
    resultado = productos.update_many(
        {"categoria": cat},
        {"$set": {"activo": activo}}
    )
    return jsonify({"ok": True, "modificados": resultado.modified_count})

# findOneAndReplace — reemplazar documento completo de producto, devuelve doc anterior
@app.route("/api/productos/<id>/reemplazar", methods=["PUT"])
def reemplazar_producto(id):
    data = request.json
    data.pop("_id", None)
    # findOneAndReplace: sustituye el documento ENTERO (no hace merge)
    # return_document=BEFORE devuelve la versión previa al reemplazo (útil para auditoría)
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

# find() + skip() + limit() — listado de clientes paginado
@app.route("/api/clientes", methods=["GET"])
def get_clientes():
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 200))
    # skip() salta los registros de páginas previas
    # limit() trae solo los registros de la página actual
    cursor = clientes.find().skip((page - 1) * per_page).limit(per_page)
    return jsonify(parse(list(cursor)))

# find() + limit(1) — detalle de cliente
@app.route("/api/clientes/<id>", methods=["GET"])
def get_cliente(id):
    docs = list(clientes.find({"_id": oid(id)}).limit(1))
    return jsonify(parse(docs[0])) if docs else (jsonify({"error": "No encontrado"}), 404)

# insert_one — registrar nuevo cliente
@app.route("/api/clientes", methods=["POST"])
def crear_cliente():
    data = request.json
    # find() + limit(1) para verificar duplicado de email antes de insertar
    existe = list(clientes.find({"email": data["email"]}).limit(1))
    if existe:
        return jsonify({"error": "Email ya registrado"}), 400
    nuevo = {
        "nombre":            data["nombre"],
        "email":             data["email"],
        "telefono":          data.get("telefono", ""),
        "pais":              data.get("pais", "Colombia"),
        "historial_compras": [],
        "creado_en":         datetime.utcnow()
    }
    res = clientes.insert_one(nuevo)
    nuevo["_id"] = str(res.inserted_id)
    return jsonify(parse(nuevo)), 201

# findOneAndUpdate + $set — editar cliente y retornar doc actualizado
@app.route("/api/clientes/<id>", methods=["PUT"])
def actualizar_cliente(id):
    data   = request.json
    campos = {}
    for k in ["nombre", "email", "telefono", "pais"]:
        if k in data:
            campos[k] = data[k]
    # findOneAndUpdate + $set: actualiza solo los campos recibidos, retorna doc nuevo
    doc = clientes.find_one_and_update(
        {"_id": oid(id)},
        {"$set": campos},
        return_document=ReturnDocument.AFTER
    )
    if not doc:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "doc": parse(doc)})

# deleteOne — eliminar un cliente
@app.route("/api/clientes/<id>", methods=["DELETE"])
def eliminar_cliente(id):
    # deleteOne: garantiza que solo se elimina 1 documento
    resultado = clientes.delete_one({"_id": oid(id)})
    if resultado.deleted_count == 0:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

# deleteMany — eliminar todos los clientes de un país
@app.route("/api/clientes/pais/<pais>", methods=["DELETE"])
def eliminar_clientes_pais(pais):
    # deleteMany: elimina en una sola operación todos los docs que coincidan
    resultado = clientes.delete_many({"pais": pais})
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

# findOneAndUpdate + $unset — eliminar un campo opcional del cliente
@app.route("/api/clientes/<id>/campo/<campo>", methods=["DELETE"])
def eliminar_campo_cliente(id, campo):
    if campo not in ["telefono"]:
        return jsonify({"error": "Campo no permitido"}), 400
    # $unset: elimina el campo del documento completamente (lo deja sin esa key)
    doc = clientes.find_one_and_update(
        {"_id": oid(id)},
        {"$unset": {campo: ""}},
        return_document=ReturnDocument.AFTER
    )
    return jsonify({"ok": True, "doc": parse(doc)})


# ═══════════════════════════════════════════════════════════════════════════════
# VENTAS
# ═══════════════════════════════════════════════════════════════════════════════

# find() + skip() + limit() — ventas paginadas ordenadas por fecha descendente
@app.route("/api/ventas", methods=["GET"])
def get_ventas():
    page     = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 200))
    # find() ordena por fecha, skip() pagina, limit() acota
    cursor = ventas.find().sort("fecha", -1).skip((page - 1) * per_page).limit(per_page)
    return jsonify(parse(list(cursor)))

# find() + limit(1) — detalle de una venta
@app.route("/api/ventas/<id>", methods=["GET"])
def get_venta(id):
    docs = list(ventas.find({"_id": oid(id)}).limit(1))
    return jsonify(parse(docs[0])) if docs else (jsonify({"error": "No encontrado"}), 404)

# insert_one + findAndModify (find_one_and_update) + updateOne + $inc
@app.route("/api/ventas", methods=["POST"])
def crear_venta():
    data = request.json
    pid  = oid(data["producto_id"])
    cid  = oid(data["cliente_id"])
    cant = int(data.get("cantidad", 1))

    # find() + limit(1) — verificar existencia del producto
    prod_list = list(productos.find({"_id": pid}).limit(1))
    if not prod_list:
        return jsonify({"error": "Producto no existe"}), 404
    prod = prod_list[0]

    if prod["stock"] < cant:
        return jsonify({"error": "Stock insuficiente"}), 400

    claves_entregadas = prod["licencias_disponibles"][:cant]

    nueva_venta = {
        "producto_id":       pid,
        "producto_nombre":   prod["nombre"],
        "cliente_id":        cid,
        "cantidad":          cant,
        "precio_unitario":   prod["precio"],
        "total":             prod["precio"] * cant,
        "claves_entregadas": claves_entregadas,
        "estado":            "completada",
        "metodo_pago":       data.get("metodo_pago", ""),
        "fecha":             datetime.utcnow()
    }
    res = ventas.insert_one(nueva_venta)
    vid = res.inserted_id

    # findAndModify (find_one_and_update) — descuenta stock y elimina claves usadas
    # $inc: decrementa stock de forma atómica, evita race conditions
    productos.find_one_and_update(
        {"_id": pid},
        {
            "$inc":  {"stock": -cant},
            "$pull": {"licencias_disponibles": {"$in": claves_entregadas}}
        },
        return_document=ReturnDocument.AFTER
    )

    # updateOne — registra la compra en el historial embebido del cliente
    clientes.update_one(
        {"_id": cid},
        {"$push": {"historial_compras": {
            "venta_id": vid,
            "producto": prod["nombre"],
            "total":    prod["precio"] * cant,
            "fecha":    datetime.utcnow()
        }}}
    )

    nueva_venta["_id"] = str(vid)
    return jsonify(parse(nueva_venta)), 201

# deleteOne — eliminar una venta por _id
@app.route("/api/ventas/<id>", methods=["DELETE"])
def eliminar_venta(id):
    # deleteOne: elimina exactamente 1 documento
    resultado = ventas.delete_one({"_id": oid(id)})
    if resultado.deleted_count == 0:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

# deleteMany — eliminar todas las ventas con estado reembolsada
@app.route("/api/ventas/reembolsadas", methods=["DELETE"])
def eliminar_ventas_reembolsadas():
    # deleteMany: borra en bloque todos los documentos que cumplan el filtro
    resultado = ventas.delete_many({"estado": "reembolsada"})
    return jsonify({"ok": True, "eliminados": resultado.deleted_count})

# replaceOne — reemplazar documento completo de una venta
@app.route("/api/ventas/<id>/reemplazar", methods=["PUT"])
def reemplazar_venta(id):
    data = request.json
    data.pop("_id", None)
    # replaceOne: sustituye el documento entero (no merge, reemplazo total)
    # diferencia con updateOne: updateOne modifica campos, replaceOne cambia todo
    resultado = ventas.replace_one({"_id": oid(id)}, data)
    return jsonify({"ok": True, "modificados": resultado.modified_count})


# ═══════════════════════════════════════════════════════════════════════════════
# AGGREGATE — Consultas avanzadas
# ═══════════════════════════════════════════════════════════════════════════════

# 1. Ventas totales por categoría
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

# 2. Top N productos más vendidos — $limit dentro del pipeline
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
        {"$limit": limite},      # limit() — devuelve solo los primeros N documentos
        {"$project": {
            "producto": "$_id", "unidades_vendidas": 1,
            "ingresos_totales": 1,
            "promedio_precio": {"$round": ["$promedio_precio", 2]},
            "_id": 0
        }}
    ]
    return jsonify(list(ventas.aggregate(pipeline)))

# 3. Ingresos por mes — skip() en Python sobre resultado del aggregate
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
    # skip() en lista Python: equivalente a cursor.skip(), omite los primeros N elementos
    saltar = int(request.args.get("skip", 0))
    return jsonify(todos[saltar:])

# 4. Top clientes — $limit parametrizable
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

# 5. Dashboard — find() + skip(0) + limit() + aggregate
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

    # find() + skip(0) + limit(20) — productos con stock crítico
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