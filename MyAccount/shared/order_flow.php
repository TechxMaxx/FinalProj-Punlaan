<?php

/*
|--------------------------------------------------------------------------
| ORDER STATUS RULES (shared by sellers and customers)
|--------------------------------------------------------------------------
|
| Each order item moves forward one step at a time:
|
|   to-pack → packed → shipping → shipped → completed
|        ↘ cancelled   ↘ cancelled
|
| Seller:   to-pack → packed | cancelled
|           packed  → shipping | cancelled
|           shipping → shipped
|           shipped  → completed  (delivered)
| Customer: to-pack → cancelled            (cancel before it's packed)
|           shipping | shipped → completed (order received)
| Admin:    view only (Order Oversight) — can't change orders
|
| Cancelling puts the quantity back into the product's stock (and
| refunds it if it was paid). Online orders (GCash / Maya / card)
| can't be packed until they're paid.
| The parent order's status follows its items, so the admin's
| Order Oversight shows the real progress.
|
| Every change notifies the other side (lib/order_events.php).
|
*/

require_once __DIR__ . "/../../lib/order_events.php";

const ORDER_STEPS = ['to-pack', 'packed', 'shipping', 'shipped', 'completed'];

const ORDER_TRANSITIONS = [
    'vendor' => [
        'to-pack'  => ['packed', 'cancelled'],
        'packed'   => ['shipping', 'cancelled'],
        'shipping' => ['shipped'],
        'shipped'  => ['completed'],
    ],
    'customer' => [
        'to-pack'  => ['cancelled'],
        'shipping' => ['completed'],
        'shipped'  => ['completed'],
    ],
];

// Couriers the seller can pick when the parcel leaves (Shipping / Shipped)
const COURIERS = [
    'J&T Express', 'LBC', 'Ninja Van', 'Flash Express', 'GoGo Xpress', '2GO Express',
    'Lalamove', 'Grab Express', 'Own delivery', 'Other',
];

const ORDER_STATUS_LABELS = [
    'to-pack'   => 'To Pack',
    'packed'    => 'Packed',
    'shipping'  => 'Shipping',
    'shipped'   => 'Shipped',
    'completed' => 'Completed',
    'cancelled' => 'Cancelled',
];


/* Statuses this actor may move an item to from $current */
function allowedNextStatuses(string $actor, string $current): array
{
    return ORDER_TRANSITIONS[$actor][$current] ?? [];
}


/*
 * Change one order item's status.
 *
 * $actor = 'vendor'   → $actorId must be the item's vendor
 * $actor = 'customer' → $actorId must be the order's customer
 *
 * $tracking = ['courier' => …, 'tracking_number' => …] (seller, when moving to
 *             Shipping or Shipped). Saved for the seller's whole parcel in
 *             this order, and shown to the buyer in My Orders.
 *
 * Returns ['success' => bool, 'message' => string, 'status' => new status]
 */
