<?php
include 'db.php';

if (isset($_POST['cliente'])) {
    $cliente = $_POST['cliente'];
    $productos_detalle = $_POST['productos_detalle']; // Recibe: "2x Labial (Matte), 1x Base"
    $total = $_POST['total'];

    // 1. REGISTRAR EL PEDIDO EN LA TABLA DE PEDIDOS
    $sql_pedido = "INSERT INTO pedidos (cliente, productos_detalle, total, estado) 
                   VALUES ('$cliente', '$productos_detalle', $total, 'Pendiente')";
    
    if ($conn->query($sql_pedido)) {
        
        // 2. DESCONTAR STOCK AUTOMÁTICAMENTE
        // Separamos el string de productos por la coma para procesar cada uno
        $items = explode(', ', $productos_detalle);
        
        foreach ($items as $item) {
            // Buscamos la cantidad y el nombre. Ej: "2x Labial (Matte)"
            // El formato esperado es: {cantidad}x {nombre_completo}
            preg_match('/(\d+)x (.+)/', $item, $matches);
            
            if (count($matches) == 3) {
                $cantidad = (int)$matches[1];
                $nombre_completo = $conn->real_escape_string($matches[2]);

                // Actualizamos la tabla productos restando la cantidad
                $sql_update = "UPDATE productos SET stock = stock - $cantidad 
                               WHERE nombre_id = '$nombre_completo'";
                $conn->query($sql_update);
            }
        }
        
        echo "OK";
    } else {
        echo "Error: " . $conn->error;
    }
}
?>