<?php

/*
|--------------------------------------------------------------------------
| ORDER UPDATES → notifications + emails (like Shopee / Lazada)
|--------------------------------------------------------------------------
|
|   orderPlaced($conn, $orderId)
|       buyer: "Order placed"          sellers: "New order to pack"
|
|   orderItemChanged($conn, $item, $newStatus, $actor)
|       packed / shipping / shipped / delivered / cancelled → buyer
|       cancelled or received by the buyer                  → seller
|       + refunds the money when a paid item is cancelled
|
|   orderPaid($conn, $orderId)
|       buyer: payment received        sellers: "paid — pack it"
|
*/

require_once __DIR__ . "/notify.php";
require_once __DIR__ . "/payments.php";

const BUYER_ORDERS_PAGE = "MyAccount/customer/MyOrders.html";
const SELLER_ORDERS_PAGE = "MyAccount/vendor/OrderProcessing.html";

// Links that open the page scrolled to this order (and item)
function buyerOrderLink(int $orderId, ?int $itemId = null): string
{
    return BUYER_ORDERS_PAGE . "?order=$orderId" . ($itemId ? "&item=$itemId" : "");
}

function sellerOrderLink(int $orderId, ?int $itemId = null): string
{
    return SELLER_ORDERS_PAGE . "?order=$orderId" . ($itemId ? "&item=$itemId" : "");
}

const PAYMENT_NAMES = [
    "cod" => "Cash on Delivery",
    "gcash" => "GCash",
    "maya" => "Maya",
    "card" => "Credit / Debit Card",
];


