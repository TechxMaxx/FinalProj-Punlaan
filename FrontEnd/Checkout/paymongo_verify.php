<?php

/*
|--------------------------------------------------------------------------
| CHECK A PAYMONGO PAYMENT
|--------------------------------------------------------------------------
|
| POST JSON { order_id }
| Asks PayMongo whether the order's checkout page was paid. If yes, the
| order is marked Paid, the payment ID is saved (needed for refunds)
| and the buyer + sellers are notified.
|
| Called by CONFIRM.html when the customer comes back from PayMongo,
| and by My Orders → "Pay now" pages that are opened again later.
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in first."]);
    exit;
}

require_once __DIR__ . "/../connection.php";
require_once __DIR__ . "/../../third_party/paymongo/paymongo.php";
require_once __DIR__ . "/../../lib/order_events.php";

$userId = (int)$_SESSION["user_id"];
$data = json_decode(file_get_contents("php://input"), true) ?? [];
$orderId = (int)($data["order_id"] ?? 0);

$stmt = $conn->prepare("
    SELECT payment_status, paymongo_checkout_id
    FROM orders WHERE order_id = ? AND customer_id = ?
");
$stmt->bind_param("ii", $orderId, $userId);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$order) {
    echo json_encode(["success" => false, "message" => "Order not found."]);
    exit;
}

if ($order["payment_status"] === "paid") {
    echo json_encode(["success" => true, "paid" => true]);
    exit;
}

if (!$order["paymongo_checkout_id"] || !paymongoIsConfigured()) {
    echo json_encode(["success" => true, "paid" => false]);
    exit;
}

try {
    $result = paymongoGetCheckout($order["paymongo_checkout_id"]);
} catch (Throwable $e) {
    echo json_encode(["success" => false, "message" => "Could not check the payment with PayMongo. Please refresh in a moment."]);
    exit;
}

if (!$result["paid"]) {
    echo json_encode(["success" => true, "paid" => false]);
    exit;
}

// Only the first check marks it paid (and notifies)
$stmt = $conn->prepare("
    UPDATE orders
    SET payment_status = 'paid', paid_at = NOW(), paymongo_payment_id = ?
    WHERE order_id = ? AND payment_status = 'unpaid'
");
$stmt->bind_param("si", $result["payment_id"], $orderId);
$stmt->execute();
$justPaid = $stmt->affected_rows === 1;
$stmt->close();

if ($justPaid) {
    orderPaid($conn, $orderId);
}

echo json_encode(["success" => true, "paid" => true]);
