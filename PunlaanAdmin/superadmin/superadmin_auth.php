<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header("Content-Type: application/json");

if (
    !isset($_SESSION["admin_user_id"]) ||
    (int)($_SESSION["is_admin"] ?? 0) !== 1
) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Administrator login required."
    ]);

    exit;
}

require_once __DIR__ . "/../connection.php";

$adminId = (int)$_SESSION["admin_user_id"];

$stmt = $conn->prepare("
    SELECT
        is_admin,
        is_superadmin,
        account_status
    FROM users
    WHERE user_id = ?
    LIMIT 1
");

$stmt->bind_param("i", $adminId);
$stmt->execute();

$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (
    !$user ||
    (int)$user["is_admin"] !== 1 ||
    (int)$user["is_superadmin"] !== 1 ||
    (int)$user["account_status"] !== 0
) {
    http_response_code(403);

    echo json_encode([
        "success" => false,
        "message" => "Super Admin access required."
    ]);

    exit;
}