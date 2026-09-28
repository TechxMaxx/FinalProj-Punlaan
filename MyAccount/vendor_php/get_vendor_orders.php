<?php

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "message" => "Not logged in."
    ]);

    exit;
}

$vendor_id =
    (int)$_SESSION["user_id"];


require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../shared/order_flow.php";


$sql = "

    SELECT

        oi.order_item_id AS id,
        o.order_id,

        o.order_number,
        o.order_date,
        o.payment_method,
        o.payment_status,

        oi.product_name,
        oi.product_image,

        oi.quantity,

        oi.total_price AS total_amount,

        oi.status,
        oi.status_note,
        oi.unit_price,

        o.shipping_address,
        o.shipping_lat,
        o.shipping_lng,

        c.phone AS customer_phone,
        o.customer_id,

        s.shipping_fee AS seller_shipping_fee,
        s.distance_km,
        s.zone AS shipping_zone,
        s.courier,
        s.tracking_number,

        rr.status AS return_status,

        CONCAT(
            c.first_name,
            ' ',
            c.last_name
        ) AS customer_name

    FROM order_items oi

    INNER JOIN orders o
        ON oi.order_id = o.order_id

    INNER JOIN users c
        ON o.customer_id = c.user_id

    LEFT JOIN order_shipments s
        ON s.order_id = o.order_id AND s.vendor_id = oi.vendor_id

    LEFT JOIN return_requests rr
        ON rr.order_item_id = oi.order_item_id

    WHERE oi.vendor_id = ?

    ORDER BY o.order_date DESC

";


$stmt = $conn->prepare($sql);

$stmt->bind_param(
    "i",
    $vendor_id
);

$stmt->execute();

$result = $stmt->get_result();

$orders = [];

while (
    $row = $result->fetch_assoc()
) {

    $row["id"] =
        (int)$row["id"];

    $row["quantity"] =
        (int)$row["quantity"];

    $row["total_amount"] =
        (float)$row["total_amount"];

    $row["unit_price"] =
        (float)$row["unit_price"];

    $row["shipping_lat"] =
        $row["shipping_lat"] !== null ? (float)$row["shipping_lat"] : null;

    $row["shipping_lng"] =
        $row["shipping_lng"] !== null ? (float)$row["shipping_lng"] : null;

    // Which statuses the seller may choose next (see shared/order_flow.php)
    $row["next_statuses"] =
        allowedNextStatuses('vendor', $row["status"]);

    // GCash / Maya / card not paid yet → can't be packed
    $row["awaiting_payment"] =
        $row["payment_method"] !== 'cod' && $row["payment_status"] === 'unpaid';

    if ($row["awaiting_payment"]) {
        $row["next_statuses"] = array_values(array_diff($row["next_statuses"], ['packed']));
    }

    $row["seller_shipping_fee"] =
        $row["seller_shipping_fee"] !== null ? (float)$row["seller_shipping_fee"] : null;

    $orders[] = $row;
}


// "From" block on the packing slip
$stmt2 = $conn->prepare("
    SELECT COALESCE(NULLIF(store_name, ''), CONCAT(first_name, ' ', last_name)) AS name,
           phone, shop_city, shop_province
    FROM users WHERE user_id = ?
");
$stmt2->bind_param("i", $vendor_id);
$stmt2->execute();
$seller = $stmt2->get_result()->fetch_assoc();
$stmt2->close();

echo json_encode([
    "success" => true,
    "orders" => $orders,
    "couriers" => COURIERS,
    "seller" => $seller
]);


$stmt->close();

$conn->close();

?>