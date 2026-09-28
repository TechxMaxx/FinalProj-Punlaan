<?php

/*
|--------------------------------------------------------------------------
| SEARCH SUGGESTIONS (header search box, while typing)
|--------------------------------------------------------------------------
|
| GET ?q=toma → matching live products and shops.
| Same visibility rules as the Marketplace (approved, in stock,
| from an active verified seller).
|
*/

header("Content-Type: application/json");
header("Cache-Control: no-store");

$q = trim((string)($_GET["q"] ?? ""));

if (mb_strlen($q) < 2) {
    echo json_encode(["success" => true, "products" => [], "shops" => []]);
    exit;
}

$q = mb_substr($q, 0, 60);

require_once __DIR__ . "/connection.php";

// Treat % and _ as normal characters
$like = "%" . addcslashes($q, "%_\\") . "%";
$starts = addcslashes($q, "%_\\") . "%";

$stmt = $conn->prepare("
    SELECT p.product_id, p.product_name, p.product_image, p.price, p.subcategory
    FROM product p
    INNER JOIN users u ON u.user_id = p.user_id
    WHERE p.status = 1
      AND p.catalog_status = 3
      AND p.stock > 0
      AND u.verification_status = 2
      AND u.account_status = 0
      AND (p.product_name LIKE ? OR p.subcategory LIKE ? OR p.category LIKE ?)
    ORDER BY (p.product_name LIKE ?) DESC, (p.product_name LIKE ?) DESC, p.product_name
    LIMIT 6
");
// Name starts with it → name contains it → category/subcategory match
$stmt->bind_param("sssss", $like, $like, $like, $starts, $like);
$stmt->execute();
$products = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$stmt = $conn->prepare("
    SELECT u.user_id, COALESCE(NULLIF(u.store_name, ''), CONCAT(u.first_name, ' ', u.last_name)) AS name, u.profile_picture
    FROM users u
    WHERE u.is_vendor = 1
      AND u.verification_status = 2
      AND u.account_status = 0
      AND (u.store_name LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)
    ORDER BY u.store_name
    LIMIT 3
");
$stmt->bind_param("ss", $like, $like);
$stmt->execute();
$shops = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
$conn->close();

echo json_encode([
    "success" => true,
    "products" => array_map(fn($p) => [
        "id" => (int)$p["product_id"],
        "name" => $p["product_name"],
        "image" => $p["product_image"] ?: "products/no_photo.jpg",
        "price" => (float)$p["price"],
        "subcategory" => $p["subcategory"] === "Empty" ? "" : $p["subcategory"]
    ], $products),
    "shops" => array_map(fn($s) => [
        "id" => (int)$s["user_id"],
        "name" => $s["name"],
        "avatar" => $s["profile_picture"]
    ], $shops)
]);
