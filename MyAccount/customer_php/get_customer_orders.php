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

$user_id = (int)$_SESSION["user_id"];


require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../shared/order_flow.php";
require_once __DIR__ . "/../../lib/returns.php";

$returnDays = (int)setting($conn, "return_days");


$sql = "

    SELECT

        oi.order_item_id AS id,

        o.order_id,
        o.order_number,
        o.order_date,
        o.payment_method,
        o.payment_status,

        oi.product_id,
        oi.product_name,
        oi.product_image,

        oi.quantity,
        oi.total_price AS total_amount,

        oi.status,
        oi.status_note,
        oi.vendor_id,
        oi.completed_at,

        o.shipping_address,

        COALESCE(
            NULLIF(v.store_name, ''),
            CONCAT(v.first_name, ' ', v.last_name)
        ) AS vendor_name,

        s.shipping_fee AS seller_shipping_fee,
        s.from_city AS ships_from,
        s.distance_km,
        s.zone AS shipping_zone,
        s.courier,
        s.tracking_number,

        r.rating AS review_rating,
        r.comment AS review_comment,
        r.seller_reply AS review_reply,

        rr.return_id,
        rr.status AS return_status,
        rr.reason AS return_reason,
        rr.seller_note AS return_seller_note,
        rr.admin_note AS return_admin_note,
        rr.refund_method AS return_refund_method

    FROM orders o

    INNER JOIN order_items oi
        ON o.order_id = oi.order_id

    INNER JOIN users v
        ON oi.vendor_id = v.user_id

    LEFT JOIN order_shipments s
        ON s.order_id = o.order_id AND s.vendor_id = oi.vendor_id

    LEFT JOIN product_reviews r
        ON r.order_item_id = oi.order_item_id

    LEFT JOIN return_requests rr
        ON rr.order_item_id = oi.order_item_id

    WHERE o.customer_id = ?

    ORDER BY o.order_date DESC, oi.order_item_id

";


$stmt = $conn->prepare($sql);

$stmt->bind_param(
    "i",
    $user_id
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

    // What the customer can do now (see shared/order_flow.php)
    $next = allowedNextStatuses('customer', $row["status"]);
    $row["can_cancel"] = in_array('cancelled', $next, true);
    $row["can_confirm_received"] = in_array('completed', $next, true);

    // Online payment not done yet → "Pay now" (FrontEnd/Checkout/CONFIRM.html)
    $row["order_id"] = (int)$row["order_id"];
    $row["can_pay"] =
        $row["payment_method"] !== 'cod' &&
        $row["payment_status"] === 'unpaid' &&
        $row["status"] !== 'cancelled';

    $row["seller_shipping_fee"] =
        $row["seller_shipping_fee"] !== null ? (float)$row["seller_shipping_fee"] : null;

    // Ratings: once delivered
    $row["can_review"] = $row["status"] === 'completed';

    // Returns: within N days of delivery, one request per item
    $deadline = $row["completed_at"]
        ? strtotime($row["completed_at"]) + $returnDays * 86400
        : null;

    $row["return_deadline"] = $deadline ? date("Y-m-d H:i:s", $deadline) : null;
    $row["can_return"] =
        $row["status"] === 'completed' &&
        !$row["return_id"] &&
        $deadline && $deadline > time();

    $row["can_escalate"] = $row["return_status"] === 'rejected';
    $row["return_label"] = $row["return_status"] ? (RETURN_STATUS_LABELS[$row["return_status"]] ?? $row["return_status"]) : null;

    $orders[] = $row;
}


echo json_encode([
    "success" => true,
    "orders" => $orders,
    "return_days" => $returnDays,
    "return_reasons" => RETURN_REASONS
]);


$stmt->close();

$conn->close();

?>