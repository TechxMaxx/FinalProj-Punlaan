<?php

// Admins only
require_once __DIR__ . "/admin_auth.php";

require_once "connection.php";

header("Content-Type: application/json");

$product_id = intval($_POST["product_id"] ?? 0);

$sql = "
UPDATE product
SET
    status = 1,
    catalog_status = 3, -- approved = live in the Marketplace (Master Catalog can still hide it)
    rejection_reason = NULL,
    reviewed_at = NOW()
WHERE product_id = ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i",$product_id);

$ok = $stmt->execute();
$stmt->close();

// Tell the seller their product is live
if ($ok) {
    require_once __DIR__ . "/../lib/notify.php";
    $info = $conn->query("SELECT user_id, product_name FROM product WHERE product_id = " . (int)$product_id)->fetch_assoc();
    if ($info) {
        notifyUser($conn, (int)$info["user_id"], "Product approved",
            "\"{$info["product_name"]}\" is now live in the Marketplace.",
            "FrontEnd/DETAIL.html?product_id=" . (int)$product_id,
            ["subject" => "Your product is live", "button" => "View it in the shop"]);
    }
}

echo json_encode([
    "success" => $ok
]);

$conn->close();