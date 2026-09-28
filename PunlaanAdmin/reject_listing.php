<?php

// Admins only
require_once __DIR__ . "/admin_auth.php";

require_once "connection.php";

header("Content-Type: application/json");

$product_id = intval($_POST["product_id"] ?? 0);

// Optional note for the seller (shown with the rejected listing)
$reason = trim((string)($_POST["reason"] ?? ""));
$reason = $reason === "" ? null : mb_substr($reason, 0, 500);

$sql = "
UPDATE product
SET
    status = 2,
    rejection_reason = ?,
    reviewed_at = NOW()
WHERE product_id = ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("si", $reason, $product_id);

$ok = $stmt->execute();
$stmt->close();

if ($ok) {
    require_once __DIR__ . "/../lib/notify.php";
    $info = $conn->query("SELECT user_id, product_name FROM product WHERE product_id = " . (int)$product_id)->fetch_assoc();
    if ($info) {
        notifyUser($conn, (int)$info["user_id"], "Product needs changes",
            "\"{$info["product_name"]}\" wasn't approved" . ($reason ? ": $reason" : ".") . " Edit it in Inventory and submit it again.",
            "MyAccount/vendor/Inventory.html",
            ["subject" => "Your product needs changes", "button" => "Open Inventory"]);
    }
}

echo json_encode([
    "success" => $ok
]);

$conn->close();
