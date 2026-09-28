<?php

/*
|--------------------------------------------------------------------------
| SELLER: UPDATE AN ORDER ITEM'S STATUS
|--------------------------------------------------------------------------
|
| POST JSON {order_item_id, status, note, courier?, tracking_number?}
| Rules (which steps are allowed, stock return on cancel) live in
| MyAccount/shared/order_flow.php.
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

$vendor_id =
    (int)$_SESSION["user_id"];


require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../shared/order_flow.php";


/* Only approved sellers can process orders */

$stmt = $conn->prepare("SELECT is_vendor, verification_status FROM users WHERE user_id = ?");
$stmt->bind_param("i", $vendor_id);
$stmt->execute();
$seller = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$seller || (int)$seller["is_vendor"] !== 1 || (int)$seller["verification_status"] !== 2) {

    echo json_encode([
        "success" => false,
        "message" => "Only approved sellers can update orders."
    ]);

    exit;
}


$input =
    json_decode(
        file_get_contents("php://input"),
        true
    ) ?? [];

$order_item_id =
    (int)($input["order_item_id"] ?? 0);

$status =
    trim((string)($input["status"] ?? ""));

$note =
    isset($input["note"]) ? (string)$input["note"] : null;


if ($order_item_id <= 0 || !isset(ORDER_STATUS_LABELS[$status])) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid order or status."
    ]);

    exit;
}


// Optional: courier + tracking_number when moving to Shipping / Shipped
$tracking = [
    "courier" => (string)($input["courier"] ?? ""),
    "tracking_number" => (string)($input["tracking_number"] ?? ""),
];

echo json_encode(
    changeOrderItemStatus($conn, 'vendor', $vendor_id, $order_item_id, $status, $note, $tracking)
);

$conn->close();
