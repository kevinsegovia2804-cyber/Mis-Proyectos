import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import csv
import secrets
import hashlib
from functools import wraps

try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False
    print("[WARN] bcrypt no instalado – se usa SHA-256. Instala: pip install bcrypt")

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app, supports_credentials=True)

BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
ESTUDIANTES_CSV = os.path.join(BASE_DIR, 'datos_estudiantes.csv')
USUARIOS_CSV    = os.path.join(BASE_DIR, 'usuarios.csv')


sesiones_activas = {}



def _hash_password(plain):
    if BCRYPT_AVAILABLE:
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()
    return hashlib.sha256(plain.encode()).hexdigest()


def _check_password(plain, hashed):
    """Acepta: bcrypt hash, SHA-256 hex, y texto plano (legacy)."""
    hashed = str(hashed)
    # bcrypt
    if hashed.startswith('$2') and BCRYPT_AVAILABLE:
        try:
            return bcrypt.checkpw(plain.encode(), hashed.encode())
        except Exception:
            return False
    if len(hashed) == 64:
        return hashlib.sha256(plain.encode()).hexdigest() == hashed
    return plain == hashed


def _get_token():
    return request.headers.get('X-Session-Token') or request.args.get('token')


def _usuario_autenticado():
    token = _get_token()
    return sesiones_activas.get(token) if token else None


