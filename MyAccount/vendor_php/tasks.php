<?php

/*
| "Needs your attention" for the seller's Inventory page — real counts.
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");
header("Cache-Control: no-store");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false]);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../../lib/earnings.php";

$vendorId = (int)$_SESSION["user_id"];

function countFor(mysqli $conn, string $sql, int $vendorId, int $times = 1): int
{
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(str_repeat("i", $times), ...array_fill(0, $times, $vendorId));
    $stmt->execute();
    $n = (int)$stmt->get_result()->fetch_row()[0];
    $stmt->close();
    return $n;
}

$earnings = vendorEarnings($conn, $vendorId);

$stmt = $conn->prepare("SELECT shop_city FROM users WHERE user_id = ?");
$stmt->bind_param("i", $vendorId);
$stmt->execute();
$shopCity = $stmt->get_result()->fetch_row()[0] ?? null;
$stmt->close();

echo json_encode([
    "success" => true,
    "open_returns" => countFor($conn, "SELECT COUNT(*) FROM return_requests WHERE vendor_id = ? AND status = 'requested'", $vendorId),
    "disputes" => countFor($conn, "SELECT COUNT(*) FROM return_requests WHERE vendor_id = ? AND status = 'disputed'", $vendorId),
    // Ready to pack: cash on delivery, or already paid online
    "to_pack" => countFor($conn, "
        SELECT COUNT(*) FROM order_items oi INNER JOIN orders o ON o.order_id = oi.order_id
        WHERE oi.vendor_id = ? AND oi.status = 'to-pack' AND (o.payment_method = 'cod' OR o.payment_status = 'paid')
    ", $vendorId),
    "unread_messages" => countFor($conn, "
        SELECT COUNT(*) FROM messages m INNER JOIN conversations c ON c.conversation_id = m.conversation_id
        WHERE c.vendor_id = ? AND m.sender_id <> ? AND m.message_id > c.vendor_last_read_id
    ", $vendorId, 2),
    "unanswered_reviews" => countFor($conn, "SELECT COUNT(*) FROM product_reviews WHERE vendor_id = ? AND seller_reply IS NULL", $vendorId),
    "shop_location" => !empty($shopCity),
    "available_balance" => $earnings["balance"],
    "min_payout" => (float)setting($conn, "min_payout"),
]);
