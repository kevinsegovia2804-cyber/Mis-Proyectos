#!/usr/bin/env python3
"""
start.py — Arranca el servidor Flask con el frontend integrado
"""
import sys, os

# Ruta base del proyecto (donde está este archivo)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Agregar backend al path ANTES de importar
sys.path.insert(0, BASE_DIR)

from backend.app import app as flask_app
from flask import send_from_directory

FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend')

# Servir index.html en la raíz
@flask_app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

# Servir archivos estáticos (css, js, etc.)
@flask_app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'static'), path)

if __name__ == '__main__':
    print("\n══════════════════════════════════════════════════")
    print("  LicenseVault — Sistema de Licencias de Software")
    print("══════════════════════════════════════════════════")
    print("  Abre en el navegador: http://localhost:5000")
    print("  API REST:             http://localhost:5000/api/")
    print("══════════════════════════════════════════════════\n")
    flask_app.run(debug=True, port=5000)