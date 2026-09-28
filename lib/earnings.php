<?php

/*
|--------------------------------------------------------------------------
| SELLER EARNINGS & PAYOUTS
|--------------------------------------------------------------------------
|
| A seller earns from every DELIVERED (completed) item:
|
|   item total − Punlaan commission (rate saved on the item, default 5%)
|   + the shipping fee the buyer paid for that seller's part of the order
|
| Refunded returns don't count. Money becomes "available" once the
| return period is over (default 7 days after delivery) and no return
| is still open. Before that it's "on hold".
|
|   balance = available − payouts already requested or paid
|
*/

require_once __DIR__ . "/settings.php";


function vendorEarnings(mysqli $conn, int $vendorId): array
{
    $returnDays = (int)setting($conn, "return_days");
    $releaseBefore = time() - $returnDays * 86400;

    $stmt = $conn->prepare("
        SELECT oi.order_id, oi.total_price, oi.commission_rate, oi.completed_at, rr.status AS return_status
        FROM order_items oi
        LEFT JOIN return_requests rr ON rr.order_item_id = oi.order_item_id
        WHERE oi.vendor_id = ? AND oi.status = 'completed'
    ");
    $stmt->bind_param("i", $vendorId);
    $stmt->execute();
    $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $e = [
        "gross" => 0.0, "commission" => 0.0, "shipping" => 0.0, "refunds" => 0.0,
        "net" => 0.0, "available" => 0.0, "on_hold" => 0.0,
    ];

    // Orders with at least one delivered, not-refunded item → shipping earned
    $orders = [];

    foreach ($items as $item) {
        $total = (float)$item["total_price"];

        if ($item["return_status"] === "refunded") {
            $e["refunds"] += $total;
            continue;
        }

        $commission = round($total * (float)$item["commission_rate"] / 100, 2);
        $net = $total - $commission;

        $released = $item["completed_at"]
            && strtotime($item["completed_at"]) <= $releaseBefore
            && !in_array($item["return_status"], ["requested", "rejected", "disputed"], true);

        $e["gross"] += $total;
        $e["commission"] += $commission;
        $e[$released ? "available" : "on_hold"] += $net;

        $orderId = (int)$item["order_id"];
        $orders[$orderId] = ($orders[$orderId] ?? true) && $released;
    }

    if ($orders) {
        $stmt = $conn->prepare("SELECT order_id, shipping_fee FROM order_shipments WHERE vendor_id = ?");
        $stmt->bind_param("i", $vendorId);
        $stmt->execute();
        foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $s) {
            $orderId = (int)$s["order_id"];
            if (!isset($orders[$orderId])) continue;
            $e["shipping"] += (float)$s["shipping_fee"];
            $e[$orders[$orderId] ? "available" : "on_hold"] += (float)$s["shipping_fee"];
        }
        $stmt->close();
    }

    $e["net"] = $e["gross"] - $e["commission"] + $e["shipping"];

    // Payouts
    $stmt = $conn->prepare("
        SELECT
            COALESCE(SUM(IF(status = 'paid', amount, 0)), 0),
            COALESCE(SUM(IF(status = 'requested', amount, 0)), 0)
        FROM payouts WHERE vendor_id = ?
    ");
    $stmt->bind_param("i", $vendorId);
    $stmt->execute();
    [$paid, $requested] = $stmt->get_result()->fetch_row();
    $stmt->close();

    $e["paid_out"] = (float)$paid;
    $e["requested"] = (float)$requested;
    $e["balance"] = max(0, $e["available"] - $e["paid_out"] - $e["requested"]);

    return array_map(fn($v) => round((float)$v, 2), $e);
}
