<?php

/*
|--------------------------------------------------------------------------
| BUYER: RATE A DELIVERED ITEM
|--------------------------------------------------------------------------
|
| POST JSON {order_item_id, rating (1–5), comment}
| One review per order item; sending again edits it.
| The seller is notified of new reviews.
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in first."]);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../../lib/notify.php";

$customerId = (int)$_SESSION["user_id"];
$input = json_decode(file_get_contents("php://input"), true) ?? [];

$orderItemId = (int)($input["order_item_id"] ?? 0);
$rating = (int)($input["rating"] ?? 0);
$comment = mb_substr(trim((string)($input["comment"] ?? "")), 0, 1000);

if ($rating < 1 || $rating > 5) {
    echo json_encode(["success" => false, "message" => "Please choose 1 to 5 stars."]);
    exit;
}

$stmt = $conn->prepare("
    SELECT oi.order_item_id, oi.product_id, oi.vendor_id, oi.product_name, oi.status,
           r.review_id
    FROM order_items oi
    INNER JOIN orders o ON o.order_id = oi.order_id
    LEFT JOIN product_reviews r ON r.order_item_id = oi.order_item_id
    WHERE oi.order_item_id = ? AND o.customer_id = ?
");
$stmt->bind_param("ii", $orderItemId, $customerId);
$stmt->execute();
$item = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$item || $item["status"] !== "completed") {
    echo json_encode(["success" => false, "message" => "You can rate an item once it's delivered."]);
    exit;
}

$comment = $comment !== "" ? $comment : null;

if ($item["review_id"]) {

    $stmt = $conn->prepare("UPDATE product_reviews SET rating = ?, comment = ? WHERE review_id = ?");
    $stmt->bind_param("isi", $rating, $comment, $item["review_id"]);
    $stmt->execute();
    $stmt->close();

    echo json_encode(["success" => true, "message" => "Review updated. Thank you!"]);
    exit;
}

$stmt = $conn->prepare("
    INSERT INTO product_reviews (order_item_id, product_id, vendor_id, customer_id, rating, comment)
    VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->bind_param("iiiiis", $orderItemId, $item["product_id"], $item["vendor_id"], $customerId, $rating, $comment);
$stmt->execute();
$reviewId = (int)$stmt->insert_id;
$stmt->close();

notifyUser($conn, (int)$item["vendor_id"], "New $rating-star review",
    "A buyer rated {$item["product_name"]} $rating/5" . ($comment ? ": \"" . mb_substr($comment, 0, 120) . "\"" : ".")
        . " You can reply in Reviews.",
    "MyAccount/vendor/Reviews.html?review=$reviewId", ["subject" => "New review for {$item["product_name"]}", "button" => "Read and reply"]);

echo json_encode(["success" => true, "message" => "Thanks for your review!"]);
