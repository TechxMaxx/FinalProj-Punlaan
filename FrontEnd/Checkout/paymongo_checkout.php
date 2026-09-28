<?php

/*
|--------------------------------------------------------------------------
| START A PAYMONGO PAYMENT
|--------------------------------------------------------------------------
|
| POST JSON { order_id }
| Creates a PayMongo checkout page for one of the customer's unpaid
| GCash / Maya / card orders and returns its address. The customer is
| sent there, pays, and comes back to CONFIRM.html, which calls
| paymongo_verify.php.
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

if (!paymongoIsConfigured()) {
    echo json_encode(["success" => false, "message" => "Online payments aren't connected yet."]);
    exit;
}

$userId = (int)$_SESSION["user_id"];
$data = json_decode(file_get_contents("php://input"), true) ?? [];
$orderId = (int)($data["order_id"] ?? 0);

$stmt = $conn->prepare("
    SELECT order_id, order_number, subtotal, shipping_fee, total_amount, payment_method, payment_status, status
    FROM orders
    WHERE order_id = ? AND customer_id = ?
");
$stmt->bind_param("ii", $orderId, $userId);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (
    !$order ||
    !isset(PAYMONGO_METHODS[$order["payment_method"]]) ||
    $order["payment_status"] !== "unpaid" ||
    $order["status"] === "cancelled"
) {
    echo json_encode(["success" => false, "message" => "This order can't be paid online (it may already be paid or cancelled)."]);
    exit;
}

// What the customer sees on PayMongo's page (adds up to the order total)
$stmt = $conn->prepare("
    SELECT product_name, quantity, unit_price
    FROM order_items
    WHERE order_id = ? AND status <> 'cancelled'
    ORDER BY order_item_id
");
$stmt->bind_param("i", $orderId);
$stmt->execute();
$lines = array_map(
    fn($r) => [$r["product_name"], (int)$r["quantity"], (float)$r["unit_price"]],
    $stmt->get_result()->fetch_all(MYSQLI_ASSOC)
);
$stmt->close();

if ((float)$order["shipping_fee"] > 0) {
    $lines[] = ["Shipping", 1, (float)$order["shipping_fee"]];
}

$back = rtrim(APP_URL, "/") . "/FrontEnd/Checkout/CONFIRM.html?order_id=" . $orderId;

// Paying from the mobile app → come back to the app (APP_RETURN.html opens
// it again). On a test PC the phone reaches XAMPP by the address it used.
if (($data["return_to"] ?? "") === "app") {
    $site = IS_LOCAL && !empty($_SERVER["HTTP_HOST"])
        ? "http://" . $_SERVER["HTTP_HOST"] . "/punlaan"
        : rtrim(APP_URL, "/");
    $back = $site . "/FrontEnd/Checkout/APP_RETURN.html?order_id=" . $orderId;
}

try {
    $checkout = paymongoCreateCheckout(
        $order,
        $lines,
        $order["payment_method"],
        $back . "&paymongo=done",
        $back . "&paymongo=cancelled"
    );
} catch (Throwable $e) {
    echo json_encode(["success" => false, "message" => "Could not open the payment page. " . $e->getMessage()]);
    exit;
}

$stmt = $conn->prepare("UPDATE orders SET paymongo_checkout_id = ? WHERE order_id = ?");
$stmt->bind_param("si", $checkout["id"], $orderId);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(["success" => true, "checkout_url" => $checkout["url"]]);
