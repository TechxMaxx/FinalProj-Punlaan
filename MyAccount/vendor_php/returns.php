<?php

/*
|--------------------------------------------------------------------------
| SELLER: RETURN REQUESTS
|--------------------------------------------------------------------------
|
| GET                               → returns for this seller's items
| POST JSON {action: "accept", return_id, note}   → refund the buyer
| POST JSON {action: "reject", return_id, note}   → decline (note required)
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in first."]);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../../lib/returns.php";

$vendorId = (int)$_SESSION["user_id"];


/* ---------- list ---------- */

if ($_SERVER["REQUEST_METHOD"] !== "POST") {

    $stmt = $conn->prepare("
        SELECT rr.return_id, rr.order_item_id, rr.reason, rr.details, rr.photo, rr.refund_amount, rr.status,
               rr.seller_note, rr.dispute_note, rr.admin_note, rr.refund_method, rr.created_at, rr.resolved_at,
               oi.product_name, oi.product_image, oi.quantity, o.order_number,
               CONCAT(c.first_name, ' ', c.last_name) AS customer_name
        FROM return_requests rr
        INNER JOIN order_items oi ON oi.order_item_id = rr.order_item_id
        INNER JOIN orders o ON o.order_id = rr.order_id
        INNER JOIN users c ON c.user_id = rr.customer_id
        WHERE rr.vendor_id = ?
        ORDER BY (rr.status = 'requested') DESC, rr.created_at DESC
    ");
    $stmt->bind_param("i", $vendorId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($rows as &$row) {
        $row["return_id"] = (int)$row["return_id"];
        $row["refund_amount"] = (float)$row["refund_amount"];
        $row["status_label"] = RETURN_STATUS_LABELS[$row["status"]] ?? $row["status"];
    }

    echo json_encode(["success" => true, "returns" => $rows]);
    exit;
}


/* ---------- accept / reject ---------- */

$input = json_decode(file_get_contents("php://input"), true) ?? [];
$action = $input["action"] ?? "";
$note = mb_substr(trim((string)($input["note"] ?? "")), 0, 1000);

$return = loadReturn($conn, (int)($input["return_id"] ?? 0));

if (!$return || (int)$return["vendor_id"] !== $vendorId) {
    echo json_encode(["success" => false, "message" => "Return not found."]);
    exit;
}

if ($return["status"] !== "requested") {
    echo json_encode(["success" => false, "message" => "This return was already answered."]);
    exit;
}

if ($action === "accept") {

    try {
        $message = refundReturn($conn, $return, "seller", $note);
    } catch (Throwable $e) {
        echo json_encode(["success" => false, "message" => "The refund couldn't be sent: " . $e->getMessage()]);
        exit;
    }

    echo json_encode(["success" => true, "message" => $message]);
    exit;
}

if ($action === "reject") {

    if (mb_strlen($note) < 10) {
        echo json_encode(["success" => false, "message" => "Please tell the buyer why (at least 10 characters)."]);
        exit;
    }

    $stmt = $conn->prepare("UPDATE return_requests SET status = 'rejected', seller_note = ? WHERE return_id = ?");
    $stmt->bind_param("si", $note, $return["return_id"]);
    $stmt->execute();
    $stmt->close();

    notifyUser($conn, (int)$return["customer_id"], "Return declined",
        "The seller declined your return for {$return["product_name"]} (order {$return["order_number"]}): \"$note\". "
            . "If you disagree, open My Orders and ask Punlaan to review it.",
        buyerReturnLink($return), ["subject" => "Your return for order {$return["order_number"]}", "button" => "View my orders"]);

    echo json_encode(["success" => true, "message" => "Return declined. The buyer can still ask Punlaan to review it."]);
    exit;
}

echo json_encode(["success" => false, "message" => "Unknown action."]);
