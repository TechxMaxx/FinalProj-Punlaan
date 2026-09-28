<?php

/*
| Items of one order, for the admin's Order Details view (read-only:
| only the seller and customer can change an order's status).
*/

// Admins only
require_once __DIR__ . "/../admin_auth.php";

require_once __DIR__ . "/../connection.php";
require_once __DIR__ . "/../../MyAccount/shared/order_flow.php";

header("Content-Type: application/json");

$orderId = (int)($_GET["order_id"] ?? 0);

if ($orderId <= 0) {
    echo json_encode(["success" => false, "message" => "No order was selected."]);
    exit;
}

$stmt = $conn->prepare("
    SELECT
        oi.order_item_id,
        oi.product_id,
        oi.product_name,
        oi.product_image,
        oi.unit_price,
        oi.quantity,
        oi.total_price,
        oi.status,
        oi.status_note,
        oi.updated_at,
        COALESCE(NULLIF(v.store_name, ''), CONCAT(v.first_name, ' ', v.last_name)) AS vendor_name
    FROM order_items oi
    LEFT JOIN users v ON v.user_id = oi.vendor_id
    WHERE oi.order_id = ?
    ORDER BY oi.order_item_id
");
$stmt->bind_param("i", $orderId);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$items = array_map(function ($row) {
    return [
        "order_item_id" => (int)$row["order_item_id"],
        "product_id" => (int)$row["product_id"],
        "product_name" => $row["product_name"],
        "product_image" => $row["product_image"],
        "unit_price" => (float)$row["unit_price"],
        "quantity" => (int)$row["quantity"],
        "total_price" => (float)$row["total_price"],
        "vendor" => $row["vendor_name"] ?: "Unknown seller",
        "status" => $row["status"],
        "status_label" => ORDER_STATUS_LABELS[$row["status"]] ?? $row["status"],
        "status_note" => $row["status_note"],
        "updated_at" => $row["updated_at"]
    ];
}, $rows);

echo json_encode(["success" => true, "items" => $items]);

$conn->close();
