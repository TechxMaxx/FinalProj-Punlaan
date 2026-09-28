<?php

/*
|--------------------------------------------------------------------------
| REPORT A PRODUCT OR A SHOP (product page / shop page)
|--------------------------------------------------------------------------
|
| GET                → the reasons to choose from
| POST JSON {target: "product" | "shop", product_id?, vendor_id?, reason, details}
|
| Signed-in buyers only. Admins review them in PunlaanAdmin → Reports.
| One open report per person per product/shop, at most 10 a day.
|
*/

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

const REPORT_REASONS = [
    "Fake or misleading listing",
    "Wrong photos or description",
    "Prohibited or illegal item",
    "Sick plant or pests sold as healthy",
    "Scam or asking to pay outside Punlaan",
    "Offensive content",
    "Other",
];

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => true, "reasons" => REPORT_REASONS]);
    exit;
}

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in to report."]);
    exit;
}

require_once __DIR__ . "/connection.php";

$userId = (int)$_SESSION["user_id"];
$input = json_decode(file_get_contents("php://input"), true) ?? [];

$target = (string)($input["target"] ?? "");
$reason = (string)($input["reason"] ?? "");
$details = mb_substr(trim((string)($input["details"] ?? "")), 0, 1000);
$productId = null;
$vendorId = 0;

if (!in_array($reason, REPORT_REASONS, true)) {
    echo json_encode(["success" => false, "message" => "Choose a reason."]);
    exit;
}

if ($reason === "Other" && mb_strlen($details) < 10) {
    echo json_encode(["success" => false, "message" => "Tell us what's wrong (at least 10 characters)."]);
    exit;
}

if ($target === "product") {
    $productId = (int)($input["product_id"] ?? 0);
    $stmt = $conn->prepare("SELECT user_id FROM product WHERE product_id = ?");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $vendorId = (int)($stmt->get_result()->fetch_row()[0] ?? 0);
    $stmt->close();
} elseif ($target === "shop") {
    $vendorId = (int)($input["vendor_id"] ?? 0);
    $stmt = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND is_vendor = 1");
    $stmt->bind_param("i", $vendorId);
    $stmt->execute();
    $vendorId = (int)($stmt->get_result()->fetch_row()[0] ?? 0);
    $stmt->close();
}

if ($vendorId <= 0) {
    echo json_encode(["success" => false, "message" => "That product or shop wasn't found."]);
    exit;
}

if ($vendorId === $userId) {
    echo json_encode(["success" => false, "message" => "You can't report your own shop."]);
    exit;
}

// Already reported and still open → don't count it twice
$stmt = $conn->prepare("
    SELECT COUNT(*) FROM reports
    WHERE reporter_id = ? AND target_type = ? AND vendor_id = ? AND product_id <=> ? AND status = 'open'
");
$stmt->bind_param("isii", $userId, $target, $vendorId, $productId);
$stmt->execute();
$already = (int)$stmt->get_result()->fetch_row()[0];
$stmt->close();

if ($already) {
    echo json_encode(["success" => true, "message" => "You already reported this. Our team is reviewing it."]);
    exit;
}

$stmt = $conn->prepare("SELECT COUNT(*) FROM reports WHERE reporter_id = ? AND created_at > NOW() - INTERVAL 1 DAY");
$stmt->bind_param("i", $userId);
$stmt->execute();
$today = (int)$stmt->get_result()->fetch_row()[0];
$stmt->close();

if ($today >= 10) {
    echo json_encode(["success" => false, "message" => "You've sent a lot of reports today. Please try again tomorrow."]);
    exit;
}

$stmt = $conn->prepare("
    INSERT INTO reports (reporter_id, target_type, product_id, vendor_id, reason, details)
    VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->bind_param("isiiss", $userId, $target, $productId, $vendorId, $reason, $details);
$stmt->execute();
$stmt->close();

echo json_encode(["success" => true, "message" => "Thanks for telling us. Our team will review it."]);
