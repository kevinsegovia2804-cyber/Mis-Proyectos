<?php
// admin/procesar.php
include '../conexion.php'; // Subimos una carpeta para usar tu conexión actual

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nombre = $_POST['nombre_id'];
    $precio = $_POST['precio'];
    $stock = $_POST['stock'];
    
    // Gestión de la Imagen
    $nombre_imagen = $_FILES['imagen']['name'];
    $ruta_temporal = $_FILES['imagen']['tmp_name'];
    $ruta_destino = "../assets/" . $nombre_imagen; // Se guarda en la carpeta assets de la tienda

    if (move_uploaded_file($ruta_temporal, $ruta_destino)) {
        // Insertar en la base de datos (ajusta los nombres de tus columnas)
        $sql = "INSERT INTO productos (nombre_id, precio, stock, imagen) VALUES ('$nombre', '$precio', '$stock', 'assets/$nombre_imagen')";
        
        if ($conn->query($sql) === TRUE) {
            echo "<script>alert('Producto agregado con éxito'); window.location='index.php';</script>";
        } else {
            echo "Error: " . $conn->error;
        }
    } else {
        echo "Error al subir la imagen.";
    }
}
?>