<?php

// Admins only
require_once __DIR__ . "/admin_auth.php";
header("Content-Type: application/json");

require_once "connection.php";

$sql = "
SELECT
   p.product_id,
    p.product_image,
    p.product_name,
    CONCAT(u.first_name, ' ', u.last_name) AS vendor,
    u.store_name,
    'Vendor' AS vendorType,
    p.category,
    p.price,
    p.stock,
    p.submitted_at,
    p.status,
    p.rejection_reason
FROM product p
INNER JOIN users u
    ON p.user_id = u.user_id
ORDER BY p.submitted_at DESC
";

$result = $conn->query($sql);

$listings = [];

if ($result) {

    while ($row = $result->fetch_assoc()) {

        switch ((int)$row["status"]) {
            case 0:
                $status = "Pending";
                break;

            case 1:
                $status = "Approved";
                break;

            case 2:
                $status = "Rejected";
                break;

            default:
                $status = "Unknown";
        }

       $listings[] = [
    "id" => "L-" . $row["product_id"],
    "product_id" => (int)$row["product_id"],
    "product" => $row["product_name"],
    "product_image" => $row["product_image"],
    "vendor" => $row["vendor"],
    "storeName" => $row["store_name"],   // NEW
    "vendorType" => $row["vendorType"],
    "category" => $row["category"],
    "price" => (float)$row["price"],
    "stock" => (int)$row["stock"],
    "submitted" => date("M j, Y", strtotime($row["submitted_at"])),
    "status" => $status,
    "note" => $row["rejection_reason"] ?? ""
];
    }
}

echo json_encode($listings);

$conn->close();
?>