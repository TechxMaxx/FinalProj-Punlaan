<?php

// Admins only
require_once __DIR__ . "/../admin_auth.php";

header("Content-Type: application/json");

require_once "../connection.php";

if (!isset($_GET["product_id"])) {
    echo json_encode([
        "success" => false,
        "message" => "Product ID is required."
    ]);
    exit;
}

$product_id = intval($_GET["product_id"]);

$sql = "
SELECT
    p.product_id,
    p.product_image,
    p.product_name,
    p.category,
    p.subcategory,
    p.description,
    p.location,
    p.price,
    p.stock,
    p.submitted_at,
    p.reviewed_at,
    p.status,
    p.rejection_reason,
    p.catalog_status,
    p.user_id,
    u.first_name,
    u.last_name,
    u.store_name
FROM product p
LEFT JOIN users u
    ON p.user_id = u.user_id
WHERE p.product_id = ?
AND p.status = 1
LIMIT 1
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
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Product not found."
    ]);
    exit;
}

$row = $result->fetch_assoc();

echo json_encode([
    "success" => true,
    "product" => [
        "product_id" => (int)$row["product_id"],
        "product_image" => $row["product_image"],
        "product_name" => $row["product_name"],
        "category" => $row["category"],
        "subcategory" => $row["subcategory"],
        "description" => $row["description"],
        "location" => $row["location"],
        "price" => (float)$row["price"],
        "stock" => (int)$row["stock"],
        "submitted_at" => $row["submitted_at"],
        "reviewed_at" => $row["reviewed_at"],
        "status" => (int)$row["status"],
        "rejection_reason" => $row["rejection_reason"],
        "catalog_status" => (int)$row["catalog_status"],
        "vendor_id" => (int)$row["user_id"],
        "vendor_name" => trim($row["first_name"] . " " . $row["last_name"]),
        "store_name" => $row["store_name"]
    ]
]);

$stmt->close();
$conn->close();