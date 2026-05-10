<?php
session_start();
include '../db.php';

$user = $_POST['usuario'] ?? '';
$pass = $_POST['password'] ?? '';

$stmt = $conn->prepare("SELECT password FROM usuarios WHERE usuario = ?");
$stmt->bind_param("s", $user);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    $fila = $res->fetch_assoc();
    if (password_verify($pass, $fila['password'])) {
        $_SESSION['admin_ok'] = true;
        header("Location: index.php");
        exit;
    }
}
header("Location: login.php?error=1");
exit;
?>