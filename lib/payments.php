<?php

/*
|--------------------------------------------------------------------------
| REFUNDS
|--------------------------------------------------------------------------
|
|   refundOrderMoney($conn, $orderId, $amount, $note)
|
| Gives money back for part or all of an order:
|   paid with PayMongo (GCash/Maya/card) → refunded through PayMongo
|   paid in test mode                     → marked refunded (no real money)
|   cash on delivery (already paid)       → "manual": Punlaan returns the
|                                           cash by GCash/bank
|   not paid yet                          → nothing to refund
|
| Adds to orders.refunded_amount; the order becomes "refunded" once
| everything paid has been returned.
|
| Returns ["method" => paymongo|test|manual|none, "reference" => …, "amount" => …]
| Throws RuntimeException when PayMongo refuses the refund.
|
*/

require_once __DIR__ . "/../third_party/paymongo/paymongo.php";


function refundOrderMoney(mysqli $conn, int $orderId, float $amount, string $note): array
{
    $stmt = $conn->prepare("
        SELECT order_number, total_amount, payment_method, payment_status,
               paymongo_payment_id, refunded_amount
        FROM orders WHERE order_id = ?
    ");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order || $order["payment_status"] !== "paid") {
        return ["method" => "none", "reference" => null, "amount" => 0.0];
    }

    $amount = round(min($amount, (float)$order["total_amount"] - (float)$order["refunded_amount"]), 2);

    if ($amount <= 0) {
        return ["method" => "none", "reference" => null, "amount" => 0.0];
    }

    $reference = null;

    if ($order["payment_method"] === "cod") {
        $method = "manual";
    } elseif ($order["paymongo_payment_id"] && paymongoIsConfigured()) {
        $method = "paymongo";
        $reference = paymongoRefund($order["paymongo_payment_id"], $amount, $order["order_number"] . " — " . $note);
    } else {
        $method = "test";
    }

    $stmt = $conn->prepare("
        UPDATE orders
        SET refunded_amount = refunded_amount + ?,
            payment_status = IF(refunded_amount + 0.01 >= total_amount, 'refunded', payment_status)
        WHERE order_id = ?
    ");
    $stmt->bind_param("di", $amount, $orderId);
    $stmt->execute();
    $stmt->close();

    return ["method" => $method, "reference" => $reference, "amount" => $amount];
}


/* Words shown to people for each refund method */
function refundMethodText(string $method): string
{
    return [
        "paymongo" => "Refunded to the original GCash / Maya / card payment (PayMongo). It can take 5–10 banking days to appear.",
        "test" => "Refunded (test mode — no real money was charged).",
        "manual" => "Paid in cash on delivery — Punlaan will send the refund to the buyer by GCash or bank transfer.",
        "none" => "Nothing was paid yet, so there is nothing to refund.",
    ][$method] ?? "Refunded.";
}
