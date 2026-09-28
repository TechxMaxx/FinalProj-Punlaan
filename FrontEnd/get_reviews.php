<?php

/*
|--------------------------------------------------------------------------
| PUBLIC REVIEWS (product page and shop page)
|--------------------------------------------------------------------------
|
| ?product_id=12   reviews of one product
| ?vendor_id=5     reviews of every product of one shop
| &limit=20
|
| Buyers are shown as "Maria R." — never their full name or email.
|
*/

header("Content-Type: application/json");

require_once __DIR__ . "/connection.php";

$productId = (int)($_GET["product_id"] ?? 0);
$vendorId = (int)($_GET["vendor_id"] ?? 0);
$limit = max(1, min(50, (int)($_GET["limit"] ?? 20)));

if (!$productId && !$vendorId) {
    echo json_encode(["success" => false, "message" => "Missing product or shop."]);
    exit;
}

$column = $productId ? "r.product_id" : "r.vendor_id";
$id = $productId ?: $vendorId;

$stmt = $conn->prepare("SELECT rating, COUNT(*) AS n FROM product_reviews r WHERE $column = ? GROUP BY rating");
$stmt->bind_param("i", $id);
$stmt->execute();
$breakdown = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
$count = 0;
$sum = 0;
foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
    $breakdown[(int)$row["rating"]] = (int)$row["n"];
    $count += (int)$row["n"];
    $sum += (int)$row["rating"] * (int)$row["n"];
}
$stmt->close();

$stmt = $conn->prepare("
    SELECT r.review_id, r.rating, r.comment, r.seller_reply, r.replied_at, r.created_at,
           r.product_id, oi.product_name, oi.quantity,
           c.first_name, c.last_name, c.profile_picture
    FROM product_reviews r
    INNER JOIN order_items oi ON oi.order_item_id = r.order_item_id
    INNER JOIN users c ON c.user_id = r.customer_id
    WHERE $column = ?
    ORDER BY r.created_at DESC
    LIMIT ?
");
$stmt->bind_param("ii", $id, $limit);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
$conn->close();

echo json_encode([
    "success" => true,
    "average" => $count ? round($sum / $count, 1) : 0,
    "count" => $count,
    "breakdown" => $breakdown,
    "reviews" => array_map(fn($r) => [
        "review_id" => (int)$r["review_id"],
        "rating" => (int)$r["rating"],
        "comment" => $r["comment"],
        "seller_reply" => $r["seller_reply"],
        "created_at" => $r["created_at"],
        "product_id" => (int)$r["product_id"],
        "product_name" => $r["product_name"],
        "customer" => trim($r["first_name"] . " " . mb_substr((string)$r["last_name"], 0, 1) . "."),
        "avatar" => $r["profile_picture"],
    ], $rows)
]);
