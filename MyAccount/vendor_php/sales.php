<?php

/*
|--------------------------------------------------------------------------
| SELLER: SALES REPORT + PAYOUTS
|--------------------------------------------------------------------------
|
| GET ?days=30   (7 | 30 | 90 | 365)
|   earnings  → balances (lib/earnings.php)
|   report    → sales per day, top products, order counts for the period
|   payouts   → payout history
|
| POST JSON {action: "payout", amount, method, account_name, account_number}
|   method: gcash | maya | bank
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");
header("Cache-Control: no-store");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in first."]);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../../lib/earnings.php";
require_once __DIR__ . "/../../lib/notify.php";

$vendorId = (int)$_SESSION["user_id"];

$stmt = $conn->prepare("SELECT is_vendor, verification_status FROM users WHERE user_id = ?");
$stmt->bind_param("i", $vendorId);
$stmt->execute();
$me = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$me || (int)$me["is_vendor"] !== 1) {
    echo json_encode(["success" => false, "message" => "Only sellers have sales reports."]);
    exit;
}

const PAYOUT_METHODS = ["gcash" => "GCash", "maya" => "Maya", "bank" => "Bank transfer"];


/* ---------- request a payout ---------- */

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $input = json_decode(file_get_contents("php://input"), true) ?? [];

    $amount = round((float)($input["amount"] ?? 0), 2);
    $method = (string)($input["method"] ?? "");
    $accountName = mb_substr(trim((string)($input["account_name"] ?? "")), 0, 150);
    $accountNumber = mb_substr(preg_replace('/\s+/', '', (string)($input["account_number"] ?? "")), 0, 60);

    $earnings = vendorEarnings($conn, $vendorId);
    $minimum = (float)setting($conn, "min_payout");

    $error = null;
    if (!isset(PAYOUT_METHODS[$method])) $error = "Choose how you want to be paid.";
    elseif ($accountName === "") $error = "Enter the account name.";
    elseif (!preg_match('/^[0-9A-Za-z\-]{6,30}$/', $accountNumber)) $error = "Enter a valid account or mobile number.";
    elseif ($amount < $minimum) $error = "The smallest payout is ₱" . number_format($minimum, 2) . ".";
    elseif ($amount > $earnings["balance"]) $error = "You can request up to ₱" . number_format($earnings["balance"], 2) . ".";

    if ($error) {
        echo json_encode(["success" => false, "message" => $error]);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO payouts (vendor_id, amount, method, account_name, account_number) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("idsss", $vendorId, $amount, $method, $accountName, $accountNumber);
    $stmt->execute();
    $stmt->close();

    notifyUser($conn, $vendorId, "Payout requested",
        "You asked for ₱" . number_format($amount, 2) . " by " . PAYOUT_METHODS[$method] . ". Punlaan usually sends payouts within 1–3 business days.",
        "MyAccount/vendor/Sales.html", ["subject" => "Payout request received", "button" => "View payouts"]);

    echo json_encode(["success" => true, "message" => "Payout requested. You'll be notified when it's sent."]);
    exit;
}


/* ---------- report ---------- */

$days = (int)($_GET["days"] ?? 30);
if (!in_array($days, [7, 30, 90, 365], true)) $days = 30;

$from = date("Y-m-d", strtotime("-" . ($days - 1) . " days"));

// Delivered sales per day (by delivery date)
$stmt = $conn->prepare("
    SELECT DATE(oi.completed_at) AS day, SUM(oi.total_price) AS amount, SUM(oi.quantity) AS qty
    FROM order_items oi
    LEFT JOIN return_requests rr ON rr.order_item_id = oi.order_item_id AND rr.status = 'refunded'
    WHERE oi.vendor_id = ? AND oi.status = 'completed' AND oi.completed_at >= ? AND rr.return_id IS NULL
    GROUP BY DATE(oi.completed_at)
");
$stmt->bind_param("is", $vendorId, $from);
$stmt->execute();
$byDay = [];
foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
    $byDay[$row["day"]] = ["amount" => (float)$row["amount"], "qty" => (int)$row["qty"]];
}
$stmt->close();