function orderInfo(mysqli $conn, int $orderId): ?array
{
    $stmt = $conn->prepare("
        SELECT order_id, order_number, customer_id, subtotal, shipping_fee, total_amount,
               payment_method, payment_status, shipping_address
        FROM orders WHERE order_id = ?
    ");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $order ?: null;
}

function orderLines(mysqli $conn, int $orderId, ?int $vendorId = null): array
{
    $sql = "SELECT product_name, quantity, total_price, vendor_id FROM order_items WHERE order_id = ?";
    $sql .= $vendorId ? " AND vendor_id = ?" : "";

    $stmt = $conn->prepare($sql . " ORDER BY order_item_id");
    $vendorId ? $stmt->bind_param("ii", $orderId, $vendorId) : $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return $rows;
}

function peso($value): string
{
    return "₱" . number_format((float)$value, 2);
}


/* ---------- new order ---------- */

function orderPlaced(mysqli $conn, int $orderId): void
{
    $order = orderInfo($conn, $orderId);
    if (!$order) return;

    $lines = orderLines($conn, $orderId);
    $payment = PAYMENT_NAMES[$order["payment_method"]] ?? "Cash on Delivery";
    $online = $order["payment_method"] !== "cod";

    notifyUser(
        $conn,
        (int)$order["customer_id"],
        "Order placed",
        "Your order {$order["order_number"]} (" . peso($order["total_amount"]) . ") was placed. "
            . ($online ? "Complete the $payment payment so the seller can pack it." : "Pay the rider when it arrives."),
        buyerOrderLink((int)$order["order_id"]),
        [
            "subject" => "Order {$order["order_number"]} placed",
            "intro" => "Thanks for shopping on Punlaan! Here's your order. "
                . ($online ? "Please finish the $payment payment — the seller starts packing once it's paid."
                           : "You'll pay the rider in cash when it arrives."),
            "items" => array_map(fn($l) => [$l["product_name"], $l["quantity"], $l["total_price"]], $lines),
            "rows" => [
                ["Subtotal", peso($order["subtotal"])],
                ["Shipping", peso($order["shipping_fee"])],
                ["Total", peso($order["total_amount"])],
                ["Payment", $payment],
            ],
            "button" => "View my order",
        ]
    );

    // Each seller hears about their own items (online orders: after payment)
    if (!$online) {
        notifySellersOfOrder($conn, $order, "New order to pack");
    }
}

function orderPaid(mysqli $conn, int $orderId): void
{
    $order = orderInfo($conn, $orderId);
    if (!$order) return;

    $payment = PAYMENT_NAMES[$order["payment_method"]] ?? "online";

    notifyUser(
        $conn,
        (int)$order["customer_id"],
        "Payment received",
        "We received your $payment payment of " . peso($order["total_amount"]) . " for order {$order["order_number"]}. The seller will pack it soon.",
        buyerOrderLink((int)$order["order_id"]),
        ["subject" => "Payment received — order {$order["order_number"]}", "button" => "View my order"]
    );

    notifySellersOfOrder($conn, $order, "New paid order to pack");
}

function notifySellersOfOrder(mysqli $conn, array $order, string $title): void
{
    $byVendor = [];
    foreach (orderLines($conn, (int)$order["order_id"]) as $line) {
        $byVendor[(int)$line["vendor_id"]][] = $line;
    }

    foreach ($byVendor as $vendorId => $lines) {
        $count = array_sum(array_column($lines, "quantity"));
        $amount = array_sum(array_column($lines, "total_price"));

        notifyUser(
            $conn,
            $vendorId,
            $title,
            "Order {$order["order_number"]}: $count item(s) worth " . peso($amount) . ". Pack it and mark it Packed.",
            sellerOrderLink((int)$order["order_id"]),
            [
                "subject" => "$title — {$order["order_number"]}",
                "intro" => "You have a new order on Punlaan. Pack the items below, then update the order in Order Processing.",
                "items" => array_map(fn($l) => [$l["product_name"], $l["quantity"], $l["total_price"]], $lines),
                "rows" => [["Payment", PAYMENT_NAMES[$order["payment_method"]] ?? "Cash on Delivery"]],
                "button" => "Open Order Processing",
            ]
        );
    }
}


/* ---------- one item moved to a new status ---------- */

/*
 * $item = order_items row fields: order_item_id, order_id, vendor_id,
 *         product_name, quantity, total_price
 */
function orderItemChanged(mysqli $conn, array $item, string $newStatus, string $actor): void
{
    $order = orderInfo($conn, (int)$item["order_id"]);
    if (!$order) return;

    $number = $order["order_number"];
    $what = "{$item["product_name"]} × {$item["quantity"]}";
    $customerId = (int)$order["customer_id"];
    $vendorId = (int)$item["vendor_id"];
    $buyerLink = buyerOrderLink((int)$item["order_id"], (int)$item["order_item_id"]);
    $sellerLink = sellerOrderLink((int)$item["order_id"], (int)$item["order_item_id"]);

    // Money back when a paid item is cancelled
    $refundText = "";
    if ($newStatus === "cancelled" && $order["payment_status"] === "paid") {
        $refundText = " " . refundCancelledItem($conn, $item, $order);
    }

    // Courier + tracking number the seller entered (Shipping / Shipped)
    $trackText = "";
    if (in_array($newStatus, ["shipping", "shipped"], true)) {
        $stmt = $conn->prepare("SELECT courier, tracking_number FROM order_shipments WHERE order_id = ? AND vendor_id = ?");
        $stmt->bind_param("ii", $item["order_id"], $vendorId);
        $stmt->execute();
        $ship = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!empty($ship["courier"])) {
            $trackText = $ship["tracking_number"]
                ? " Courier: {$ship["courier"]}, tracking no. {$ship["tracking_number"]}."
                : " Delivered by: {$ship["courier"]}.";
        }
    }

    $buyerMessages = [
        "packed" => ["Order packed", "The seller packed $what (order $number). It will be handed to the courier soon."],
        "shipping" => ["Order handed to the courier", "$what (order $number) is now with the courier." . $trackText],
        "shipped" => ["Order on the way", "$what (order $number) is on its way to you." . $trackText . " Tap “Order received” once you get it."],
        "completed" => ["Order delivered", "$what (order $number) was delivered. Enjoy your plants — you can now rate it."],
        "cancelled" => ["Order cancelled", "The seller cancelled $what (order $number)." . $refundText],
    ];

    if ($actor === "vendor" && isset($buyerMessages[$newStatus])) {
        [$title, $message] = $buyerMessages[$newStatus];
        notifyUser($conn, $customerId, $title, $message, $buyerLink, [
            "subject" => "$title — $number",
            "button" => "View my order",
        ]);
    }

    if ($actor === "customer" && $newStatus === "cancelled") {
        notifyUser($conn, $vendorId, "Order cancelled by the buyer",
            "The buyer cancelled $what (order $number). The quantity went back into your stock.",
            $sellerLink, ["subject" => "Order $number cancelled", "button" => "Open Order Processing"]);

        if ($refundText) {
            notifyUser($conn, $customerId, "Refund for your cancelled order", trim($refundText), $buyerLink,
                ["subject" => "Refund for order $number", "button" => "View my order"]);
        }
    }

    if ($actor === "customer" && $newStatus === "completed") {
        notifyUser($conn, $vendorId, "Order received",
            "The buyer received $what (order $number). The sale counts toward your earnings once the return period ends.",
            "MyAccount/vendor/Sales.html", ["subject" => "Order $number received", "button" => "View earnings"]);
    }
}


/* Refunds one cancelled item (+ that seller's shipping when none of their items are left) */
function refundCancelledItem(mysqli $conn, array $item, array $order): string
{
    $amount = (float)$item["total_price"];

    $stmt = $conn->prepare("
        SELECT COUNT(*) FROM order_items
        WHERE order_id = ? AND vendor_id = ? AND status <> 'cancelled'
    ");
    $stmt->bind_param("ii", $item["order_id"], $item["vendor_id"]);
    $stmt->execute();
    $stillActive = (int)$stmt->get_result()->fetch_row()[0];
    $stmt->close();

    if ($stillActive === 0) {
        $stmt = $conn->prepare("SELECT shipping_fee FROM order_shipments WHERE order_id = ? AND vendor_id = ?");
        $stmt->bind_param("ii", $item["order_id"], $item["vendor_id"]);
        $stmt->execute();
        $amount += (float)($stmt->get_result()->fetch_row()[0] ?? 0);
        $stmt->close();
    }

    try {
        $refund = refundOrderMoney($conn, (int)$item["order_id"], $amount, "Cancelled: " . $item["product_name"]);
    } catch (Throwable $e) {
        error_log("Punlaan refund failed for order item {$item["order_item_id"]}: " . $e->getMessage());
        return "The refund of " . peso($amount) . " couldn't be sent automatically — Punlaan will process it.";
    }

    if ($refund["method"] === "none") {
        return "";
    }

    return peso($refund["amount"]) . " refund: " . refundMethodText($refund["method"]);
}
