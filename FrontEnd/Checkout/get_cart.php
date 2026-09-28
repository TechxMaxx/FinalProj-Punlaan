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
        "message" => "Please log in first.",
        "items" => []
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| DATABASE CONNECTION
|--------------------------------------------------------------------------
|
| connection.php is one folder above Checkout.
|
*/

require_once "../connection.php";


/*
|--------------------------------------------------------------------------
| GET LOGGED-IN USER
|--------------------------------------------------------------------------
*/

$userId = (int) $_SESSION["user_id"];


/*
|--------------------------------------------------------------------------
| FIND USER CART
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("
    SELECT cart_id
    FROM cart
    WHERE user_id = ?
    LIMIT 1
");


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "logged_in" => true,
        "message" => "Failed to prepare cart query.",
        "items" => []
    ]);

    $conn->close();

    exit;
}


$stmt->bind_param(
    "i",
    $userId
);


$stmt->execute();

$result = $stmt->get_result();


/*
|--------------------------------------------------------------------------
| USER HAS NO CART YET
|--------------------------------------------------------------------------
*/

if ($result->num_rows === 0) {

    echo json_encode([
        "success" => true,
        "logged_in" => true,
        "items" => []
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$cart = $result->fetch_assoc();

$cartId =
    (int) $cart["cart_id"];


$stmt->close();


/*
|--------------------------------------------------------------------------
| LOAD CART ITEMS
|--------------------------------------------------------------------------
|
| cart_items → product → vendor/user
|
*/

$stmt = $conn->prepare("
    SELECT

        ci.cart_item_id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        ci.added_at,

        p.product_name,
        p.product_image,
        p.price,
        p.stock,
        p.status,
        p.catalog_status,

        p.user_id AS vendor_id,
        u.first_name,
        u.last_name,
        u.store_name

    FROM cart_items ci

    INNER JOIN product p
        ON ci.product_id = p.product_id

    INNER JOIN users u
        ON p.user_id = u.user_id

    WHERE ci.cart_id = ?

    ORDER BY ci.added_at ASC
");


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "logged_in" => true,
        "message" => "Failed to prepare cart item query.",
        "items" => []
    ]);

    $conn->close();

    exit;
}


$stmt->bind_param(
    "i",
    $cartId
);


if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "logged_in" => true,
        "message" => "Failed to load cart items.",
        "items" => []
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$result =
    $stmt->get_result();


/*
|--------------------------------------------------------------------------
| BUILD CART ITEMS
|--------------------------------------------------------------------------
*/

$items = [];


while ($row = $result->fetch_assoc()) {

    /*
     * Build seller/store name.
     */

    $sellerName =
        !empty($row["store_name"])
            ? $row["store_name"]
            : trim(
                ($row["first_name"] ?? "") .
                " " .
                ($row["last_name"] ?? "")
            );


    /*
     * Default image.
     */

$image =
    !empty($row["product_image"])
        ? "../" . ltrim($row["product_image"], "/")
        : "../products/no_photo.jpg";


    /*
     * Return fields expected by CART.js.
     */

    $items[] = [

        "cart_item_id" =>
            (int) $row["cart_item_id"],

        "cart_id" =>
            (int) $row["cart_id"],

        "product_id" =>
            (int) $row["product_id"],

        "id" =>
            (int) $row["cart_item_id"],

        "name" =>
            $row["product_name"],

        "image" =>
            $image,

        "price" =>
            (float) $row["price"],

        "quantity" =>
            (int) $row["quantity"],

        "company" =>
            $sellerName,

        "vendor_id" =>
            (int) $row["vendor_id"],

        "stock" =>
            (int) $row["stock"],

        "status" =>
            (int) $row["status"],

        "catalog_status" =>
            (int) $row["catalog_status"],

        "added_at" =>
            $row["added_at"]

    ];
}


/*
|--------------------------------------------------------------------------
| RETURN CART
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success" => true,

    "logged_in" => true,

    "cart_id" =>
        $cartId,

    "items" =>
        $items

]);


$stmt->close();

$conn->close();

exit;