$series = [];
for ($i = 0; $i < $days; $i++) {
    $day = date("Y-m-d", strtotime("$from +$i days"));
    $series[] = ["day" => $day, "amount" => $byDay[$day]["amount"] ?? 0, "qty" => $byDay[$day]["qty"] ?? 0];
}

// Orders placed in the period
$stmt = $conn->prepare("
    SELECT
        COUNT(DISTINCT oi.order_id) AS orders,
        COALESCE(SUM(IF(oi.status <> 'cancelled', oi.quantity, 0)), 0) AS items,
        COALESCE(SUM(IF(oi.status = 'cancelled', 1, 0)), 0) AS cancelled,
        COALESCE(SUM(IF(oi.status NOT IN ('cancelled', 'completed'), 1, 0)), 0) AS in_progress
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
    WHERE oi.vendor_id = ? AND o.order_date >= ?
");
$stmt->bind_param("is", $vendorId, $from);
$stmt->execute();
$counts = array_map("intval", $stmt->get_result()->fetch_assoc());
$stmt->close();

// Best sellers in the period (delivered)
$stmt = $conn->prepare("
    SELECT oi.product_id, oi.product_name, MAX(oi.product_image) AS product_image,
           SUM(oi.quantity) AS qty, SUM(oi.total_price) AS amount
    FROM order_items oi
    LEFT JOIN return_requests rr ON rr.order_item_id = oi.order_item_id AND rr.status = 'refunded'
    WHERE oi.vendor_id = ? AND oi.status = 'completed' AND oi.completed_at >= ? AND rr.return_id IS NULL
    GROUP BY oi.product_id, oi.product_name
    ORDER BY amount DESC
    LIMIT 5
");
$stmt->bind_param("is", $vendorId, $from);
$stmt->execute();
$top = array_map(fn($r) => [
    "product_id" => (int)$r["product_id"],
    "name" => $r["product_name"],
    "image" => $r["product_image"],
    "qty" => (int)$r["qty"],
    "amount" => (float)$r["amount"],
], $stmt->get_result()->fetch_all(MYSQLI_ASSOC));
$stmt->close();

// Rating
$stmt = $conn->prepare("SELECT COUNT(*), AVG(rating) FROM product_reviews WHERE vendor_id = ?");
$stmt->bind_param("i", $vendorId);
$stmt->execute();
[$reviewCount, $avgRating] = $stmt->get_result()->fetch_row();
$stmt->close();

// Payout history
$stmt = $conn->prepare("
    SELECT payout_id, amount, method, account_name, account_number, status, reference, admin_note, requested_at, processed_at
    FROM payouts WHERE vendor_id = ? ORDER BY requested_at DESC
");
$stmt->bind_param("i", $vendorId);
$stmt->execute();
$payouts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

foreach ($payouts as &$p) {
    $p["payout_id"] = (int)$p["payout_id"];
    $p["amount"] = (float)$p["amount"];
    $p["method_label"] = PAYOUT_METHODS[$p["method"]] ?? $p["method"];
    // Show only the last 4 digits
    $p["account_number"] = str_repeat("•", max(0, strlen($p["account_number"]) - 4)) . substr($p["account_number"], -4);
}
unset($p);

echo json_encode([
    "success" => true,
    "days" => $days,
    "earnings" => vendorEarnings($conn, $vendorId),
    "report" => [
        "series" => $series,
        "total" => array_sum(array_column($series, "amount")),
        "orders" => $counts["orders"],
        "items" => $counts["items"],
        "cancelled" => $counts["cancelled"],
        "in_progress" => $counts["in_progress"],
        "top_products" => $top,
        "rating" => $reviewCount ? round((float)$avgRating, 1) : 0,
        "review_count" => (int)$reviewCount,
    ],
    "payouts" => $payouts,
    "rules" => [
        "commission_percent" => (float)setting($conn, "commission_percent"),
        "return_days" => (int)setting($conn, "return_days"),
        "min_payout" => (float)setting($conn, "min_payout"),
    ],
    "methods" => PAYOUT_METHODS,
]);
