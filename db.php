<?php
$host = "localhost";
$user = "u767619638_Kevin28"; 
$pass = "Kevin.28!"; 
$db   = "u767619638_wenlau_shop";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    header('Content-Type: application/json');
    die(json_encode(["status" => "error", "message" => "Error de conexión"]));
}
$conn->set_charset("utf8mb4");