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

// Approval turns the applicant (a customer until now) into a seller
$sql = "UPDATE users
        SET verification_status = 2,
            is_vendor = 1
        WHERE user_id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);

if ($stmt->execute()) {
    // Tell the new seller (in-app + email)
    require_once __DIR__ . "/../lib/notify.php";
    notifyUser($conn, $user_id, "You're now a Punlaan seller!",
        "Your seller application was approved. Set your shop location in Storefront, then add your first product in Inventory.",
        "MyAccount/vendor/Storefront.html",
        ["subject" => "Your seller application was approved", "button" => "Set up my shop"]);

    echo json_encode([
        "success" => true,
        "message" => "Vendor approved successfully."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to approve vendor."
    ]);
}

$stmt->close();
$conn->close();