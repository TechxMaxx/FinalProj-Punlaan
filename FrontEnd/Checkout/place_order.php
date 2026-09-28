<?php

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");


/*
|--------------------------------------------------------------------------
| CHECK LOGIN
|--------------------------------------------------------------------------
*/

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "logged_in" => false,
        "message" => "Please log in first."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

require_once "../connection.php";
require_once __DIR__ . "/../account/address_helpers.php";
require_once __DIR__ . "/../../lib/shipping.php";
require_once __DIR__ . "/../../lib/order_events.php";
require_once __DIR__ . "/../../lib/stock_alerts.php";


/*
|--------------------------------------------------------------------------
| DELIVERY ADDRESS CHOSEN AT CHECKOUT
|--------------------------------------------------------------------------
*/

$orderInput =
    json_decode(
        file_get_contents("php://input"),
        true
    ) ?? [];

$addressId =
    (int)($orderInput["address_id"] ?? 0);


/*
|--------------------------------------------------------------------------
| PAYMENT METHOD CHOSEN AT CHECKOUT
|--------------------------------------------------------------------------
| cod   = cash on delivery (paid to the rider)
| gcash / maya / card = paid online on the payment page after ordering
*/

const PAYMENT_METHODS = ["cod", "gcash", "maya", "card"];

$paymentMethod =
    strtolower((string)($orderInput["payment_method"] ?? "cod"));

