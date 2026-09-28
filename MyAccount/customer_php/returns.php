<?php

/*
|--------------------------------------------------------------------------
| BUYER: RETURN / REFUND REQUESTS
|--------------------------------------------------------------------------
|
| POST (form data) action=request  order_item_id, reason, details, photo (optional)
| POST (form data) action=escalate return_id, note   → ask Punlaan to review
| POST (form data) action=withdraw return_id          → cancel the request
|
| Rules are in lib/returns.php.
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
require_once __DIR__ . "/upload_helpers.php";

$customerId = (int)$_SESSION["user_id"];
$action = $_POST["action"] ?? "";

function done(array $data): void
{
    echo json_encode($data);
    exit;
}


/* ---------- ask for a return ---------- */

if ($action === "request") {

    $orderItemId = (int)($_POST["order_item_id"] ?? 0);
    $reason = trim((string)($_POST["reason"] ?? ""));
    $details = trim((string)($_POST["details"] ?? ""));

    if (!in_array($reason, RETURN_REASONS, true)) {
        done(["success" => false, "message" => "Please choose a reason."]);
    }

    if (mb_strlen($details) < 10) {
        done(["success" => false, "message" => "Please describe the problem (at least 10 characters)."]);
    }

    $days = (int)setting($conn, "return_days");

    $stmt = $conn->prepare("
        SELECT oi.order_item_id, oi.order_id, oi.vendor_id, oi.product_name, oi.quantity, oi.total_price,
               oi.status, oi.completed_at, o.order_number,
               (SELECT COUNT(*) FROM return_requests rr WHERE rr.order_item_id = oi.order_item_id) AS has_return
        FROM order_items oi
        INNER JOIN orders o ON o.order_id = oi.order_id
        WHERE oi.order_item_id = ? AND o.customer_id = ?
    ");
    $stmt->bind_param("ii", $orderItemId, $customerId);
    $stmt->execute();
    $item = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$item || $item["status"] !== "completed") {
        done(["success" => false, "message" => "You can ask for a return once the order is delivered."]);
    }

    if ((int)$item["has_return"] > 0) {
        done(["success" => false, "message" => "You already asked for a return for this item."]);
    }

    if (!$item["completed_at"] || strtotime($item["completed_at"]) < time() - $days * 86400) {
        done(["success" => false, "message" => "Returns are only possible within $days days after delivery."]);
    }

    $photo = null;
    if (!empty($_FILES["photo"]) && ($_FILES["photo"]["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        try {
            $photo = saveUpload($_FILES["photo"], "returns", UPLOAD_TYPES_IMAGE, 3 * 1048576);
        } catch (RuntimeException $e) {
            done(["success" => false, "message" => $e->getMessage()]);
        }
    }

    $details = mb_substr($details, 0, 1000);
    $amount = (float)$item["total_price"];

    $stmt = $conn->prepare("
        INSERT INTO return_requests (order_item_id, order_id, customer_id, vendor_id, reason, details, photo, refund_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("iiiisssd", $orderItemId, $item["order_id"], $customerId, $item["vendor_id"], $reason, $details, $photo, $amount);
    $stmt->execute();
    $returnId = (int)$stmt->insert_id;
    $stmt->close();

    notifyUser($conn, (int)$item["vendor_id"], "Return requested",
        "A buyer asked for a return of {$item["product_name"]} (order {$item["order_number"]}): $reason. Please accept or decline it.",
        sellerReturnLink(["return_id" => $returnId]),
        [
            "subject" => "Return requested — order {$item["order_number"]}",
            "intro" => "A buyer asked to return {$item["product_name"]} × {$item["quantity"]}.\nReason: $reason\n\"$details\"\n\nPlease accept (refund " . peso($amount) . ") or decline it in Order Processing → Returns.",
            "button" => "Review the return",
        ]);

    done(["success" => true, "message" => "Return requested. The seller will reply soon."]);
}


/* ---------- seller declined → ask Punlaan to review ---------- */

if ($action === "escalate" || $action === "withdraw") {

    $return = loadReturn($conn, (int)($_POST["return_id"] ?? 0));

    if (!$return || (int)$return["customer_id"] !== $customerId) {
        done(["success" => false, "message" => "Return not found."]);
    }

    if ($action === "withdraw") {

        if (!in_array($return["status"], ["requested", "rejected"], true)) {
            done(["success" => false, "message" => "This return can't be withdrawn anymore."]);
        }

        $stmt = $conn->prepare("UPDATE return_requests SET status = 'cancelled', resolved_at = NOW() WHERE return_id = ?");
        $stmt->bind_param("i", $return["return_id"]);
        $stmt->execute();
        $stmt->close();

        notifyUser($conn, (int)$return["vendor_id"], "Return withdrawn",
            "The buyer withdrew the return for {$return["product_name"]} (order {$return["order_number"]}).",
            sellerReturnLink($return), false);

        done(["success" => true, "message" => "Return withdrawn."]);
    }

    if ($return["status"] !== "rejected") {
        done(["success" => false, "message" => "You can ask Punlaan to review only after the seller declines."]);
    }

    $note = mb_substr(trim((string)($_POST["note"] ?? "")), 0, 1000);

    if (mb_strlen($note) < 10) {
        done(["success" => false, "message" => "Tell Punlaan why you disagree (at least 10 characters)."]);
    }

    $stmt = $conn->prepare("UPDATE return_requests SET status = 'disputed', dispute_note = ? WHERE return_id = ?");
    $stmt->bind_param("si", $note, $return["return_id"]);
    $stmt->execute();
    $stmt->close();

    notifyUser($conn, (int)$return["vendor_id"], "Buyer opened a dispute",
        "The buyer asked Punlaan to review the declined return for {$return["product_name"]} (order {$return["order_number"]}). An admin will decide.",
        sellerReturnLink($return), ["subject" => "Dispute opened — order {$return["order_number"]}"]);

    done(["success" => true, "message" => "Sent to Punlaan. An admin will review it and decide."]);
}

done(["success" => false, "message" => "Unknown action."]);
