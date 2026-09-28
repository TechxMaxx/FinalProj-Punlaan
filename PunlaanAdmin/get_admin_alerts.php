<?php

/*
| Things waiting for the admin — used by the header bell.
| Same definitions as the dashboard's "Needs Your Attention".
*/

require_once __DIR__ . "/admin_auth.php";
require_once __DIR__ . "/connection.php";

header("Content-Type: application/json");

function countOf(mysqli $conn, string $sql): int
{
    return (int)($conn->query($sql)->fetch_row()[0] ?? 0);
}

echo json_encode([
    "success" => true,
    "pending_sellers" => countOf($conn, "SELECT COUNT(*) FROM users WHERE verification_status = 1"),
    "pending_listings" => countOf($conn, "SELECT COUNT(*) FROM product WHERE status = 0"),
    "late_orders" => countOf($conn, "
        SELECT COUNT(*) FROM orders
        WHERE status = 'to-pack' AND order_date < NOW() - INTERVAL 2 DAY
    "),
    // Returns & Payouts page
    "disputes" => countOf($conn, "SELECT COUNT(*) FROM return_requests WHERE status = 'disputed'"),
    "payouts" => countOf($conn, "SELECT COUNT(*) FROM payouts WHERE status = 'requested'"),
    // Reports page
    "open_reports" => countOf($conn, "SELECT COUNT(*) FROM reports WHERE status = 'open'")
]);

$conn->close();
