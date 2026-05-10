<?php
header("Content-Type: application/json");
// Salimos a la raíz para encontrar la conexión
include '../db.php'; 

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['nombre_id']) && isset($data['stock'])) {
    $nombre_id = $conn->real_escape_string($data['nombre_id']);
    $stock = (int)$data['stock'];

    // Actualizamos en la tabla productos
    $sql = "UPDATE productos SET stock = $stock WHERE nombre_id = '$nombre_id'";

    if ($conn->query($sql)) {
        echo json_encode(["status" => "success"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Datos incompletos"]);
}
$conn->close();
?>