<?php

// Admins only
require_once __DIR__ . "/../admin_auth.php";

header("Content-Type: application/json");

require_once "../connection.php";

/*
|--------------------------------------------------------------------------
| Admin Order Oversight
|--------------------------------------------------------------------------
| Gets orders together with:
| - customer information
| - vendor information
| - order items
| - total amount
| - current status
|
| NOTE:
| There is currently no tracking number, commission, payout,
| dispute-history, or order-history table in the database.
|--------------------------------------------------------------------------
*/

$sql = "
SELECT
    o.order_id,
    o.order_number,
    o.customer_id,
    o.shipping_address,
    o.subtotal,
    o.shipping_fee,
    o.total_amount,
    o.status,
    o.status_note,
    o.order_date,
    o.updated_at,

    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,

    GROUP_CONCAT(
        DISTINCT
        CASE
            WHEN v.store_name IS NOT NULL
                 AND v.store_name <> ''
            THEN v.store_name
            ELSE CONCAT(v.first_name, ' ', v.last_name)
        END
        ORDER BY v.store_name
        SEPARATOR ', '
    ) AS vendor_names,

    GROUP_CONCAT(
        CONCAT(oi.quantity, 'x ', oi.product_name)
        ORDER BY oi.order_item_id
        SEPARATOR ', '
    ) AS products

FROM orders o

LEFT JOIN users c
    ON o.customer_id = c.user_id

LEFT JOIN order_items oi
    ON o.order_id = oi.order_id

LEFT JOIN users v
    ON oi.vendor_id = v.user_id

GROUP BY
    o.order_id,
    o.order_number,
    o.customer_id,
    o.shipping_address,
    o.subtotal,
    o.shipping_fee,
    o.total_amount,
    o.status,
    o.status_note,
    o.order_date,
    o.updated_at,
    c.first_name,
    c.last_name

ORDER BY o.order_date DESC
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode([
        "success" => false,
        "message" => "Database query failed.",
        "error" => $conn->error
    ]);
    exit;
}

$orders = [];

while ($row = $result->fetch_assoc()) {

    // Same step names the sellers and customers see
    $displayStatus = [
        "to-pack"   => "To Pack",
        "packed"    => "Packed",
        "shipping"  => "Shipping",
        "shipped"   => "Shipped",
        "completed" => "Completed",
        "cancelled" => "Cancelled"
    ][$row["status"]] ?? ucfirst($row["status"]);

    $orders[] = [
        "order_id" => (int)$row["order_id"],
        "id" => $row["order_number"],

        "customer_id" => (int)$row["customer_id"],
        "customer" => $row["customer_name"] ?: "Unknown Customer",

        "vendor" => $row["vendor_names"] ?: "Unknown Vendor",

        "products" => $row["products"] ?: "No items",

        "subtotal" => (float)$row["subtotal"],
        "shipping_fee" => (float)$row["shipping_fee"],
        "total_amount" => (float)$row["total_amount"],

        "total" => (float)$row["total_amount"],

        "status" => $displayStatus,
        "database_status" => $row["status"],

        "status_note" => $row["status_note"],

        "shipping_address" => $row["shipping_address"],
        "order_date" => $row["order_date"],
        "updated_at" => $row["updated_at"]
    ];
}

echo json_encode([
    "success" => true,
    "orders" => $orders
]);

$conn->close();
?>