def _requiere_auth(fn):
    """Decorador: rechaza la petición si no hay sesión válida."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not _usuario_autenticado():
            return jsonify({"error": "No autorizado"}), 401
        return fn(*args, **kwargs)
    return wrapper


def _validar_estudiante(datos):
    """Retorna mensaje de error o None si todo está OK."""
    nombre = str(datos.get('nombre', '')).strip()
    if not nombre:
        return "El nombre no puede estar vacío."
    try:
        asistencia = float(datos.get('asistencia', ''))
        if not (0 <= asistencia <= 100):
            return "La asistencia debe estar entre 0 y 100."
    except (ValueError, TypeError):
        return "Asistencia inválida."
    try:
        promedio = float(datos.get('promedio', ''))
        if not (0.0 <= promedio <= 5.0):
            return "El promedio debe estar entre 0.0 y 5.0."
    except (ValueError, TypeError):
        return "Promedio inválido."
    try:
        semestre = int(datos.get('semestre', ''))
        if not (1 <= semestre <= 12):
            return "El semestre debe estar entre 1 y 12."
    except (ValueError, TypeError):
        return "Semestre inválido."
    try:
        estrato = int(datos.get('estrato', ''))
        if not (1 <= estrato <= 6):
            return "El estrato debe estar entre 1 y 6."
    except (ValueError, TypeError):
        return "Estrato inválido."
    return None


def motor_analitica_predictiva(est):
    """
    Score continuo de riesgo de deserción (0.00 – 1.00).

    Diseño:
      • Componente asistencia  (peso 50 %) : lineal, 0 riesgo en 100 %, máx en 0 %
      • Componente promedio    (peso 40 %) : lineal, 0 riesgo en 5.0,   máx en 0.0
      • Componente estrato     (peso 10 %) : lineal, 0 riesgo en 6,     máx en 1
      • Término de interacción (peso 35 %) : c_asis × c_prom
            → amplifica el riesgo cuando asistencia Y nota son AMBOS bajos,
              y lo reduce cuando ambos son altos.

    Umbrales: Bajo < 35 %  |  Medio 35-60 %  |  Alto ≥ 60 %
    """
    try:
        asis = max(0.0, min(100.0, float(est.get('asistencia', 100) or 100)))
        prom = max(0.0, min(5.0,   float(est.get('promedio',   5.0) or 5.0)))
        estr = max(1,   min(6,     int(est.get('estrato',       3)  or 3)))

        c_asis = (100.0 - asis) / 100.0   # 0 = sin riesgo, 1 = máximo riesgo
        c_prom = (5.0   - prom) / 5.0
        c_estr = (6     - estr) / 5.0

        base = (c_asis * 0.50) + (c_prom * 0.40) + (c_estr * 0.10)

        interaccion = c_asis * c_prom

        score = base + (interaccion * 0.35)
        score = max(0.02, min(score, 1.0))

    except Exception:
        score = 0.10

    score     = round(score, 4)
    categoria = "Alto" if score >= 0.60 else "Medio" if score >= 0.35 else "Bajo"
    return score, categoria


def _append_csv(path, fila):
    """Añade una fila al CSV asegurando newline previo."""
    if os.path.exists(path):
        with open(path, 'rb+') as f:
            f.seek(0, os.SEEK_END)
            if f.tell() > 0:
                f.seek(-1, os.SEEK_END)
                if f.read(1) not in (b'\n', b'\r'):
                    f.write(b'\n')
    with open(path, mode='a', newline='', encoding='utf-8') as f:
        csv.writer(f).writerow(fila)


@app.route('/api/login', methods=['POST'])
def login():
    try:
        datos   = request.json
        u_input = str(datos.get('usuario', '')).strip()
        c_input = str(datos.get('clave', ''))
        df_u    = pd.read_csv(USUARIOS_CSV)
        fila    = df_u[df_u['usuario'] == u_input]

        if fila.empty or not _check_password(c_input, fila.iloc[0]['clave']):
            return jsonify({"error": "No autorizado"}), 401

        # Migrar clave de texto plano a hash automáticamente
        hashed_stored = str(fila.iloc[0]['clave'])
        if not hashed_stored.startswith('$2') and len(hashed_stored) != 64:
            df_u.loc[fila.index[0], 'clave'] = _hash_password(c_input)
            df_u.to_csv(USUARIOS_CSV, index=False)

        # Crear token de sesión
        token = secrets.token_hex(32)
        info  = fila.iloc[0].to_dict()
        info.pop('clave', None)   # nunca devolver la clave al cliente
        sesiones_activas[token] = info

        return jsonify({"token": token, **info}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/logout', methods=['POST'])
def logout():
    token = _get_token()
    if token and token in sesiones_activas:
        del sesiones_activas[token]
    return jsonify({"status": "ok"}), 200


@app.route('/api/estudiantes', methods=['GET'])
@_requiere_auth
def obtener_estudiantes():
    try:
        df    = pd.read_csv(ESTUDIANTES_CSV)
        lista = []
        for _, fila in df.iterrows():
            est = fila.to_dict()
            score, nivel = motor_analitica_predictiva(est)
            est.update({'score': score, 'categoria': nivel})
            lista.append(est)
        return jsonify(lista)
    except Exception:
        return jsonify([])


@app.route('/api/alertas_criticas', methods=['GET'])
@_requiere_auth
def obtener_alertas():
    try:
        df      = pd.read_csv(ESTUDIANTES_CSV)
        alertas = []
        for _, fila in df.iterrows():
            est = fila.to_dict()
            score, nivel = motor_analitica_predictiva(est)
            if nivel == "Alto":
                est.update({'score': score, 'categoria': nivel})
                alertas.append(est)
        return jsonify(alertas)
    except Exception:
        return jsonify([])


@app.route('/api/guardar_estudiante', methods=['POST'])
@_requiere_auth
def guardar_estudiante():
    try:
        datos = request.json
        error = _validar_estudiante(datos)
        if error:
            return jsonify({"error": error}), 400

        nuevo_id = len(pd.read_csv(ESTUDIANTES_CSV)) + 1
        fila = [
            nuevo_id,
            datos.get('nombre').strip(),
            datos.get('programa'),
            int(datos.get('semestre')),
            float(datos.get('asistencia')),
            float(datos.get('promedio')),
            int(datos.get('estrato'))
        ]
        _append_csv(ESTUDIANTES_CSV, fila)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/actualizar_estudiante', methods=['POST'])
@_requiere_auth
def actualizar_estudiante():
    try:
        datos  = request.json
        est_id = int(datos.get('id'))
        # Validar (nombre no cambia, usamos placeholder)
        error  = _validar_estudiante({**datos, 'nombre': 'placeholder'})
        if error:
            return jsonify({"error": error}), 400

        df  = pd.read_csv(ESTUDIANTES_CSV)
        idx = df[df['id'] == est_id].index
        if idx.empty:
            return jsonify({"error": "Estudiante no encontrado"}), 404

        df.loc[idx[0], 'semestre']   = int(datos.get('semestre'))
        df.loc[idx[0], 'asistencia'] = float(datos.get('asistencia'))
        df.loc[idx[0], 'promedio']   = float(datos.get('promedio'))
        df.loc[idx[0], 'estrato']    = int(datos.get('estrato'))
        df.to_csv(ESTUDIANTES_CSV, index=False)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/eliminar_estudiante', methods=['POST'])
@_requiere_auth
def eliminar_estudiante():
    try:
        datos  = request.json
        est_id = int(datos.get('id'))
        df     = pd.read_csv(ESTUDIANTES_CSV)
        idx    = df[df['id'] == est_id].index
        if idx.empty:
            return jsonify({"error": "Estudiante no encontrado"}), 404
        df = df.drop(idx)
        df.to_csv(ESTUDIANTES_CSV, index=False)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/usuarios', methods=['GET'])
@_requiere_auth
def obtener_usuarios():
    try:
        df   = pd.read_csv(USUARIOS_CSV)
        cols = [c for c in df.columns if c != 'clave']
        return jsonify(df[cols].to_dict(orient='records'))
    except Exception:
        return jsonify([])


@app.route('/api/guardar_usuario', methods=['POST'])
@_requiere_auth
def guardar_usuario():
    try:
        datos       = request.json
        clave_plain = str(datos.get('clave', ''))
        if not clave_plain:
            return jsonify({"error": "La contraseña no puede estar vacía."}), 400
        hashed = _hash_password(clave_plain)
        fila = [
            datos.get('usuario'),
            hashed,
            datos.get('nombre'),
            datos.get('rol'),
            datos.get('grado_asignado')
        ]
        _append_csv(USUARIOS_CSV, fila)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)