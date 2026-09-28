<?php

/*
|--------------------------------------------------------------------------
| CATEGORIES & TAXONOMY (admin, read-only)
|--------------------------------------------------------------------------
|
| The category list (categories table — edited with save_category.php),
| plus every product in them.
|
| product.status          0 pending, 1 approved, 2 rejected, 3 deleted by seller
| product.catalog_status  3 = shown in the Marketplace, anything else = hidden
|
*/

require_once __DIR__ . "/admin_auth.php";
require_once __DIR__ . "/connection.php";

header("Content-Type: application/json");

require_once __DIR__ . "/../lib/categories.php";

try {

    // Hidden ones too, so the admin can show them again
    $tree = categoryTree($conn, true);
    $categories = array_column($tree, "name");
    $subcategories = [];
    foreach ($tree as $main) {
        foreach ($main["children"] as $child) $subcategories[] = $child["name"];
    }

    $rows = $conn->query("
        SELECT
            p.product_id,
            p.product_name,
            p.product_image,
            p.category,
            p.subcategory,
            p.price,
            p.stock,
            p.status,
            p.catalog_status,
            p.submitted_at,
            u.verification_status,
            u.account_status,
            COALESCE(NULLIF(u.store_name, ''), CONCAT(u.first_name, ' ', u.last_name)) AS vendor
        FROM product p
        INNER JOIN users u ON u.user_id = p.user_id
        WHERE p.status <> 3
        ORDER BY p.submitted_at DESC
    ")->fetch_all(MYSQLI_ASSOC);

    $products = array_map(function ($p) {

        if ((int)$p["status"] === 0) {
            $state = "Pending";
        } elseif ((int)$p["status"] === 2) {
            $state = "Rejected";
        } elseif ((int)$p["catalog_status"] !== 3 || (int)$p["account_status"] !== 0 || (int)$p["verification_status"] !== 2) {
            $state = "Hidden";
        } elseif ((int)$p["stock"] <= 0) {
            $state = "Out of Stock";
        } else {
            $state = "Live";
        }

        return [
            "product_id" => (int)$p["product_id"],
            "name" => $p["product_name"],
            "image" => $p["product_image"],
            "category" => $p["category"],
            "subcategory" => (string)$p["subcategory"],
            "vendor" => $p["vendor"],
            "price" => (float)$p["price"],
            "stock" => (int)$p["stock"],
            "state" => $state,
            "submitted_at" => $p["submitted_at"]
        ];
    }, $rows);

    echo json_encode([
        "success" => true,
        "categories" => $categories,
        "subcategories" => $subcategories,
        "tree" => $tree,
        "products" => $products
    ]);

} catch (Throwable $e) {

    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Could not load categories."]);
}

$conn->close();
