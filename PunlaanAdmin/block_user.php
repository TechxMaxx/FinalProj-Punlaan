<?php

require_once __DIR__ . "/admin_auth.php";
require __DIR__ . "/connection.php";

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$user_id = (int)($data["user_id"] ?? 0);

if ($user_id <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid user."
    ]);
    exit;
}

if (!canManageUser($conn, $user_id)) {
    http_response_code(403);

    echo json_encode([
        "success" => false,
        "message" => "You do not have permission to manage this account."
    ]);
    exit;
}

$stmt = $conn->prepare("
    UPDATE users
    SET account_status = 2
    WHERE user_id = ?
");

$stmt->bind_param("i", $user_id);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "User blocked successfully."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to block user."
    ]);
}

$stmt->close();
$conn->close();