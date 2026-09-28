<?php

/*
|--------------------------------------------------------------------------
| CUSTOMER: CANCEL AN ORDER ITEM / CONFIRM IT WAS RECEIVED
|--------------------------------------------------------------------------
|
| POST JSON {order_item_id, action: "cancel" | "received", reason?}
|   cancel   → only while the seller hasn't packed it yet (stock is returned)
|   received → once it's shipping/shipped; marks it Completed
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "message" => "Not logged in."
    ]);

    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../shared/order_flow.php";

$customerId = (int)$_SESSION["user_id"];

$input = json_decode(file_get_contents("php://input"), true) ?? [];

$orderItemId = (int)($input["order_item_id"] ?? 0);
$action = (string)($input["action"] ?? "");
$reason = trim((string)($input["reason"] ?? ""));

$newStatus = [
    "cancel"   => "cancelled",
    "received" => "completed",
][$action] ?? null;

if ($orderItemId <= 0 || !$newStatus) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request."
    ]);

    exit;
}

$note = $action === "cancel"
    ? ("Cancelled by the customer" . ($reason !== "" ? ": " . $reason : "."))
    : null;

echo json_encode(
    changeOrderItemStatus($conn, 'customer', $customerId, $orderItemId, $newStatus, $note)
);

$conn->close();