if (!in_array($paymentMethod, PAYMENT_METHODS, true)) {

    echo json_encode([
        "success" => false,
        "message" => "Please choose a payment method."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| LOGGED-IN USER
|--------------------------------------------------------------------------
*/

$userId =
    (int) $_SESSION["user_id"];


/*
|--------------------------------------------------------------------------
| GET SELECTED CHECKOUT ITEMS
|--------------------------------------------------------------------------
*/

$selectedIds =
    $_SESSION["checkout_cart_item_ids"] ?? [];


if (
    !is_array($selectedIds) ||
    count($selectedIds) === 0
) {

    echo json_encode([
        "success" => false,
        "message" =>
            "No items were selected for checkout."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| CLEAN IDS
|--------------------------------------------------------------------------
*/

$selectedIds =
    array_values(
        array_unique(
            array_filter(
                array_map(
                    "intval",
                    $selectedIds
                ),
                function ($id) {
                    return $id > 0;
                }
            )
        )
    );


if (count($selectedIds) === 0) {

    echo json_encode([
        "success" => false,
        "message" =>
            "No valid checkout items were selected."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| START DATABASE TRANSACTION
|--------------------------------------------------------------------------
*/

$conn->begin_transaction();


try {

    /*
    |--------------------------------------------------------------------------
    | GET CUSTOMER
    |--------------------------------------------------------------------------
    */

    $stmt =
        $conn->prepare("
            SELECT
                user_id,
                first_name,
                last_name,
                address,
                account_status
            FROM users
            WHERE user_id = ?
            LIMIT 1
            FOR UPDATE
        ");


    if (!$stmt) {

        throw new Exception(
            "Could not prepare customer query."
        );

    }


    $stmt->bind_param(
        "i",
        $userId
    );


    if (!$stmt->execute()) {

        throw new Exception(
            "Could not load customer information."
        );

    }


    $result =
        $stmt->get_result();


    if ($result->num_rows === 0) {

        throw new Exception(
            "Your account could not be found."
        );

    }


    $customer =
        $result->fetch_assoc();


    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | CHECK ACCOUNT
    |--------------------------------------------------------------------------
    */

    if (
        (int)$customer["account_status"] !== 0
    ) {

        throw new Exception(
            "Your account is not active."
        );

    }


    /*
    |--------------------------------------------------------------------------
    | CHECK DELIVERY ADDRESS
    |--------------------------------------------------------------------------
    */

    /*
     * The address picked at checkout (must belong to this user),
     * otherwise the user's default address.
     */

    $stmt =
        $conn->prepare("
            SELECT *
            FROM user_addresses
            WHERE user_id = ?
              AND (address_id = ? OR (? = 0 AND is_default = 1))
            LIMIT 1
        ");

    $stmt->bind_param(
        "iii",
        $userId,
        $addressId,
        $addressId
    );

    $stmt->execute();

    $address =
        $stmt->get_result()->fetch_assoc();

    $stmt->close();


    if (!$address) {

        throw new Exception(
            "Please choose a delivery address before placing the order."
        );

    }


    if (empty($address["city"]) || empty($address["barangay"])) {

        throw new Exception(
            "Please update your delivery address (choose the city and barangay) before placing the order."
        );

    }


    // Saved on the order as a snapshot, so later address edits don't change it
    $shippingAddress =
        $address["recipient_name"] .
        " | " .
        $address["phone"] .
        " | " .
        formatAddressLine($address);


    /*
    |--------------------------------------------------------------------------
    | FIND USER CART
    |--------------------------------------------------------------------------
    */

    $stmt =
        $conn->prepare("
            SELECT cart_id
            FROM cart
            WHERE user_id = ?
            LIMIT 1
            FOR UPDATE
        ");


    if (!$stmt) {

        throw new Exception(
            "Could not prepare cart query."
        );

    }


    $stmt->bind_param(
        "i",
        $userId
    );


    if (!$stmt->execute()) {

        throw new Exception(
            "Could not load your cart."
        );

    }


    $result =
        $stmt->get_result();


    if ($result->num_rows === 0) {

        throw new Exception(
            "Your cart could not be found."
        );

    }


    $cart =
        $result->fetch_assoc();


    $cartId =
        (int)$cart["cart_id"];


    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | BUILD PLACEHOLDERS
    |--------------------------------------------------------------------------
    */

    $placeholders =
        implode(
            ",",
            array_fill(
                0,
                count($selectedIds),
                "?"
            )
        );


    /*
    |--------------------------------------------------------------------------
    | LOAD SELECTED CART ITEMS + PRODUCTS
    |--------------------------------------------------------------------------
    |
    | FOR UPDATE locks the selected rows while the transaction
    | is running so stock cannot be changed underneath us.
    |
    */

    $sql = "
        SELECT

            ci.cart_item_id,
            ci.cart_id,
            ci.product_id,
            ci.quantity,

            p.user_id AS vendor_id,
            p.product_name,
            p.product_image,
            p.price,
            p.stock,
            p.status,
            p.catalog_status,

            u.is_vendor,
            u.verification_status,
            u.account_status AS vendor_account_status

        FROM cart_items ci

        INNER JOIN product p
            ON ci.product_id = p.product_id

        INNER JOIN users u
            ON p.user_id = u.user_id

        WHERE ci.cart_id = ?

          AND ci.cart_item_id IN (
              $placeholders
          )

        FOR UPDATE
    ";


    $stmt =
        $conn->prepare($sql);


    if (!$stmt) {

        throw new Exception(
            "Could not prepare checkout item query."
        );

    }


    /*
    |--------------------------------------------------------------------------
    | BIND PARAMETERS
    |--------------------------------------------------------------------------
    */

    $types =
        "i" .
        str_repeat(
            "i",
            count($selectedIds)
        );


    $params = [];

    $params[] =
        $types;

    $params[] =
        $cartId;


    foreach ($selectedIds as $id) {

        $params[] =
            $id;

    }


    $references = [];

    foreach ($params as $key => $value) {

        $references[$key] =
            &$params[$key];

    }


    call_user_func_array(
        [$stmt, "bind_param"],
        $references
    );


    if (!$stmt->execute()) {

        throw new Exception(
            "Could not load selected cart items."
        );

    }


    $result =
        $stmt->get_result();


    $items = [];


    while (
        $row =
        $result->fetch_assoc()
    ) {

        $items[] =
            $row;

    }


    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | MAKE SURE ALL SELECTED ITEMS STILL EXIST
    |--------------------------------------------------------------------------
    */

    if (
        count($items) !==
        count($selectedIds)
    ) {

        throw new Exception(
            "One or more selected cart items are no longer available."
        );

    }


    /*
    |--------------------------------------------------------------------------
    | SHIPPING PER SELLER (item sizes + zone — see lib/shipping.php)
    |--------------------------------------------------------------------------
    */

    $linesByVendor = [];

    foreach ($items as $item) {
        $linesByVendor[(int)$item["vendor_id"]][] = [
            (int)$item["product_id"],
            (int)$item["quantity"],
            (float)$item["price"] * (int)$item["quantity"]
        ];
    }

    $shipments = [];

    foreach ($linesByVendor as $vendorId => $lines) {
        $shipments[$vendorId] = shippingQuote($conn, $vendorId, $address, $lines);
    }

    $shippingFee =
        array_sum(array_column($shipments, "fee"));


    // Punlaan's commission at the time of sale (Admin → Settings)
    $commissionRate =
        (float)setting($conn, "commission_percent");


    /*
    |--------------------------------------------------------------------------
    | CALCULATE SUBTOTAL
    |--------------------------------------------------------------------------
    */

    $subtotal =
        0.00;


    $orderItems =
        [];


    foreach ($items as $item) {

        $productName =
            $item["product_name"];


        $quantity =
            (int)$item["quantity"];


        $stock =
            (int)$item["stock"];


        /*
        |--------------------------------------------------------------------------
        | PRODUCT AVAILABILITY
        |--------------------------------------------------------------------------
        */

        if (
            (int)$item["status"] !== 1 ||
            (int)$item["catalog_status"] !== 3
        ) {

            throw new Exception(
                $productName .
                " is no longer available."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | VENDOR AVAILABILITY
        |--------------------------------------------------------------------------
        */

        if (
            (int)$item["is_vendor"] !== 1 ||
            (int)$item["verification_status"] !== 2 ||
            (int)$item["vendor_account_status"] !== 0
        ) {

            throw new Exception(
                $productName .
                " is no longer being sold by an active vendor."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | QUANTITY
        |--------------------------------------------------------------------------
        */

        if ($quantity <= 0) {

            throw new Exception(
                "Invalid quantity for " .
                $productName .
                "."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | STOCK
        |--------------------------------------------------------------------------
        */

        if ($stock < $quantity) {

            throw new Exception(
                $productName .
                " only has " .
                $stock .
                " item(s) remaining."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | DATABASE PRICE
        |--------------------------------------------------------------------------
        */

        $unitPrice =
            (float)$item["price"];


        $totalPrice =
            $unitPrice *
            $quantity;


        $subtotal +=
            $totalPrice;


        /*
        |--------------------------------------------------------------------------
        | IMAGE
        |--------------------------------------------------------------------------
        */

        $productImage =
            $item["product_image"];


        /*
        |--------------------------------------------------------------------------
        | SAVE ORDER ITEM SNAPSHOT
        |--------------------------------------------------------------------------
        */

        $orderItems[] = [

            "cart_item_id" =>
                (int)$item["cart_item_id"],

            "product_id" =>
                (int)$item["product_id"],

            "vendor_id" =>
                (int)$item["vendor_id"],

            "product_name" =>
                $productName,

            "product_image" =>
                $productImage,

            "unit_price" =>
                $unitPrice,

            "quantity" =>
                $quantity,

            "total_price" =>
                $totalPrice

        ];

    }


    /*
    |--------------------------------------------------------------------------
    | FINAL ORDER TOTAL
    |--------------------------------------------------------------------------
    */

    $totalAmount =
        $subtotal +
        $shippingFee;


    /*
    |--------------------------------------------------------------------------
    | GENERATE UNIQUE ORDER NUMBER
    |--------------------------------------------------------------------------
    |
    | Example:
    | PM-20260830-032501-4837
    |
    */

    $orderNumber =
        "PM-" .
        date("Ymd-His") .
        "-" .
        random_int(
            1000,
            9999
        );


    /*
    |--------------------------------------------------------------------------
    | INSERT ORDER
    |--------------------------------------------------------------------------
    */

    $stmt =
        $conn->prepare("
            INSERT INTO orders (
                order_number,
                customer_id,
                shipping_address,
                shipping_lat,
                shipping_lng,
                subtotal,
                shipping_fee,
                total_amount,
                payment_method,
                payment_status,
                status,
                status_note
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                'unpaid',
                'to-pack',
                ?
            )
        ");


    if (!$stmt) {

        throw new Exception(
            "Could not prepare order creation."
        );

    }


    $orderStatusNote =
        "Order received and waiting for vendor processing.";


    // Map pin of the delivery address (may be empty)
    $shippingLat =
        $address["geo_lat"] !== null ? (float)$address["geo_lat"] : null;

    $shippingLng =
        $address["geo_lng"] !== null ? (float)$address["geo_lng"] : null;


    $stmt->bind_param(
        "sisdddddss",
        $orderNumber,
        $userId,
        $shippingAddress,
        $shippingLat,
        $shippingLng,
        $subtotal,
        $shippingFee,
        $totalAmount,
        $paymentMethod,
        $orderStatusNote
    );


    if (!$stmt->execute()) {

        throw new Exception(
            "Could not create the order."
        );

    }


    $orderId =
        $stmt->insert_id;


    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | INSERT ORDER ITEMS
    |--------------------------------------------------------------------------
    */

    $stmt =
        $conn->prepare("
            INSERT INTO order_items (
                order_id,
                product_id,
                vendor_id,
                product_name,
                product_image,
                unit_price,
                quantity,
                total_price,
                commission_rate,
                status,
                status_note
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                'to-pack',
                ?
            )
        ");


    if (!$stmt) {

        throw new Exception(
            "Could not prepare order item creation."
        );

    }


    $itemStatusNote =
        "Waiting for vendor to prepare the order.";


    foreach (
        $orderItems as $item
    ) {

        $stmt->bind_param(
            "iiissdidds",
            $orderId,
            $item["product_id"],
            $item["vendor_id"],
            $item["product_name"],
            $item["product_image"],
            $item["unit_price"],
            $item["quantity"],
            $item["total_price"],
            $commissionRate,
            $itemStatusNote
        );


        if (!$stmt->execute()) {

            throw new Exception(
                "Could not create an order item."
            );

        }

    }


    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | SAVE EACH SELLER'S SHIPPING FEE
    |--------------------------------------------------------------------------
    */

    $stmt =
        $conn->prepare("
            INSERT INTO order_shipments (order_id, vendor_id, from_city, zone, shipping_fee)
            VALUES (?, ?, ?, ?, ?)
        ");

    foreach ($shipments as $vendorId => $quote) {

        $zoneText = $quote["free"] ? "Free shipping" : $quote["zone_label"];

        $stmt->bind_param(
            "iissd",
            $orderId,
            $vendorId,
            $quote["from"],
            $zoneText,
            $quote["fee"]
        );

        if (!$stmt->execute()) {
            throw new Exception("Could not save the shipping fee.");
        }
    }

    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | REDUCE PRODUCT STOCK
    |--------------------------------------------------------------------------
    */

    $stmt =
        $conn->prepare("
            UPDATE product
            SET stock = stock - ?
            WHERE product_id = ?
              AND stock >= ?
        ");


    if (!$stmt) {

        throw new Exception(
            "Could not prepare stock update."
        );

    }


    foreach (
        $orderItems as $item
    ) {

        $quantity =
            (int)$item["quantity"];

        $productId =
            (int)$item["product_id"];


        $stmt->bind_param(
            "iii",
            $quantity,
            $productId,
            $quantity
        );


        if (!$stmt->execute()) {

            throw new Exception(
                "Could not update product stock."
            );

        }


        /*
         * No affected row means stock changed
         * unexpectedly or was insufficient.
         */

        if (
            $stmt->affected_rows !== 1
        ) {

            throw new Exception(
                "Stock changed before the order could be completed."
            );

        }

    }


    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | REMOVE PURCHASED ITEMS FROM CART
    |--------------------------------------------------------------------------
    */

    $placeholders =
        implode(
            ",",
            array_fill(
                0,
                count($selectedIds),
                "?"
            )
        );


    $sql = "
        DELETE FROM cart_items

        WHERE cart_id = ?

          AND cart_item_id IN (
              $placeholders
          )
    ";


    $stmt =
        $conn->prepare($sql);


    if (!$stmt) {

        throw new Exception(
            "Could not prepare cart cleanup."
        );

    }


    $types =
        "i" .
        str_repeat(
            "i",
            count($selectedIds)
        );


    $params = [];

    $params[] =
        $types;

    $params[] =
        $cartId;


    foreach ($selectedIds as $id) {

        $params[] =
            $id;

    }


    $references = [];

    foreach ($params as $key => $value) {

        $references[$key] =
            &$params[$key];

    }


    call_user_func_array(
        [$stmt, "bind_param"],
        $references
    );


    if (!$stmt->execute()) {

        throw new Exception(
            "Could not remove purchased items from cart."
        );

    }


    if (
        $stmt->affected_rows !==
        count($selectedIds)
    ) {

        throw new Exception(
            "Cart changed before the order could be completed."
        );

    }


    $stmt->close();


    /*
    |--------------------------------------------------------------------------
    | CLEAR TEMPORARY CHECKOUT SESSION
    |--------------------------------------------------------------------------
    */

    unset(
        $_SESSION["checkout_cart_item_ids"]
    );


    /*
    |--------------------------------------------------------------------------
    | COMMIT
    |--------------------------------------------------------------------------
    */

    $conn->commit();


    // "Order placed" notification + email to the buyer (and sellers for COD)
    try {
        orderPlaced($conn, (int)$orderId);
    } catch (Throwable $e) {
        error_log("Punlaan order placed notice: " . $e->getMessage());
    }

    // Stock now at 5 or fewer (or sold out) → tell the seller
    foreach ($orderItems as $item) {
        try {
            stockDropped($conn, (int)$item["product_id"], (int)$item["quantity"]);
        } catch (Throwable $e) {
            error_log("Punlaan low-stock notice: " . $e->getMessage());
        }
    }


    /*
    |--------------------------------------------------------------------------
    | ESTIMATED DELIVERY
    |--------------------------------------------------------------------------
    |
    | Calendar days:
    | +1 day through +4 days
    |
    */

    $orderDate =
        new DateTime();


    $deliveryStart =
        clone $orderDate;


    $deliveryEnd =
        clone $orderDate;


    $deliveryStart->modify(
        "+1 day"
    );


    $deliveryEnd->modify(
        "+4 days"
    );


    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    echo json_encode([

        "success" =>
            true,

        "logged_in" =>
            true,

        "message" =>
            "Order placed successfully.",

        "order_id" =>
            (int)$orderId,

        "order_number" =>
            $orderNumber,

        "payment_method" =>
            $paymentMethod,

        // Online methods continue on the payment page
        "needs_payment" =>
            $paymentMethod !== "cod",

        "subtotal" =>
            $subtotal,

        "shipping_fee" =>
            $shippingFee,

        "total_amount" =>
            $totalAmount,

        "order_date" =>
            $orderDate->format(
                "Y-m-d H:i:s"
            ),

        "estimated_delivery_start" =>
            $deliveryStart->format(
                "Y-m-d"
            ),

        "estimated_delivery_end" =>
            $deliveryEnd->format(
                "Y-m-d"
            )

    ]);


} catch (
    Throwable $error
) {

    /*
    |--------------------------------------------------------------------------
    | ROLLBACK EVERYTHING
    |--------------------------------------------------------------------------
    */

    $conn->rollback();


    error_log(
        "Punlaan place_order.php: " .
        $error->getMessage()
    );


    echo json_encode([

        "success" =>
            false,

        "logged_in" =>
            true,

        "message" =>
            $error->getMessage()

    ]);

}


$conn->close();

exit;