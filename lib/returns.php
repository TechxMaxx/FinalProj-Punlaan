<?php

/*
|--------------------------------------------------------------------------
| RETURNS, REFUNDS & DISPUTES
|--------------------------------------------------------------------------
|
|   Buyer   asks for a return/refund within N days of delivery
|           (Admin → Settings → Marketplace rules → return_days, default 7)
|   Seller  accepts → the item is refunded
|           rejects → the buyer may ask Punlaan to step in (dispute)
|   Admin   decides a dispute: refund the buyer, or close it for the seller
|
| status: requested | rejected | disputed | refunded | closed | cancelled
|
*/

require_once __DIR__ . "/order_events.php";
require_once __DIR__ . "/settings.php";

const RETURN_REASONS = [
    "Arrived damaged or dead",
    "Wrong item",
    "Missing item",
    "Not as described",
    "Other",
];

const RETURN_STATUS_LABELS = [
    "requested" => "Waiting for the seller",
    "rejected" => "Seller declined",
    "disputed" => "Punlaan is reviewing",
    "refunded" => "Refunded",
    "closed" => "Closed — no refund",
    "cancelled" => "Withdrawn",
];


// Links that open the page scrolled to this return
function buyerReturnLink(array $return): string
{
    return buyerOrderLink((int)$return["order_id"], (int)$return["order_item_id"]);
}

function sellerReturnLink(array $return): string
{
    return "MyAccount/vendor/OrderProcessing.html?return=" . (int)$return["return_id"] . "#returns";
}


function loadReturn(mysqli $conn, int $returnId): ?array
{
    $stmt = $conn->prepare("
        SELECT rr.*, oi.product_name, oi.quantity, o.order_number
        FROM return_requests rr
        INNER JOIN order_items oi ON oi.order_item_id = rr.order_item_id
        INNER JOIN orders o ON o.order_id = rr.order_id
        WHERE rr.return_id = ?
    ");
    $stmt->bind_param("i", $returnId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ?: null;
}


/*
 * Refund a return (seller accepted, or admin decided for the buyer).
 * Returns the message shown to the person who clicked.
 * Throws RuntimeException if PayMongo refuses the refund.
 */
function refundReturn(mysqli $conn, array $return, string $by, string $note): string
{
    $refund = refundOrderMoney($conn, (int)$return["order_id"], (float)$return["refund_amount"],
        "Return: " . $return["product_name"]);

    // COD that wasn't marked paid, or already refunded: nothing more to send
    $method = $refund["method"] === "none" ? "manual" : $refund["method"];

    $noteColumn = $by === "admin" ? "admin_note" : "seller_note";

    $stmt = $conn->prepare("
        UPDATE return_requests
        SET status = 'refunded', $noteColumn = ?, refund_method = ?, refund_reference = ?, resolved_at = NOW()
        WHERE return_id = ?
    ");
    $stmt->bind_param("sssi", $note, $method, $refund["reference"], $return["return_id"]);
    $stmt->execute();
    $stmt->close();

    $what = "{$return["product_name"]} (order {$return["order_number"]})";
    $amount = peso($return["refund_amount"]);

    notifyUser($conn, (int)$return["customer_id"], "Return approved — refund on the way",
        ($by === "admin" ? "Punlaan reviewed your case and approved" : "The seller approved")
            . " your return for $what. $amount refund: " . refundMethodText($method),
        buyerReturnLink($return), ["subject" => "Refund for order {$return["order_number"]}", "button" => "View my orders"]);

    if ($by === "admin") {
        notifyUser($conn, (int)$return["vendor_id"], "Dispute decided: buyer refunded",
            "Punlaan reviewed the dispute for $what and refunded the buyer $amount. It won't count toward your earnings."
                . ($note !== "" ? " Note: $note" : ""),
            sellerReturnLink($return), ["subject" => "Dispute decided — {$return["order_number"]}"]);
    }

    return "Refunded $amount. " . refundMethodText($method);
}


/* Admin decided a dispute for the seller */
function closeReturn(mysqli $conn, array $return, string $note): void
{
    $stmt = $conn->prepare("UPDATE return_requests SET status = 'closed', admin_note = ?, resolved_at = NOW() WHERE return_id = ?");
    $stmt->bind_param("si", $note, $return["return_id"]);
    $stmt->execute();
    $stmt->close();

    $what = "{$return["product_name"]} (order {$return["order_number"]})";

    notifyUser($conn, (int)$return["customer_id"], "Dispute decided",
        "Punlaan reviewed your return for $what and couldn't approve a refund." . ($note !== "" ? " Reason: $note" : ""),
        buyerReturnLink($return), ["subject" => "Your dispute for order {$return["order_number"]}", "button" => "View my orders"]);

    notifyUser($conn, (int)$return["vendor_id"], "Dispute decided in your favor",
        "Punlaan reviewed the dispute for $what and closed it without a refund.",
        sellerReturnLink($return), ["subject" => "Dispute decided — {$return["order_number"]}"]);
}