function changeOrderItemStatus(mysqli $conn, string $actor, int $actorId, int $orderItemId, string $newStatus, ?string $note, ?array $tracking = null): array
{
    $tracking = $actor === 'vendor' && in_array($newStatus, ['shipping', 'shipped'], true)
        ? cleanTracking($tracking)
        : null;

    if (is_string($tracking)) {
        return ['success' => false, 'message' => $tracking];
    }

    $conn->begin_transaction();

    try {

        // Lock the row and check it belongs to this seller / customer
        $ownerColumn = $actor === 'vendor' ? 'oi.vendor_id' : 'o.customer_id';

        $stmt = $conn->prepare("
            SELECT oi.order_item_id, oi.order_id, oi.product_id, oi.vendor_id, oi.product_name,
                   oi.quantity, oi.total_price, oi.status, o.payment_method, o.payment_status
            FROM order_items oi
            INNER JOIN orders o ON o.order_id = oi.order_id
            WHERE oi.order_item_id = ? AND $ownerColumn = ?
            FOR UPDATE
        ");
        $stmt->bind_param("ii", $orderItemId, $actorId);
        $stmt->execute();
        $item = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$item) {
            $conn->rollback();
            return ['success' => false, 'message' => 'Order not found.'];
        }

        $current = $item['status'];

        if ($current === $newStatus) {
            $conn->rollback();
            return ['success' => false, 'message' => 'This order is already ' . ORDER_STATUS_LABELS[$current] . '.'];
        }

        if (!in_array($newStatus, allowedNextStatuses($actor, $current), true)) {
            $conn->rollback();

            $from = ORDER_STATUS_LABELS[$current] ?? $current;
            $to = ORDER_STATUS_LABELS[$newStatus] ?? $newStatus;

            return [
                'success' => false,
                'message' => in_array($current, ['completed', 'cancelled'], true)
                    ? "This order is already $from and can't be changed."
                    : "An order that is $from can't be changed to $to."
            ];
        }

        // Online payment must be finished before the seller packs
        if (
            $actor === 'vendor' && $newStatus === 'packed' &&
            $item['payment_method'] !== 'cod' && $item['payment_status'] !== 'paid'
        ) {
            $conn->rollback();
            return ['success' => false, 'message' => "The buyer hasn't paid for this order yet. Pack it once the payment shows as Paid."];
        }

        $defaultNotes = [
            'packed'    => 'Seller has packed your order.',
            'shipping'  => 'Your order has been handed to the courier.',
            'shipped'   => 'Your order is on its way.',
            'completed' => $actor === 'customer' ? 'Customer confirmed the order was received.' : 'Order delivered.',
            'cancelled' => $actor === 'customer' ? 'Cancelled by the customer.' : 'Cancelled by the seller.',
        ];

        $note = trim((string)$note) !== '' ? mb_substr(trim($note), 0, 500) : ($defaultNotes[$newStatus] ?? null);

        // completed_at starts the return period (see lib/settings.php → return_days)
        $stmt = $conn->prepare("
            UPDATE order_items
            SET status = ?, status_note = ?, completed_at = IF(? = 'completed', NOW(), completed_at)
            WHERE order_item_id = ?
        ");
        $stmt->bind_param("sssi", $newStatus, $note, $newStatus, $orderItemId);
        $stmt->execute();
        $stmt->close();

        // Cancelled → the plants go back on sale
        if ($newStatus === 'cancelled') {
            $stmt = $conn->prepare("UPDATE product SET stock = stock + ? WHERE product_id = ?");
            $stmt->bind_param("ii", $item['quantity'], $item['product_id']);
            $stmt->execute();
            $stmt->close();
        }

        if ($tracking) {
            saveTracking($conn, (int)$item['order_id'], (int)$item['vendor_id'], $tracking);
        }

        syncOrderStatus($conn, (int)$item['order_id']);

        $conn->commit();

        // Refund (if paid) + tell the buyer / seller — after saving, so a slow
        // payment provider or email can't undo the status change
        try {
            orderItemChanged($conn, $item, $newStatus, $actor);
        } catch (Throwable $e) {
            error_log('Punlaan order events: ' . $e->getMessage());
        }

        return ['success' => true, 'message' => 'Order updated to ' . ORDER_STATUS_LABELS[$newStatus] . '.', 'status' => $newStatus];

    } catch (Throwable $e) {

        $conn->rollback();
        error_log('Punlaan order_flow: ' . $e->getMessage());

        return ['success' => false, 'message' => 'Could not update the order. Please try again.'];
    }
}


/*
 * Checks the courier + tracking number the seller typed.
 * null = nothing sent · string = what's wrong · array = clean values
 */
function cleanTracking(?array $tracking): array|string|null
{
    $courier = trim((string)($tracking['courier'] ?? ''));
    $number = strtoupper(preg_replace('/\s+/', '', (string)($tracking['tracking_number'] ?? '')));

    if ($courier === '' && $number === '') {
        return null;
    }

    if (!in_array($courier, COURIERS, true)) {
        return 'Choose the courier from the list.';
    }

    if ($courier === 'Own delivery') {
        return ['courier' => $courier, 'tracking_number' => null];
    }

    if (!preg_match('/^[A-Z0-9\-]{4,40}$/', $number)) {
        return 'Enter the tracking number from the courier (letters and numbers, 4–40 characters).';
    }

    return ['courier' => $courier, 'tracking_number' => $number];
}

/* One tracking number per seller's parcel (order_shipments row) */
function saveTracking(mysqli $conn, int $orderId, int $vendorId, array $tracking): void
{
    // Older orders may have no shipment row yet
    $stmt = $conn->prepare("
        INSERT INTO order_shipments (order_id, vendor_id, courier, tracking_number, shipped_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE courier = VALUES(courier), tracking_number = VALUES(tracking_number),
                                shipped_at = COALESCE(shipped_at, NOW())
    ");
    $stmt->bind_param("iiss", $orderId, $vendorId, $tracking['courier'], $tracking['tracking_number']);
    $stmt->execute();
    $stmt->close();
}


/*
 * The order's status = the least-advanced of its active items
 * (all items cancelled → cancelled).
 */
function syncOrderStatus(mysqli $conn, int $orderId): void
{
    $stmt = $conn->prepare("SELECT status FROM order_items WHERE order_id = ?");
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $statuses = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'status');
    $stmt->close();

    $active = array_values(array_filter($statuses, fn($s) => $s !== 'cancelled'));

    if (!$active) {
        $orderStatus = 'cancelled';
    } else {
        $ranks = array_map(fn($s) => array_search($s, ORDER_STEPS, true), $active);
        $orderStatus = ORDER_STEPS[min($ranks)];
    }

    $note = [
        'to-pack'   => 'Waiting for the seller to pack the order.',
        'packed'    => 'Packed and waiting for the courier.',
        'shipping'  => 'Handed to the courier.',
        'shipped'   => 'On the way to the customer.',
        'completed' => 'Order completed.',
        'cancelled' => 'Order cancelled.',
    ][$orderStatus];

    $stmt = $conn->prepare("UPDATE orders SET status = ?, status_note = ? WHERE order_id = ?");
    $stmt->bind_param("ssi", $orderStatus, $note, $orderId);
    $stmt->execute();
    $stmt->close();

    // Refunds for cancelled paid items: orderItemChanged() → lib/payments.php

    // Cash on delivery: paid to the rider once the order is completed
    if ($orderStatus === 'completed') {
        $stmt = $conn->prepare("
            UPDATE orders SET payment_status = 'paid', paid_at = NOW()
            WHERE order_id = ? AND payment_method = 'cod' AND payment_status = 'unpaid'
        ");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $stmt->close();
    }
}
