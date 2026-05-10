<?php
ob_start(); // Captura cualquier error de texto accidental
error_reporting(0);
ini_set('display_errors', 0);

include 'db.php';
ob_end_clean(); // Borra cualquier basura antes de enviar los datos

header("Content-Type: application/json; charset=UTF-8");

try {
    // --- 1. Obtener número de WhatsApp con nombres exactos de tu imagen ---
    $whatsapp = "";
    try {
        // Ajustado a: columna 'parametro' y valor 'whatsapp_number'
        $resWha = $conn->query("SELECT valor FROM configuracion WHERE parametro = 'whatsapp_number' LIMIT 1");
        if ($resWha && $rowWha = $resWha->fetch_assoc()) {
            $whatsapp = trim($rowWha['valor']);
        }
    } catch (Exception $eWha) {
        $whatsapp = ""; 
    }

    // --- 2. Tu consulta original de productos ---
    $sql = "SELECT 
                p.nombre_id, 
                p.stock, 
                p.imagen as imagen_tono, 
                IFNULL(lp.precio, 0) as precio,
                IFNULL(lp.imagen, '') as foto_portada
            FROM productos p 
            LEFT JOIN lista_precios lp ON 
                lp.nombre_id COLLATE utf8mb4_unicode_ci = SUBSTRING_INDEX(p.nombre_id, ' (', 1) COLLATE utf8mb4_unicode_ci";
            
    $res = $conn->query($sql);
    
    if (!$res) {
        throw new Exception("Error SQL: " . $conn->error);
    }

    $agrupados = [];
    while ($row = $res->fetch_assoc()) {
        $partes = explode(' (', $row['nombre_id']);
        $nombreBase = trim($partes[0]);
        $nombreTono = isset($partes[1]) ? str_replace(')', '', $partes[1]) : 'Único';

        if (!isset($agrupados[$nombreBase])) {
            $agrupados[$nombreBase] = [
                'nombre' => $nombreBase,
                'precio' => (float)$row['precio'],
                'imagen_principal' => $row['foto_portada'],
                'tonos' => []
            ];
        }
        $agrupados[$nombreBase]['tonos'][] = [
            'tono' => $nombreTono,
            'stock' => (int)$row['stock'],
            'imagen' => $row['imagen_tono'],
            'nombre_completo' => $row['nombre_id']
        ];
    }

    // --- 3. Envío de datos ---
    echo json_encode([
        "status" => "success", 
        "whatsapp" => $whatsapp, 
        "productos" => array_values($agrupados)
    ]);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
exit();