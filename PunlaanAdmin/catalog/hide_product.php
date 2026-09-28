<?php

// Admins only
require_once __DIR__ . "/../admin_auth.php";

header("Content-Type: application/json");

require_once "../connection.php";

if (!isset($_POST["product_id"])) {
    echo json_encode([
        "success" => false,
        "message" => "Product ID is required."
    ]);
    exit;
}

$product_id = intval($_POST["product_id"]);

$sql = "
UPDATE product
SET catalog_status = 1
WHERE product_id = ?
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare query."
    ]);
    exit;
}

$stmt->bind_param("i", $product_id);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Product hidden successfully."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to hide product."
    ]);
}

$stmt->close();
$conn->close();