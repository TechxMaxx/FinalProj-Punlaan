<?php

/*
|--------------------------------------------------------------------------
| CART COUNT (header cart badge)
|--------------------------------------------------------------------------
|
| Number of different products in the logged-in user's cart,
| like the badge on Shopee / Lazada.
|
*/

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => true,
        "logged_in" => false,
        "count" => 0
    ]);

    exit;
}

require_once __DIR__ . "/connection.php";

$userId = (int) $_SESSION["user_id"];

$stmt = $conn->prepare("
    SELECT COUNT(ci.cart_item_id) AS item_count
    FROM cart c
    INNER JOIN cart_items ci
        ON ci.cart_id = c.cart_id
    WHERE c.user_id = ?
");

$stmt->bind_param("i", $userId);
$stmt->execute();

$count = (int) $stmt->get_result()->fetch_assoc()["item_count"];

$stmt->close();
$conn->close();

echo json_encode([
    "success" => true,
    "logged_in" => true,
    "count" => $count
]);
