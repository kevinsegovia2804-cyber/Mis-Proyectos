<?php
session_start();
if (!isset($_SESSION['admin_ok'])) { header("Location: login.php"); exit; }
include '../db.php'; 

// Cargar Datos
$res_usuarios = $conn->query("SELECT id, usuario FROM usuarios");
// Consulta optimizada para traer los productos y sus precios
$res_prod = $conn->query("SELECT p.*, lp.precio, lp.imagen as foto_portada FROM productos p LEFT JOIN lista_precios lp ON SUBSTRING_INDEX(p.nombre_id, ' (', 1) = lp.nombre_id ORDER BY p.nombre_id ASC");
// Consulta de pedidos
$res_pedidos = $conn->query("SELECT * FROM pedidos ORDER BY (estado = 'Pendiente') DESC, id DESC");

/**
 * FUNCIÓN PARA OBTENER LA IMAGEN BASADA EN EL TEXTO DEL DETALLE
 */
function obtenerImagenPedido($linea, $conn) {
    // 1. Limpiamos el multiplicador inicial (ej: "1x ")
    $nombre_limpio = preg_replace('/^\d+x\s+/', '', trim($linea));
    
    // 2. Extraemos el nombre base (antes del paréntesis del tono)
    $nombre_base = $nombre_limpio;
    if (strpos($nombre_limpio, ' (') !== false) {
        $partes = explode(' (', $nombre_limpio);
        $nombre_base = trim($partes[0]);
    }

    $nombre_esc = $conn->real_escape_string($nombre_base);
    
    // 3. Buscamos en la columna 'imagen' de la tabla 'lista_precios'
    $res = $conn->query("SELECT imagen FROM lista_precios WHERE nombre_id = '$nombre_esc' LIMIT 1");
    
    if ($res && $row = $res->fetch_assoc()) {
        return $row['imagen'];
    }
    return ''; 
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WENLAU ADMINISTRADOR</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        :root { --dark: #121212; --accent: #ffc107; --bg: #f4f7f6; }
        body { background: var(--bg); font-family: 'Inter', system-ui, sans-serif; color: #333; }
        .navbar { background: var(--dark) !important; padding: 15px 0; }
        .navbar-brand { font-weight: 800; letter-spacing: -1px; }
        .card-custom { background: white; border-radius: 24px; padding: 30px; margin-bottom: 25px; border: none; box-shadow: 0 10px 40px rgba(0,0,0,0.04); transition: 0.3s; }
        .hidden-section { display: none !important; }
        
        /* DISEÑO DE LISTA DE PRODUCTOS EN PEDIDOS */
        .item-pedido-img { 
            display: flex; 
            align-items: center; 
            gap: 15px; 
            background: #f8f9fa; 
            padding: 10px 15px; 
            border-radius: 18px; 
            margin-bottom: 10px; 
            border: 1px solid #eee; 
        }
        .img-mini-pedido { 
            width: 50px; 
            height: 50px; 
            object-fit: cover; 
            border-radius: 12px; 
            background: #fff; 
            border: 1px solid #ddd; 
        }

        #contenedor-productos { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; }
        .product-card-cool { background: white; border-radius: 22px; padding: 15px; border: 1px solid #eee; transition: all 0.4s; position: relative; text-align: center; }
        .product-card-cool:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: var(--accent); }
        .img-stack { position: relative; width: 100%; aspect-ratio: 1/1; margin-bottom: 12px; }
        .img-main-cool { width: 100%; height: 100%; object-fit: cover; border-radius: 18px; }
        .img-tone-cool { position: absolute; bottom: -5px; right: -5px; width: 38px; height: 38px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .badge-stock { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
        .cool-price-input { background: #f8f9fa; border: none; border-radius: 10px; color: #0d6efd; font-weight: 800; text-align: center; width: 100%; padding: 6px; margin-top: 5px; }
        .stock-controls-cool { display: flex; justify-content: center; gap: 12px; margin-top: 15px; background: #f1f3f5; padding: 6px; border-radius: 50px; }
        .btn-stock-cool { width: 32px; height: 32px; border-radius: 50%; border: none; background: white; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .btn-stock-cool:hover { background: var(--dark); color: white; }
        .btn-delete-float { position: absolute; top: -10px; right: -10px; opacity: 0; transition: 0.3s; z-index: 5; }
        .product-card-cool:hover .btn-delete-float { opacity: 1; }
        .form-header { background: linear-gradient(45deg, #000, #333); color: white; padding: 25px; border-radius: 20px 20px 5px 5px; margin: -30px -30px 30px -30px; display: flex; align-items: center; gap: 12px; }
        .form-label { font-weight: 700; font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .input-group-custom { background: #f8f9fa; border: 1px solid #eee; border-radius: 14px; overflow: hidden; }
        .input-group-custom .input-group-text { background: transparent; border: none; color: #ccc; }
        .input-group-custom .form-control { border: none; background: transparent; padding: 14px; }
        .upload-wrapper { border: 2px dashed #ddd; border-radius: 18px; padding: 30px; text-align: center; cursor: pointer; transition: 0.3s; background: #fafafa; }
        .upload-wrapper:hover { border-color: var(--accent); background: white; transform: scale(1.02); }
        .btn-premium { background: var(--dark); color: white; border-radius: 15px; padding: 18px; font-weight: 700; width: 100%; text-transform: uppercase; border: none; transition: 0.3s; }
        .btn-premium:hover { background: #000; box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
        .user-pill { background: white; border-radius: 18px; padding: 15px 20px; margin-bottom: 12px; border: 1px solid #eee; display: flex; align-items: center; justify-content: space-between; }
    </style>
</head>
<body>

    <nav class="navbar navbar-dark sticky-top shadow-sm mb-5">
        <div class="container">
            <button class="btn btn-outline-light border-0" data-bs-toggle="offcanvas" data-bs-target="#menuAdmin"><i class="bi bi-grid-3x3-gap-fill fs-4"></i></button>
            <span class="navbar-brand m-0">PANEL ADMINISTRADOR</span>
            <a href="logout.php" class="text-danger fs-4"><i class="bi bi-power"></i></a>
        </div>
    </nav>

    <div class="container pb-5" style="max-width: 850px;">
        
        <div id="vista-pedidos">
            <h5 class="fw-bold mb-4"><i class="bi bi-receipt me-2"></i>PEDIDOS RECIENTES</h5>
            <?php while($ped = $res_pedidos->fetch_assoc()): ?>
                <div class="card-custom border-start border-5 <?php echo ($ped['estado'] == 'Pendiente') ? 'border-warning' : 'border-success'; ?>">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h6 class="fw-bold m-0"><?php echo $ped['cliente']; ?></h6>
                            <small class="text-muted">Estado: <span class="estado-texto"><?php echo $ped['estado']; ?></span></small>
                        </div>
                        <span class="h5 fw-bold text-dark">$<?php echo number_format($ped['total'], 0, ',', '.'); ?></span>
                    </div>

                    <div class="mb-3">
                        <?php 
                        // Separamos por comas o saltos de línea para mostrar uno debajo del otro
                        $detalle_limpio = str_replace(',', "\n", $ped['productos_detalle']);
                        $lineas = explode("\n", $detalle_limpio); 

                        foreach($lineas as $linea): 
                            $linea = trim($linea);
                            if(empty($linea)) continue;
                            $foto = obtenerImagenPedido($linea, $conn);
                        ?>
                        <div class="item-pedido-img">
                            <?php if(!empty($foto)): ?>
                                <img src="../assets/<?php echo $foto; ?>" class="img-mini-pedido" onerror="this.src='../assets/default.jpg'">
                            <?php else: ?>
                                <div class="img-mini-pedido d-flex align-items-center justify-content-center bg-white">
                                    <i class="bi bi-image text-muted"></i>
                                </div>
                            <?php endif; ?>
                            <span class="small fw-bold text-secondary"><?php echo $linea; ?></span>
                        </div>
                        <?php endforeach; ?>
                    </div>

                    <?php if($ped['estado'] == 'Pendiente'): ?>
                        <button onclick="completarPedido(<?php echo $ped['id']; ?>, this)" class="btn btn-dark w-100 rounded-pill py-2">Finalizar Pedido</button>
                    <?php endif; ?>
                </div>
            <?php endwhile; ?>
        </div>

        <div id="vista-editar" class="hidden-section">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h5 class="fw-bold m-0 text-uppercase">📦 INVENTARIO</h5>
                <input type="text" id="adminSearch" class="form-control w-50 rounded-pill border-0 shadow-sm" placeholder="Buscar...">
            </div>
            
            <div id="contenedor-productos">
                <?php $res_prod->data_seek(0); while($row = $res_prod->fetch_assoc()): ?>
                <div class="product-card-cool product-row">
                    <button onclick="borrarProducto('<?php echo urlencode($row['nombre_id']); ?>', this)" class="btn-delete-float btn btn-danger btn-sm rounded-circle shadow">
                        <i class="bi bi-x-lg"></i>
                    </button>
                    <div class="img-stack">
                        <img src="../assets/<?php echo $row['foto_portada']; ?>" class="img-main-cool">
                        <img src="../assets/<?php echo $row['imagen']; ?>" class="img-tone-cool">
                        <div class="badge-stock">Stock: <span class="stock-val"><?php echo $row['stock']; ?></span></div>
                    </div>
                    <span class="d-block fw-bold text-uppercase mb-2" style="font-size: 0.65rem; color: #666; height: 30px; overflow: hidden;"><?php echo $row['nombre_id']; ?></span>
                    <input type="number" value="<?php echo $row['precio']; ?>" class="cool-price-input" onchange="actualizarPrecioAuto('<?php echo $row['nombre_id']; ?>', this.value)">
                    <div class="stock-controls-cool">
                        <button onclick="ajustarStock('<?php echo urlencode($row['nombre_id']); ?>', 'menos', this)" class="btn-stock-cool"><i class="bi bi-dash"></i></button>
                        <button onclick="ajustarStock('<?php echo urlencode($row['nombre_id']); ?>', 'mas', this)" class="btn-stock-cool"><i class="bi bi-plus"></i></button>
                    </div>
                </div>
                <?php endwhile; ?>
            </div>
        </div>

        <div id="vista-agregar" class="hidden-section">
            <div class="card-custom">
                <div class="form-header">
                    <i class="bi bi-bag-plus fs-3"></i>
                    <h5 class="m-0 fw-bold">AÑADIR PRODUCTO</h5>
                </div>
                <form id="form-crear" enctype="multipart/form-data">
                    <div class="mb-4">
                        <label class="form-label">Nombre del producto</label>
                        <div class="input-group input-group-custom">
                            <span class="input-group-text"><i class="bi bi-tag"></i></span>
                            <input type="text" name="nombre_id" class="form-control" placeholder="Ej: Esponja Beauty Blender" required>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-6 mb-4">
                            <label class="form-label">Precio</label>
                            <div class="input-group input-group-custom">
                                <span class="input-group-text">$</span>
                                <input type="number" name="precio" class="form-control" placeholder="0" required>
                            </div>
                        </div>
                        <div class="col-6 mb-4">
                            <label class="form-label">Stock</label>
                            <div class="input-group input-group-custom">
                                <span class="input-group-text"><i class="bi bi-box"></i></span>
                                <input type="number" name="stock" class="form-control" placeholder="0" required>
                            </div>
                        </div>
                    </div>
                    <div class="row mb-4">
                        <div class="col-6">
                            <div class="upload-wrapper" onclick="document.getElementById('f1').click()">
                                <i class="bi bi-palette"></i>
                                <span id="l1" class="d-block small text-muted">Imagen Tono (Opcional)</span>
                                <input type="file" name="imagen_tono" id="f1" class="d-none" onchange="vLabel(this, 'l1')">
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="upload-wrapper" onclick="document.getElementById('f2').click()">
                                <i class="bi bi-image"></i>
                                <span id="l2" class="d-block small text-muted">Imagen Portada</span>
                                <input type="file" name="imagen_portada" id="f2" class="d-none" required onchange="vLabel(this, 'l2')">
                            </div>
                        </div>
                    </div>
                    <button type="submit" id="btn-submit-crear" class="btn-premium">Agregar Producto</button>
                </form>
            </div>
        </div>

        <div id="vista-usuarios" class="hidden-section">
            <div class="card-custom">
                <div class="form-header" style="background: #000;">
                    <i class="bi bi-person-badge fs-3"></i>
                    <h5 class="m-0 fw-bold">CREAR USUARIO</h5>
                </div>
                <form id="form-usuario" class="mb-5">
                    <div class="mb-3">
                        <label class="form-label">Nuevo Usuario</label>
                        <input type="text" name="nuevo_usuario" class="form-control rounded-4 p-3" placeholder="Nombre de usuario" required>
                    </div>
                    <div class="mb-4">
                        <label class="form-label">Contraseña</label>
                        <input type="password" name="nueva_password" class="form-control rounded-4 p-3" placeholder="••••••••••••" required>
                    </div>
                    <button type="submit" class="btn-premium">Crear Acceso</button>
                </form>
                
                <h6 class="fw-bold mb-3 small text-muted">ADMINISTRADORES</h6>
                <?php $res_usuarios->data_seek(0); while($u = $res_usuarios->fetch_assoc()): ?>
                <div class="user-pill">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-light rounded-circle p-2"><i class="bi bi-person text-dark"></i></div>
                        <span class="fw-bold"><?php echo $u['usuario']; ?></span>
                    </div>
                    <button onclick="borrarUsuario(<?php echo $u['id']; ?>, this)" class="btn btn-link text-danger"><i class="bi bi-trash3"></i></button>
                </div>
                <?php endwhile; ?>
            </div>
        </div>

    </div>

    <div class="offcanvas offcanvas-start" tabindex="-1" id="menuAdmin" style="width: 300px; border:none; border-radius: 0 30px 30px 0;">
        <div class="offcanvas-header py-4 border-bottom">
            <h5 class="offcanvas-title fw-bold">MENÚ</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body p-0">
            <div class="list-group list-group-flush">
                <button onclick="cambiarVista('pedidos')" class="list-group-item list-group-item-action py-4 border-0"><i class="bi bi-receipt me-3 text-success fs-5"></i> Pedidos</button>
                <button onclick="cambiarVista('editar')" class="list-group-item list-group-item-action py-4 border-0"><i class="bi bi-grid me-3 text-primary fs-5"></i> Inventario</button>
                <button onclick="cambiarVista('agregar')" class="list-group-item list-group-item-action py-4 border-0"><i class="bi bi-plus-circle me-3 text-warning fs-5"></i> Agregar</button>
                <button onclick="cambiarVista('usuarios')" class="list-group-item list-group-item-action py-4 border-0"><i class="bi bi-shield-lock me-3 text-dark fs-5"></i> Seguridad</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function cambiarVista(v) {
            ['pedidos', 'editar', 'agregar', 'usuarios'].forEach(x => {
                const el = document.getElementById('vista-'+x);
                if(el) el.classList.add('hidden-section');
            });
            document.getElementById('vista-'+v).classList.remove('hidden-section');
            const offcanvasElement = document.getElementById('menuAdmin');
            const instance = bootstrap.Offcanvas.getInstance(offcanvasElement);
            if(instance) instance.hide();
        }

        function vLabel(input, labelId) {
            if (input.files && input.files[0]) {
                document.getElementById(labelId).innerHTML = "✓ " + input.files[0].name.substring(0,15);
                document.getElementById(labelId).parentElement.style.borderColor = "#198754";
                document.getElementById(labelId).parentElement.style.background = "#f0fff4";
            }
        }

        async function actualizarPrecioAuto(id, nuevo) {
            const params = new URLSearchParams();
            params.append('id', id); params.append('nuevo_precio', nuevo);
            await fetch('acciones.php?do=editar_precio', { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        }

        async function ajustarStock(id, t, btn) {
            const res = await fetch(`acciones.php?do=ajustar_stock&id=${id}&tipo=${t}`);
            const s = await res.text(); 
            if(!isNaN(s.trim())) {
                const card = btn.closest('.product-card-cool');
                card.querySelector('.stock-val').textContent = s.trim();
                card.style.borderColor = (t==='mas') ? '#198754' : '#dc3545';
                setTimeout(() => card.style.borderColor = '#eee', 400);
            }
        }

        async function completarPedido(id, btn) {
            if (confirm('¿Marcar pedido como completado?')) {
                const res = await fetch(`acciones.php?do=completar_pedido&id=${id}`);
                const r = (await res.text()).trim();
                if (r === "OK") {
                    const card = btn.closest('.card-custom');
                    card.classList.replace('border-warning', 'border-success');
                    card.querySelector('.estado-texto').innerText = "Completado";
                    btn.remove();
                } else { alert(r); }
            }
        }

        async function borrarProducto(id, btn) {
            if(confirm('¿Eliminar producto permanentemente?')) {
                const res = await fetch(`acciones.php?do=borrar&id=${id}`);
                if((await res.text()).trim() === "OK") btn.closest('.product-row').remove();
            }
        }

        async function borrarUsuario(id, btn) {
            if(confirm('¿Eliminar este acceso de administrador?')) {
                const res = await fetch(`acciones.php?do=borrar_usuario&id=${id}`);
                if((await res.text()).trim() === "OK") btn.closest('.user-pill').remove();
            }
        }

        document.getElementById('form-crear').onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-crear');
            btn.disabled = true;
            btn.innerText = "Subiendo...";

            try {
                const res = await fetch('acciones.php?do=crear', { 
                    method: 'POST', 
                    body: new FormData(e.target) 
                });
                const r = (await res.text()).trim();
                if(r === "OK") location.reload();
                else {
                    alert("ERROR: " + r);
                    btn.disabled = false;
                    btn.innerText = "Agregar";
                }
            } catch (err) {
                alert("Error de conexión al servidor");
                btn.disabled = false;
                btn.innerText = "Agregar";
            }
        };

        document.getElementById('form-usuario').onsubmit = async (e) => {
            e.preventDefault();
            const res = await fetch('acciones.php?do=crear_usuario_ajax', { method: 'POST', body: new FormData(e.target) });
            if((await res.text()).trim() === "OK") location.reload();
            else alert("Error al crear usuario");
        };

        document.addEventListener('DOMContentLoaded', function() {
            const selectorBusqueda = document.getElementById('adminSearch');
            
            if (selectorBusqueda) {
                selectorBusqueda.addEventListener('input', function(e) {
                    // 1. Normalizamos lo que el usuario escribe (quita tildes)
                    const valor = e.target.value
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .trim();
        
                    const productos = document.querySelectorAll('.product-card-cool');
        
                    productos.forEach(card => {
                        // 2. Normalizamos el texto de la tarjeta (Nombre + Tono)
                        const textoTarjeta = card.innerText
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "");
        
                        // 3. Comparamos textos limpios de tildes
                        if (textoTarjeta.includes(valor)) {
                            card.style.setProperty('display', 'block', 'important');
                            card.style.opacity = '1';
                        } else {
                            card.style.setProperty('display', 'none', 'important');
                            card.style.opacity = '0';
                        }
                    });
                });
            }
        });
    </script>
</body>
</html>