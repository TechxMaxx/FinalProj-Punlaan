<?php

/*
|--------------------------------------------------------------------------
| ONLINE PAYMENT — TEST MODE
|--------------------------------------------------------------------------
|
| Marks one of the customer's GCash / Maya / card orders as paid.
| No real money moves. Only used while PayMongo keys are NOT set in
| third_party/paymongo/paymongo_config.php — once they are, payments
| go through paymongo_checkout.php / paymongo_verify.php instead.
|
| POST JSON: { order_id }
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in first."]);
    exit;
}

require_once __DIR__ . "/../connection.php";
require_once __DIR__ . "/../../third_party/paymongo/paymongo_config.php";
require_once __DIR__ . "/../../lib/order_events.php";

// Real payments are on → the test button is switched off
if (paymongoIsConfigured()) {
    echo json_encode(["success" => false, "message" => "Please pay through the PayMongo payment page."]);
    exit;
}

$userId = (int)$_SESSION["user_id"];
$data = json_decode(file_get_contents("php://input"), true) ?? [];
$orderId = (int)($data["order_id"] ?? 0);

$stmt = $conn->prepare("
    UPDATE orders
    SET payment_status = 'paid', paid_at = NOW()
    WHERE order_id = ?
      AND customer_id = ?
      AND payment_method IN ('gcash', 'maya', 'card')
      AND payment_status = 'unpaid'
      AND status <> 'cancelled'
");
$stmt->bind_param("ii", $orderId, $userId);
$stmt->execute();
$updated = $stmt->affected_rows;
$stmt->close();

if ($updated === 1) {
    orderPaid($conn, $orderId);
}

$conn->close();

echo json_encode($updated === 1
    ? ["success" => true, "message" => "Payment received."]
    : ["success" => false, "message" => "This order can't be paid online (it may already be paid or cancelled)."]);
