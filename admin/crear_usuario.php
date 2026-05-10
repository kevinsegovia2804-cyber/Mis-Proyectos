<?php
session_start();
if (!isset($_SESSION['admin_ok'])) { exit; }
include '../db.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nuevo_user = $_POST['nuevo_usuario'];
    $pass_plana = $_POST['nueva_password'];

    // Encriptar la contraseña antes de guardarla
    $pass_encriptada = password_hash($pass_plana, PASSWORD_BCRYPT);

    $stmt = $conn->prepare("INSERT INTO usuarios (usuario, password) VALUES (?, ?)");
    $stmt->bind_param("ss", $nuevo_user, $pass_encriptada);

    if ($stmt->execute()) {
        echo "OK";
    } else {
        echo "Error: El usuario ya existe o hubo un fallo en la BD.";
    }
    $stmt->close();
    exit;
}
?>