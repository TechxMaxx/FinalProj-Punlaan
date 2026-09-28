<?php

/*
|--------------------------------------------------------------------------
| SELLER: REVIEWS OF MY PRODUCTS
|--------------------------------------------------------------------------
|
| GET                              → summary + every review
| POST JSON {review_id, reply}     → public reply (empty = remove reply)
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

$vendorId = (int)$_SESSION["user_id"];


if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $input = json_decode(file_get_contents("php://input"), true) ?? [];
    $reviewId = (int)($input["review_id"] ?? 0);
    $reply = mb_substr(trim((string)($input["reply"] ?? "")), 0, 1000);

    $stmt = $conn->prepare("SELECT review_id, customer_id, seller_reply, order_item_id FROM product_reviews WHERE review_id = ? AND vendor_id = ?");
    $stmt->bind_param("ii", $reviewId, $vendorId);
    $stmt->execute();
    $review = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$review) {
        echo json_encode(["success" => false, "message" => "Review not found."]);
        exit;
    }

    $replyValue = $reply !== "" ? $reply : null;

    $stmt = $conn->prepare("UPDATE product_reviews SET seller_reply = ?, replied_at = IF(? IS NULL, NULL, NOW()) WHERE review_id = ?");
    $stmt->bind_param("ssi", $replyValue, $replyValue, $reviewId);
    $stmt->execute();
    $stmt->close();

    if ($replyValue && !$review["seller_reply"]) {
        notifyUser($conn, (int)$review["customer_id"], "The seller replied to your review",
            "\"" . mb_substr($reply, 0, 160) . "\"", "MyAccount/customer/MyOrders.html?item=" . (int)$review["order_item_id"], false);
    }

    echo json_encode(["success" => true, "message" => $replyValue ? "Reply posted." : "Reply removed."]);
    exit;
}


$stmt = $conn->prepare("
    SELECT r.review_id, r.rating, r.comment, r.seller_reply, r.replied_at, r.created_at,
           r.product_id, p.product_name, p.product_image,
           c.first_name, c.last_name, c.profile_picture
    FROM product_reviews r
    LEFT JOIN product p ON p.product_id = r.product_id
    INNER JOIN users c ON c.user_id = r.customer_id
    WHERE r.vendor_id = ?
    ORDER BY r.created_at DESC
");
$stmt->bind_param("i", $vendorId);
$stmt->execute();
$reviews = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$breakdown = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
$total = 0;

foreach ($reviews as &$r) {
    $r["review_id"] = (int)$r["review_id"];
    $r["rating"] = (int)$r["rating"];
    $r["customer"] = trim($r["first_name"] . " " . mb_substr((string)$r["last_name"], 0, 1) . ".");
    unset($r["first_name"], $r["last_name"]);
    $breakdown[$r["rating"]]++;
    $total += $r["rating"];
}

echo json_encode([
    "success" => true,
    "average" => $reviews ? round($total / count($reviews), 1) : 0,
    "count" => count($reviews),
    "breakdown" => $breakdown,
    "unanswered" => count(array_filter($reviews, fn($r) => !$r["seller_reply"])),
    "reviews" => $reviews
]);
