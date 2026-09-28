<?php

/*
| One product listing with all its photos, for the admin's
| "Review" window in Vendor Listings Approval (any status).
*/

// Admins only
require_once __DIR__ . "/admin_auth.php";
require_once __DIR__ . "/connection.php";

header("Content-Type: application/json");

$productId = (int)($_GET["product_id"] ?? 0);

if ($productId <= 0) {
    echo json_encode(["success" => false, "message" => "No product was selected."]);
    exit;
}

$stmt = $conn->prepare("
    SELECT
        p.product_id, p.product_name, p.product_image, p.category, p.subcategory,
        p.description, p.location, p.price, p.stock, p.status, p.rejection_reason,
        p.submitted_at, p.reviewed_at,
        u.user_id AS vendor_id, u.first_name, u.last_name, u.store_name, u.email,
        u.verification_status, u.account_status
    FROM product p
    INNER JOIN users u ON u.user_id = p.user_id
    WHERE p.product_id = ?
    LIMIT 1
");
$stmt->bind_param("i", $productId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(["success" => false, "message" => "Listing not found."]);
    exit;
}

// All photos (cover first); paths are relative to FrontEnd/
$stmt = $conn->prepare("SELECT file_path FROM product_images WHERE product_id = ? ORDER BY sort_order, image_id");
$stmt->bind_param("i", $productId);
$stmt->execute();
$images = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), "file_path");
$stmt->close();

if (!$images && $row["product_image"]) {
    $images = [$row["product_image"]];
}

$statusLabels = [0 => "Pending", 1 => "Approved", 2 => "Rejected", 3 => "Deleted by seller"];

echo json_encode([
    "success" => true,
    "listing" => [
        "product_id" => (int)$row["product_id"],
        "name" => $row["product_name"],
        "images" => $images,
        "category" => $row["category"],
        "subcategory" => $row["subcategory"] === "Empty" ? "" : $row["subcategory"],
        "description" => $row["description"],
        "location" => $row["location"],
        "price" => (float)$row["price"],
        "stock" => (int)$row["stock"],
        "status" => $statusLabels[(int)$row["status"]] ?? "Unknown",
        "rejection_reason" => $row["rejection_reason"],
        "submitted_at" => $row["submitted_at"],
        "reviewed_at" => $row["reviewed_at"],
        "vendor_id" => (int)$row["vendor_id"],
        "vendor_name" => trim($row["first_name"] . " " . $row["last_name"]),
        "store_name" => $row["store_name"],
        "vendor_email" => $row["email"],
        "vendor_verified" => (int)$row["verification_status"] === 2,
        "vendor_active" => (int)$row["account_status"] === 0
    ]
]);

$conn->close();
