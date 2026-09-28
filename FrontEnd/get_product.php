<?php

header("Content-Type: application/json");

require_once "connection.php";


/* ==========================================
   GET PRODUCT ID
========================================== */

$productId = trim(
    $_GET["product_id"] ?? ""
);


if ($productId === "") {

    echo json_encode([
        "success" => false,
        "message" => "No product ID was provided.",
        "product" => null
    ]);

    exit;

}


/* ==========================================
   GET PRODUCT
========================================== */

$sql = "

SELECT

    p.product_id,
    p.user_id,
    p.product_image,
    p.product_name,
    p.subcategory,
    p.description,
    p.location,
    p.price,
    p.stock,
    p.submitted_at,

    u.first_name,
    u.last_name,
    u.store_name,
    u.profile_picture

FROM product p

INNER JOIN users u
    ON p.user_id = u.user_id

WHERE

    p.product_id = ?

    AND p.status = 1

    AND p.catalog_status = 3

    AND u.is_vendor = 1

    AND u.verification_status = 2

    AND u.account_status = 0

LIMIT 1

";


$stmt =
    $conn->prepare($sql);


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare database query.",
        "product" => null
    ]);

    exit;

}


$stmt->bind_param(
    "s",
    $productId
);


if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to load product.",
        "product" => null
    ]);

    $stmt->close();
    $conn->close();

    exit;

}


/* ==========================================
   GET PRODUCT
========================================== */

$result =
    $stmt->get_result();


$product =
    $result->fetch_assoc();


if (!$product) {

    echo json_encode([
        "success" => false,
        "message" => "Product could not be found.",
        "product" => null
    ]);

    $stmt->close();
    $conn->close();

    exit;

}


/* ==========================================
   DEFAULT PRODUCT IMAGE
========================================== */

if (
    empty(
        $product["product_image"]
    )
) {

    $product["product_image"] =
        "products/no_photo.jpg";

}


/* ==========================================
   SELLER NAME
========================================== */

$product["seller_name"] =
    !empty($product["store_name"])
        ? $product["store_name"]
        : trim(
            ($product["first_name"] ?? "") .
            " " .
            ($product["last_name"] ?? "")
        );


/* ==========================================
   ALL PHOTOS (cover first)
========================================== */

$imgStmt = $conn->prepare("
    SELECT file_path
    FROM product_images
    WHERE product_id = ?
    ORDER BY sort_order, image_id
");
$imgStmt->bind_param("i", $product["product_id"]);
$imgStmt->execute();

$product["images"] = array_column(
    $imgStmt->get_result()->fetch_all(MYSQLI_ASSOC),
    "file_path"
);

$imgStmt->close();

if (!$product["images"]) {
    $product["images"] = [$product["product_image"]];
}


/* ==========================================
   SHIPS FROM + RATING
========================================== */

require_once __DIR__ . "/../lib/shipping.php";

$shop = shopLocation($conn, (int)$product["user_id"]);
$product["ships_from"] = $shop["label"] ?: null;
$product["free_ship_min"] = $shop["free_min"];   // seller's free-shipping offer (null = none)

if (empty($product["location"])) {
    $product["location"] = $product["ships_from"];
}

$rStmt = $conn->prepare("SELECT COUNT(*), AVG(rating) FROM product_reviews WHERE product_id = ?");
$rStmt->bind_param("i", $product["product_id"]);
$rStmt->execute();
[$reviewCount, $reviewAverage] = $rStmt->get_result()->fetch_row();
$rStmt->close();

$product["rating"] = $reviewCount ? round((float)$reviewAverage, 1) : 0;
$product["review_count"] = (int)$reviewCount;


/* ==========================================
   RETURN PRODUCT
========================================== */

echo json_encode([

    "success" => true,

    "product" =>
        $product

]);


$stmt->close();

$conn->close();

?>