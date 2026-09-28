<?php

/*
|--------------------------------------------------------------------------
| PAYMONGO API (Checkout Sessions + Refunds)
|--------------------------------------------------------------------------
|
| Punlaan sends the customer to PayMongo's hosted checkout page, then
| checks the result when they come back (no webhooks needed — free
| hosting blocks incoming requests from PayMongo).
|
|   paymongoCreateCheckout($order, $lines, $method, $successUrl, $cancelUrl)
|   paymongoGetCheckout($checkoutId)
|   paymongoRefund($paymentId, $amount, $note)
|
| Amounts are sent in centavos (₱1.00 = 100).
| Docs: https://developers.paymongo.com/reference
|
*/

require_once __DIR__ . "/paymongo_config.php";

const PAYMONGO_API = "https://api.paymongo.com/v1";

// Punlaan payment method → PayMongo payment method type
const PAYMONGO_METHODS = [
    "gcash" => "gcash",
    "maya" => "paymaya",
    "card" => "card",
];


function paymongoRequest(string $method, string $path, ?array $body = null): array
{
    if (!paymongoIsConfigured()) {
        throw new RuntimeException("PayMongo keys are not set up.");
    }

    $ch = curl_init(PAYMONGO_API . $path);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_USERPWD => PAYMONGO_SECRET_KEY . ":",
        CURLOPT_HTTPHEADER => ["Accept: application/json", "Content-Type: application/json"],
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException("Could not reach PayMongo: " . $curlError);
    }

    $json = json_decode($response, true) ?: [];

    if ($status >= 400) {
        $detail = $json["errors"][0]["detail"] ?? ("HTTP " . $status);
        error_log("Punlaan PayMongo $method $path → $status: $response");
        throw new RuntimeException("PayMongo: " . $detail);
    }

    return $json["data"] ?? [];
}


/*
 * $lines  = [[name, quantity, unitPrice], …] — must add up to the order total
 * $method = gcash | maya | card
 * Returns ["id" => checkout id, "url" => page to send the customer to]
 */
function paymongoCreateCheckout(array $order, array $lines, string $method, string $successUrl, string $cancelUrl): array
{
    $lineItems = array_map(fn($l) => [
        "name" => mb_substr($l[0], 0, 255),
        "quantity" => (int)$l[1],
        "amount" => (int)round($l[2] * 100),
        "currency" => "PHP",
    ], $lines);

    $data = paymongoRequest("POST", "/checkout_sessions", [
        "data" => [
            "attributes" => [
                "line_items" => $lineItems,
                "payment_method_types" => [PAYMONGO_METHODS[$method] ?? "gcash"],
                "success_url" => $successUrl,
                "cancel_url" => $cancelUrl,
                "reference_number" => $order["order_number"],
                "description" => "Punlaan order " . $order["order_number"],
                "show_description" => true,
                "show_line_items" => true,
                "send_email_receipt" => false,
            ]
        ]
    ]);

    return ["id" => $data["id"], "url" => $data["attributes"]["checkout_url"]];
}


/*
 * Returns ["paid" => bool, "payment_id" => pay_… or null]
 */
function paymongoGetCheckout(string $checkoutId): array
{
    $data = paymongoRequest("GET", "/checkout_sessions/" . rawurlencode($checkoutId));
    $attributes = $data["attributes"] ?? [];

    foreach ($attributes["payments"] ?? [] as $payment) {
        if (($payment["attributes"]["status"] ?? "") === "paid") {
            return ["paid" => true, "payment_id" => $payment["id"]];
        }
    }

    $intentStatus = $attributes["payment_intent"]["attributes"]["status"] ?? "";

    return ["paid" => $intentStatus === "succeeded", "payment_id" => null];
}


/* Returns the refund id (ref_…) */
function paymongoRefund(string $paymentId, float $amount, string $note): string
{
    $data = paymongoRequest("POST", "/refunds", [
        "data" => [
            "attributes" => [
                "amount" => (int)round($amount * 100),
                "payment_id" => $paymentId,
                "reason" => "requested_by_customer",
                "notes" => mb_substr($note, 0, 255),
            ]
        ]
    ]);

    return $data["id"] ?? "";
}
