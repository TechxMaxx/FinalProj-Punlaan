<?php

header("Content-Type: application/json");

require_once __DIR__ . "/connection.php";


/* ==========================================
   GET PARAMETERS
========================================== */

$vendorId = (int)($_GET["vendor_id"] ?? 0);

if ($vendorId <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "No shop was selected."
    ]);

    exit;
}


/* ==========================================
   SHOP (VENDOR)
   Only verified, active vendors have a shop
========================================== */

$stmt = $conn->prepare("
    SELECT
        user_id,
        first_name,
        last_name,
        store_name,
        store_description,
        store_banner,
        store_links,
        profile_picture,
        bio,
        created_at
    FROM users
    WHERE user_id = ?
      AND is_vendor = 1
      AND verification_status = 2
      AND account_status = 0
    LIMIT 1
");

$stmt->bind_param("i", $vendorId);
$stmt->execute();

$vendor = $stmt->get_result()->fetch_assoc();

$stmt->close();

if (!$vendor) {

    echo json_encode([
        "success" => false,
        "message" => "This shop could not be found."
    ]);

    $conn->close();

    exit;
}


/* ==========================================
   PRODUCTS
   Same visibility rules as the Marketplace,
   plus how many of each were sold
========================================== */

$stmt = $conn->prepare("
    SELECT
        p.product_id,
        p.product_image,
        p.product_name,
        p.category,
        p.subcategory,
        p.location,
        p.price,
        p.stock,
        p.submitted_at,
        COALESCE(SUM(
            CASE WHEN oi.status <> 'cancelled' THEN oi.quantity ELSE 0 END
        ), 0) AS sold
    FROM product p
    LEFT JOIN order_items oi
        ON oi.product_id = p.product_id
    WHERE p.user_id = ?
      AND p.status = 1
      AND p.catalog_status = 3
      AND p.stock > 0
    GROUP BY p.product_id
    ORDER BY p.submitted_at DESC
");

$stmt->bind_param("i", $vendorId);
$stmt->execute();

$result = $stmt->get_result();

$products = [];
$locations = [];

while ($row = $result->fetch_assoc()) {

    if (empty($row["product_image"])) {
        $row["product_image"] = "products/no_photo.jpg";
    }

    $row["sold"] = (int)$row["sold"];

    if (!empty($row["location"])) {
        $locations[] = $row["location"];
    }

    $products[] = $row;
}

$stmt->close();


/* ==========================================
   TOTAL ITEMS SOLD BY THIS SHOP
========================================== */

$stmt = $conn->prepare("
    SELECT COALESCE(SUM(quantity), 0) AS sold
    FROM order_items
    WHERE vendor_id = ?
      AND status <> 'cancelled'
");

$stmt->bind_param("i", $vendorId);
$stmt->execute();

$totalSold = (int)$stmt->get_result()->fetch_assoc()["sold"];

$stmt->close();


/* ==========================================
   SHOP LOCATION
   Most common product location (the vendor's
   home address stays private)
========================================== */

// Storefront → Shop location ("Imus, Cavite"); otherwise the most
// common product location
require_once __DIR__ . "/../lib/shipping.php";

$shop = shopLocation($conn, (int)$vendor["user_id"]);
$location = $shop["label"] ?: null;

if (!$location && $locations) {
    $counts = array_count_values($locations);
    arsort($counts);
    $location = array_key_first($counts);
}


/* ==========================================
   SHOP RATING (all reviews of its products)
========================================== */

$stmt = $conn->prepare("SELECT COUNT(*), AVG(rating) FROM product_reviews WHERE vendor_id = ?");
$stmt->bind_param("i", $vendor["user_id"]);
$stmt->execute();
[$reviewCount, $reviewAverage] = $stmt->get_result()->fetch_row();
$stmt->close();
$conn->close();


/* ==========================================
   RESPONSE
========================================== */

$ownerName = trim($vendor["first_name"] . " " . $vendor["last_name"]);

$links = json_decode($vendor["store_links"] ?? "[]", true);

echo json_encode([

    "success" => true,

    "shop" => [
        "vendor_id" => (int)$vendor["user_id"],
        "store_name" => $vendor["store_name"] ?: $ownerName,
        "owner_name" => $ownerName,
        "bio" => $vendor["store_description"] ?: $vendor["bio"],
        // Paths are relative to the project root (uploads/…) or a full URL
        "avatar" => $vendor["profile_picture"],
        "banner" => $vendor["store_banner"],
        "links" => is_array($links) ? array_values($links) : [],
        "location" => $location,
        "free_ship_min" => $shop["free_min"],
        "joined" => $vendor["created_at"],
        "product_count" => count($products),
        "items_sold" => $totalSold,
        "rating" => $reviewCount ? round((float)$reviewAverage, 1) : 0,
        "review_count" => (int)$reviewCount
    ],

    "products" => $products

]);
