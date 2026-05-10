<?php
session_start();
if (!isset($_SESSION['admin_ok'])) { exit; }
include '../db.php';

$do = isset($_GET['do']) ? $_GET['do'] : '';

// 1. COMPLETAR PEDIDO
if ($do == 'completar_pedido') {
    $id = (int)$_GET['id']; 
    $conn->query("UPDATE pedidos SET estado = 'Completado' WHERE id = $id");
    echo "OK"; 
    exit;
}

// 2. AJUSTAR STOCK
if ($do == 'ajustar_stock') {
    $id = $conn->real_escape_string($_GET['id']);
    $operacion = ($_GET['tipo'] == 'mas') ? "+ 1" : "- 1";
    $conn->query("UPDATE productos SET stock = stock $operacion WHERE nombre_id = '$id'");
    
    $res = $conn->query("SELECT stock FROM productos WHERE nombre_id = '$id'");
    $row = $res->fetch_assoc();
    echo $row['stock']; 
    exit;
}

// 3. EDITAR PRECIO
if ($do == 'editar_precio') {
    $id_recibido = isset($_POST['id']) ? $_POST['id'] : '';
    $nuevo_precio = isset($_POST['nuevo_precio']) ? (int)$_POST['nuevo_precio'] : 0;

    if (!empty($id_recibido)) {
        $partes = explode(' (', $id_recibido);
        $nombre_base = trim($partes[0]);
        $nombre_base_esc = $conn->real_escape_string($nombre_base);

        // Actualizar en lista_precios
        $conn->query("UPDATE lista_precios SET precio = $nuevo_precio WHERE nombre_id = '$nombre_base_esc'");

        // Actualizar en productos (todos los que coincidan con el nombre base)
        $conn->query("UPDATE productos SET precio = $nuevo_precio WHERE nombre_id LIKE '$nombre_base_esc%'");

        echo "OK";
    } else {
        echo "ERROR_DATOS";
    }
    exit;
}

// 4. CREAR PRODUCTO (MODIFICADO: TONO OPCIONAL)
if ($do == 'crear') {
    $nombre_completo = $conn->real_escape_string($_POST['nombre_id']); // "Nombre (Tono)" o "Nombre"
    $precio = (int)$_POST['precio'];
    $stock = (int)$_POST['stock'];
    
    // Separar nombre base para lista_precios
    $partes = explode(' (', $nombre_completo);
    $nombre_base = trim($partes[0]);
    $nombre_base_esc = $conn->real_escape_string($nombre_base);

    // --- MANEJO IMAGEN TONO (Tabla: productos) ---
    // Se inicializa vacío o con un valor por defecto
    $img_tono = ""; 
    if (isset($_FILES['imagen_tono']) && $_FILES['imagen_tono']['error'] === UPLOAD_ERR_OK) {
        $img_tono = time() . "_" . $_FILES['imagen_tono']['name'];
        move_uploaded_file($_FILES['imagen_tono']['tmp_name'], "../assets/" . $img_tono);
    } else {
        // Si no se sube tono, asignamos un string vacío o podrías poner 'sin_tono.png'
        $img_tono = ""; 
    }

    // Insertar en tabla PRODUCTOS
    $sql_productos = "INSERT INTO productos (nombre_id, stock, imagen) VALUES ('$nombre_completo', $stock, '$img_tono')";
    if (!$conn->query($sql_productos)) {
        echo "Error al insertar en productos: " . $conn->error;
        exit;
    }
    
    // --- MANEJO IMAGEN PORTADA (Tabla: lista_precios) ---
    // Solo insertamos si el producto base no existe aún en la lista de precios general
    $check = $conn->query("SELECT * FROM lista_precios WHERE nombre_id = '$nombre_base_esc'");
    
    if ($check->num_rows == 0) {
        $img_portada = "";
        if (isset($_FILES['imagen_portada']) && $_FILES['imagen_portada']['error'] === UPLOAD_ERR_OK) {
            $img_portada = time() . "_" . $_FILES['imagen_portada']['name'];
            move_uploaded_file($_FILES['imagen_portada']['tmp_name'], "../assets/" . $img_portada);
        }
        
        // Insertar en tabla LISTA_PRECIOS
        $sql_lista = "INSERT INTO lista_precios (nombre_id, precio, imagen) VALUES ('$nombre_base_esc', $precio, '$img_portada')";
        $conn->query($sql_lista);
    } else {
        // Si ya existe el producto base, actualizamos el precio global
        $conn->query("UPDATE lista_precios SET precio = $precio WHERE nombre_id = '$nombre_base_esc'");
    }

    echo "OK"; 
    exit;
}

// 5. BORRAR PRODUCTO
if ($do == 'borrar') {
    $id = $conn->real_escape_string($_GET['id']);
    $conn->query("DELETE FROM productos WHERE nombre_id = '$id'");
    echo "OK"; 
    exit;
}

// 6. BORRAR USUARIO
if ($do == 'borrar_usuario') {
    $id = (int)$_GET['id'];
    $res_check = $conn->query("SELECT COUNT(*) as total FROM usuarios");
    $row_check = $res_check->fetch_assoc();
    if ($row_check['total'] > 1) {
        $conn->query("DELETE FROM usuarios WHERE id = $id");
        echo "OK";
    } else {
        echo "ERROR_ULTIMO_USUARIO";
    }
    exit;
}

// 7. CREAR USUARIO
if ($do == 'crear_usuario_ajax') {
    $u = $conn->real_escape_string($_POST['nuevo_usuario']);
    $p = password_hash($_POST['nueva_password'], PASSWORD_DEFAULT);
    if($conn->query("INSERT INTO usuarios (usuario, password) VALUES ('$u', '$p')")) {
        echo "OK";
    } else { echo "ERROR"; }
    exit;
}
?>