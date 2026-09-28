<?php

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header('Content-Type: application/json');

require_once __DIR__ . "/../../FrontEnd/connection.php";

if (!isset($_SESSION['user_id'])) {

    echo json_encode([
        'success' => false,
        'message' => 'User is not logged in.'
    ]);

    exit;
}

$userId = $_SESSION['user_id'];

try {

    /* Total Orders */

    $stmt = $conn->prepare("
        SELECT COUNT(*) AS total_orders
        FROM orders
        WHERE customer_id = ?
    ");

    $stmt->bind_param(
        "i",
        $userId
    );

    $stmt->execute();

    $totalOrders =
        $stmt
        ->get_result()
        ->fetch_assoc()['total_orders'];


    /* Completed Orders */

    $stmt = $conn->prepare("
        SELECT COUNT(*) AS completed_orders
        FROM orders
        WHERE customer_id = ?
        AND status = 'completed'
    ");

    $stmt->bind_param(
        "i",
        $userId
    );

    $stmt->execute();

    $completedOrders =
        $stmt
        ->get_result()
        ->fetch_assoc()['completed_orders'];


    /* Cart Items */

    $stmt = $conn->prepare("
        SELECT COUNT(*) AS cart_items
        FROM cart_items ci
        INNER JOIN cart c
            ON ci.cart_id = c.cart_id
        WHERE c.user_id = ?
    ");

    $stmt->bind_param(
        "i",
        $userId
    );

    $stmt->execute();

    $cartItems =
        $stmt
        ->get_result()
        ->fetch_assoc()['cart_items'];


    echo json_encode([
        'success' => true,

        'stats' => [
            'total_orders' => $totalOrders,
            'completed_orders' => $completedOrders,
            'cart_items' => $cartItems
        ]
    ]);

} catch (Exception $e) {

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);

}