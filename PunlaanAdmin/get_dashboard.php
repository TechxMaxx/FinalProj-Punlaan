<?php

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD DATA
|--------------------------------------------------------------------------
|
| Real numbers for admin-dashboard.js (no sample data).
|
| Status codes used in the database:
|   users.verification_status   1 pending, 2 approved, 3 rejected
|   users.account_status        0 active, 1 suspended, 2 blocked
|   product.status              0 pending, 1 approved, 2 rejected
|   product.catalog_status      3 = live in the Marketplace
|
| Sales = order items that were not cancelled (cash on delivery).
|
*/

require_once __DIR__ . "/admin_auth.php";
require_once __DIR__ . "/connection.php";

header("Content-Type: application/json");

function one($conn, $sql) {
    $row = $conn->query($sql)->fetch_row();
    return $row ? $row[0] : 0;
}

function all($conn, $sql) {
    return $conn->query($sql)->fetch_all(MYSQLI_ASSOC);
}

// A product is "live" when shoppers can see it in the Marketplace
$LIVE = "
    p.status = 1
    AND p.catalog_status = 3
    AND p.stock > 0
    AND u.verification_status = 2
    AND u.account_status = 0
";

try {

    /* ---------- Summary cards ---------- */

    $stats = [
        "sales_30d" => (float) one($conn, "
            SELECT COALESCE(SUM(oi.total_price), 0)
            FROM order_items oi
            INNER JOIN orders o ON o.order_id = oi.order_id
            WHERE oi.status <> 'cancelled'
              AND o.order_date >= CURDATE() - INTERVAL 29 DAY
        "),
        "orders_30d" => (int) one($conn, "
            SELECT COUNT(*) FROM orders
            WHERE status <> 'cancelled'
              AND order_date >= CURDATE() - INTERVAL 29 DAY
        "),
        "orders_open" => (int) one($conn, "
            SELECT COUNT(*) FROM orders
            WHERE status NOT IN ('completed', 'cancelled')
        "),
        "orders_completed" => (int) one($conn, "
            SELECT COUNT(*) FROM orders WHERE status = 'completed'
        "),
        "active_vendors" => (int) one($conn, "
            SELECT COUNT(*) FROM users
            WHERE is_vendor = 1 AND verification_status = 2 AND account_status = 0
        "),
        "new_vendors_30d" => (int) one($conn, "
            SELECT COUNT(*) FROM users
            WHERE is_vendor = 1 AND verification_status = 2
              AND created_at >= CURDATE() - INTERVAL 29 DAY
        "),
        "live_listings" => (int) one($conn, "
            SELECT COUNT(*) FROM product p
            INNER JOIN users u ON u.user_id = p.user_id
            WHERE $LIVE
        "),
        "total_users" => (int) one($conn, "
            SELECT COUNT(*) FROM users WHERE is_admin = 0
        "),
        "new_users_30d" => (int) one($conn, "
            SELECT COUNT(*) FROM users
            WHERE is_admin = 0 AND created_at >= CURDATE() - INTERVAL 29 DAY
        ")
    ];


    /* ---------- Sales per day, last 30 days ---------- */

    $rows = all($conn, "
        SELECT DATE(o.order_date) AS day,
               SUM(oi.total_price) AS sales,
               COUNT(DISTINCT o.order_id) AS orders
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.order_id
        WHERE oi.status <> 'cancelled'
          AND o.order_date >= CURDATE() - INTERVAL 29 DAY
        GROUP BY DATE(o.order_date)
    ");

    $byDay = [];
    foreach ($rows as $r) {
        $byDay[$r["day"]] = $r;
    }

    $salesDaily = [];
    for ($i = 29; $i >= 0; $i--) {
        $day = date("Y-m-d", strtotime("-$i days"));
        $salesDaily[] = [
            "day" => $day,
            "sales" => isset($byDay[$day]) ? (float) $byDay[$day]["sales"] : 0,
            "orders" => isset($byDay[$day]) ? (int) $byDay[$day]["orders"] : 0
        ];
    }


    /* ---------- Top sellers, last 30 days ---------- */

    $topVendors = all($conn, "
        SELECT
            u.user_id,
            COALESCE(NULLIF(u.store_name, ''), CONCAT(u.first_name, ' ', u.last_name)) AS name,
            SUM(oi.total_price) AS sales,
            SUM(oi.quantity) AS items_sold
        FROM order_items oi
        INNER JOIN orders o ON o.order_id = oi.order_id
        INNER JOIN users u ON u.user_id = oi.vendor_id
        WHERE oi.status <> 'cancelled'
          AND o.order_date >= CURDATE() - INTERVAL 29 DAY
        GROUP BY u.user_id
        ORDER BY sales DESC
        LIMIT 5
    ");

    foreach ($topVendors as &$v) {
        $v["sales"] = (float) $v["sales"];
        $v["items_sold"] = (int) $v["items_sold"];
    }
    unset($v);


    /* ---------- Live products per category ---------- */

    $categories = all($conn, "
        SELECT p.category AS name, COUNT(*) AS count
        FROM product p
        INNER JOIN users u ON u.user_id = p.user_id
        WHERE $LIVE
        GROUP BY p.category
        ORDER BY count DESC
    ");

    foreach ($categories as &$c) {
        $c["count"] = (int) $c["count"];
    }
    unset($c);


    /* ---------- Things that need the admin ---------- */

    $alerts = [
        "pending_sellers" => (int) one($conn, "
            SELECT COUNT(*) FROM users WHERE verification_status = 1
        "),
        "pending_listings" => (int) one($conn, "
            SELECT COUNT(*) FROM product WHERE status = 0
        "),
        "low_stock" => (int) one($conn, "
            SELECT COUNT(*) FROM product
            WHERE status = 1 AND stock BETWEEN 1 AND 5
        "),
        "out_of_stock" => (int) one($conn, "
            SELECT COUNT(*) FROM product
            WHERE status = 1 AND stock = 0
        "),
        "late_orders" => (int) one($conn, "
            SELECT COUNT(*) FROM orders
            WHERE status = 'to-pack' AND order_date < NOW() - INTERVAL 2 DAY
        ")
    ];


    /* ---------- Recent activity ---------- */

    // "ago" is worked out by the database, so the viewer's clock doesn't matter
    $activity = all($conn, "
      SELECT type, label, at, TIMESTAMPDIFF(SECOND, at, NOW()) AS ago
      FROM (
        (SELECT 'order' AS type,
                CONCAT('Order ', o.order_number, ' placed — ₱', FORMAT(o.total_amount, 2)) AS label,
                o.order_date AS at
         FROM orders o
         ORDER BY o.order_date DESC LIMIT 6)
        UNION ALL
        (SELECT 'user' AS type,
                CONCAT(u.first_name, ' ', u.last_name,
                       IF(u.is_vendor = 1 OR u.verification_status IN (1, 2), ' joined as a seller', ' joined as a customer')) AS label,
                u.created_at AS at
         FROM users u
         WHERE u.is_admin = 0
         ORDER BY u.created_at DESC LIMIT 6)
        UNION ALL
        (SELECT 'product' AS type,
                CONCAT('New listing: ', p.product_name) AS label,
                p.submitted_at AS at
         FROM product p
         ORDER BY p.submitted_at DESC LIMIT 6)
      ) recent
      ORDER BY at DESC
      LIMIT 8
    ");

    foreach ($activity as &$a) {
        $a["ago"] = max(0, (int)$a["ago"]);
    }
    unset($a);


    echo json_encode([
        "success" => true,
        "stats" => $stats,
        "sales_daily" => $salesDaily,
        "top_vendors" => $topVendors,
        "categories" => $categories,
        "alerts" => $alerts,
        "activity" => $activity
    ]);

} catch (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not load the dashboard."
    ]);
}

$conn->close();
