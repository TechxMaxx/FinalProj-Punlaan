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


/*
|--------------------------------------------------------------------------
| GET LOGGED-IN USER
|--------------------------------------------------------------------------
*/

$userId =
    (int) $_SESSION["user_id"];


/*
|--------------------------------------------------------------------------
| READ REQUEST
|--------------------------------------------------------------------------
*/

$input =
    json_decode(
        file_get_contents("php://input"),
        true
    );


$cartItemId =
    isset($input["cart_item_id"])
        ? (int) $input["cart_item_id"]
        : 0;


$quantity =
    isset($input["quantity"])
        ? (int) $input["quantity"]
        : 0;


if ($cartItemId <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid cart item."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| QUANTITY MUST BE AT LEAST 1
|--------------------------------------------------------------------------
*/

if ($quantity < 1) {

    echo json_encode([
        "success" => false,
        "message" => "Quantity must be at least 1."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| VERIFY CART ITEM BELONGS TO LOGGED-IN USER
|--------------------------------------------------------------------------
|
| Also retrieve current product stock.
|
*/

$stmt = $conn->prepare("
    SELECT
        ci.cart_item_id,
        ci.cart_id,
        ci.product_id,
        p.stock
    FROM cart_items ci

    INNER JOIN cart c
        ON ci.cart_id = c.cart_id

    INNER JOIN product p
        ON ci.product_id = p.product_id

    WHERE ci.cart_item_id = ?
      AND c.user_id = ?

    LIMIT 1
");


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare cart item query."
    ]);

    $conn->close();

    exit;
}


$stmt->bind_param(
    "ii",
    $cartItemId,
    $userId
);


if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to verify cart item."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$result =
    $stmt->get_result();


if ($result->num_rows === 0) {

    echo json_encode([
        "success" => false,
        "message" => "Cart item was not found."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$row =
    $result->fetch_assoc();


$stock =
    (int) $row["stock"];


$stmt->close();


/*
|--------------------------------------------------------------------------
| CHECK STOCK
|--------------------------------------------------------------------------
*/

if ($stock <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "This product is currently out of stock."
    ]);

    $conn->close();

    exit;
}


if ($quantity > $stock) {

    echo json_encode([
        "success" => false,
        "message" =>
            "You cannot have more than " .
            $stock .
            " item(s) in your cart."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| UPDATE CART ITEM
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("
    UPDATE cart_items
    SET quantity = ?
    WHERE cart_item_id = ?
");


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare cart update."
    ]);

    $conn->close();

    exit;
}


$stmt->bind_param(
    "ii",
    $quantity,
    $cartItemId
);


if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Could not update your cart."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$stmt->close();
$conn->close();


/*
|--------------------------------------------------------------------------
| SUCCESS
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success" => true,

    "message" =>
        "Cart quantity updated.",

    "cart_item_id" =>
        $cartItemId,

    "quantity" =>
        $quantity

]);

exit;