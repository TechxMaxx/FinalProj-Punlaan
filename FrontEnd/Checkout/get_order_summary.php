<?php

/*
| One of the logged-in customer's orders, for the confirmation /
| payment page (CONFIRM.html). Customers only see their own orders.
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");
header("Cache-Control: no-store");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in first."]);
    exit;
}

require_once __DIR__ . "/../connection.php";

$userId = (int)$_SESSION["user_id"];
$orderId = (int)($_GET["order_id"] ?? 0);

$stmt = $conn->prepare("
    SELECT order_id, order_number, shipping_address, subtotal, shipping_fee, total_amount,
           payment_method, payment_status, paid_at, status, order_date
    FROM orders
    WHERE order_id = ? AND customer_id = ?
    LIMIT 1
");
$stmt->bind_param("ii", $orderId, $userId);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$order) {
    echo json_encode(["success" => false, "message" => "Order not found."]);
    $conn->close();
    exit;
}

$stmt = $conn->prepare("
    SELECT oi.product_name, oi.product_image, oi.quantity, oi.total_price,
           COALESCE(NULLIF(u.store_name, ''), CONCAT(u.first_name, ' ', u.last_name)) AS vendor
    FROM order_items oi
    LEFT JOIN users u ON u.user_id = oi.vendor_id
    WHERE oi.order_id = ?
    ORDER BY oi.order_item_id
");
$stmt->bind_param("i", $orderId);
$stmt->execute();
$items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// Shipping per seller
$stmt = $conn->prepare("
    SELECT s.from_city, s.distance_km, s.zone, s.shipping_fee,
           COALESCE(NULLIF(u.store_name, ''), CONCAT(u.first_name, ' ', u.last_name)) AS vendor
    FROM order_shipments s
    LEFT JOIN users u ON u.user_id = s.vendor_id
    WHERE s.order_id = ?
    ORDER BY s.shipment_id
");
$stmt->bind_param("i", $orderId);
$stmt->execute();
$shipments = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
$conn->close();

// How online payments are taken: PayMongo when its keys are set, else test mode
require_once __DIR__ . "/../../third_party/paymongo/paymongo_config.php";
$gateway = paymongoIsConfigured() ? (paymongoIsLive() ? "paymongo" : "paymongo_test") : "test";

// Estimated delivery: 1–4 days after the order
$placed = new DateTime($order["order_date"]);

echo json_encode([
    "success" => true,
    "order" => [
        "order_id" => (int)$order["order_id"],
        "order_number" => $order["order_number"],
        "shipping_address" => $order["shipping_address"],
        "subtotal" => (float)$order["subtotal"],
        "shipping_fee" => (float)$order["shipping_fee"],
        "total_amount" => (float)$order["total_amount"],
        "payment_method" => $order["payment_method"],
        "payment_status" => $order["payment_status"],
        "paid_at" => $order["paid_at"],
        "status" => $order["status"],
        "order_date" => $order["order_date"],
        "delivery_start" => (clone $placed)->modify("+1 day")->format("Y-m-d"),
        "delivery_end" => (clone $placed)->modify("+4 days")->format("Y-m-d")
    ],
    "gateway" => $gateway,
    "shipments" => array_map(fn($s) => [
        "vendor" => $s["vendor"],
        "from" => $s["from_city"],
        "distance_km" => $s["distance_km"] !== null ? (float)$s["distance_km"] : null,   // older orders
        "zone" => $s["zone"],
        "fee" => (float)$s["shipping_fee"]
    ], $shipments),
    "items" => array_map(fn($i) => [
        "name" => $i["product_name"],
        "image" => $i["product_image"],
        "quantity" => (int)$i["quantity"],
        "total" => (float)$i["total_price"],
        "vendor" => $i["vendor"]
    ], $items)
]);
