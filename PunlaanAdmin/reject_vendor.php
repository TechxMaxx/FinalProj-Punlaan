<?php

// Admins only
require_once __DIR__ . "/admin_auth.php";
require 'connection.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["user_id"])) {
    echo json_encode([
        "success" => false,
        "message" => "Missing user ID."
    ]);
    exit;
}

$user_id = (int)$data["user_id"];

$sql = "UPDATE users
        SET verification_status = 3
        WHERE user_id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);

if ($stmt->execute()) {
    require_once __DIR__ . "/../lib/notify.php";
    notifyUser($conn, $user_id, "Seller application not approved",
        "Your seller application wasn't approved this time. You can still shop on Punlaan. For questions, contact Punlaan support.",
        "MyAccount/customer/Profile.html",
        ["subject" => "About your seller application"]);

    echo json_encode([
        "success" => true,
        "message" => "Vendor rejected successfully."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to reject vendor."
    ]);
}

$stmt->close();
$conn->close();