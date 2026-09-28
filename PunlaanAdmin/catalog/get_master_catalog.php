<?php

// Admins only
require_once __DIR__ . "/../admin_auth.php";
header("Content-Type: application/json");

require_once "../connection.php";

$sql = "
SELECT
    product_id,
    product_name,
    category,
    price,
    stock,
    catalog_status
FROM product
WHERE status = 1
ORDER BY product_name
";

$result = $conn->query($sql);

$catalog = [];

while ($row = $result->fetch_assoc()) {

    switch ((int)$row["catalog_status"]) {

        case 1:
            $status = "Hidden";
            break;

        case 2:
            $status = "Review";
            break;

        case 3:
            $status = "Active";
            break;

        default:
            $status = "Hidden";
    }

    $catalog[] = [
        "id" => "CAT-" . $row["product_id"],
        "product_id" => (int)$row["product_id"],
        "product" => $row["product_name"],
        "category" => $row["category"],
        "vendors" => 1,
        "totalStock" => (int)$row["stock"],
        "avgPrice" => (float)$row["price"],
        "status" => $status
    ];
}

echo json_encode($catalog);

$conn->close();