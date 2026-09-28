<?php

/*
|--------------------------------------------------------------------------
| MARKETPLACE PRODUCTS
|--------------------------------------------------------------------------
|
| ?subcategory=All                   every product on sale
| ?subcategory=Vegetable Seedlings   one subcategory
| ?category=Seedlings                a whole main category
| ?q=tomato                          search product, shop and seller names
|
| Categories come from the categories table (Admin → Categories).
| Only live products are listed: approved, shown in the catalog, in
| stock, from an approved and active seller.
|
*/

header("Content-Type: application/json");

require_once __DIR__ . "/connection.php";
require_once __DIR__ . "/../lib/categories.php";


$subcategory = trim($_GET["subcategory"] ?? "");
$category = trim($_GET["category"] ?? "");
$search = trim($_GET["q"] ?? "");

function fail(string $message): void
{
    echo json_encode(["success" => false, "message" => $message, "products" => []]);
    exit;
}


/* ---------- what to show ---------- */

$where = "1 = 1";
$types = "";
$params = [];

if ($search !== "") {

    $pattern = "%" . $search . "%";
    $where = "(p.product_name LIKE ? OR COALESCE(u.store_name, '') LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)";
    $types = "sss";
    $params = [$pattern, $pattern, $pattern];

} elseif ($category !== "") {

    $names = array_column(categoryTree($conn), "name");
    if (!in_array($category, $names, true)) fail("Invalid category.");

    $where = "p.category = ?";
    $types = "s";
    $params = [$category];

} elseif ($subcategory === "All") {

    // every live product

} elseif ($subcategory !== "") {

    $subs = [];
    foreach (categoryTree($conn) as $main) {
        foreach ($main["children"] as $child) $subs[] = $child["name"];
    }
    if (!in_array($subcategory, $subs, true)) fail("Invalid subcategory.");

    $where = "p.subcategory = ?";
    $types = "s";
    $params = [$subcategory];

} else {
    fail("No category or search term was provided.");
}


$sql = "
    SELECT
        p.product_id,
        p.user_id,
        p.product_image,
        p.product_name,
        p.category,
        p.subcategory,
        p.description,
        p.location,
        p.price,
        p.stock,
        p.submitted_at,

        u.first_name,
        u.last_name,
        u.store_name,
        u.profile_picture,

        (SELECT ROUND(AVG(r.rating), 1) FROM product_reviews r WHERE r.product_id = p.product_id) AS rating,
        (SELECT COUNT(*) FROM product_reviews r WHERE r.product_id = p.product_id) AS review_count

    FROM product p
    INNER JOIN users u ON p.user_id = u.user_id

    WHERE $where
      AND p.status = 1
      AND p.catalog_status = 3
      AND p.stock > 0
      AND u.is_vendor = 1
      AND u.verification_status = 2
      AND u.account_status = 0

    ORDER BY p.submitted_at DESC
";

$stmt = $conn->prepare($sql);

if (!$stmt) fail("Failed to prepare database query.");

if ($types !== "") {
    $stmt->bind_param($types, ...$params);
}

if (!$stmt->execute()) fail("Failed to load products.");

$products = [];

foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {

    if (empty($row["product_image"])) {
        $row["product_image"] = "products/no_photo.jpg";
    }

    $row["rating"] = $row["rating"] !== null ? (float)$row["rating"] : 0;
    $row["review_count"] = (int)$row["review_count"];

    $products[] = $row;
}

$stmt->close();
$conn->close();

$response = ["success" => true, "count" => count($products), "products" => $products];

if ($search !== "") {
    $response["search"] = $search;
} else {
    $response["subcategory"] = $subcategory ?: null;
    $response["category"] = $category ?: null;
}

echo json_encode($response);
