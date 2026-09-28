<?php

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

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
        "message" => "Please log in before adding items to your cart."
    ]);

    exit;
}


require_once __DIR__ . "/connection.php";


/*
|--------------------------------------------------------------------------
| GET LOGGED-IN USER
|--------------------------------------------------------------------------
*/

$userId = (int) $_SESSION["user_id"];


/*
|--------------------------------------------------------------------------
| READ REQUEST
|--------------------------------------------------------------------------
*/

$input = json_decode(
    file_get_contents("php://input"),
    true
);


$productId = isset($input["product_id"])
    ? (int) $input["product_id"]
    : 0;

$quantity = isset($input["quantity"])
    ? (int) $input["quantity"]
    : 0;

/*
 * "buy_now" sets the cart quantity to exactly $quantity
 * (Buy Now button) instead of adding to what is already there.
 */
$buyNow = ($input["mode"] ?? "") === "buy_now";


if ($productId <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid product."
    ]);

    $conn->close();

    exit;
}


if ($quantity <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid quantity."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| VERIFY PRODUCT
|--------------------------------------------------------------------------
|
| Only approved + active + in-stock products
| can be added to the cart.
|
*/

$stmt = $conn->prepare("
    SELECT
        product_id,
        user_id,
        product_name,
        price,
        stock,
        status,
        catalog_status
    FROM product
    WHERE product_id = ?
      AND status = 1
      AND catalog_status = 3
    LIMIT 1
");


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare product query."
    ]);

    $conn->close();

    exit;
}


$stmt->bind_param(
    "i",
    $productId
);


$stmt->execute();

$result = $stmt->get_result();


if ($result->num_rows === 0) {

    echo json_encode([
        "success" => false,
        "message" => "This product is no longer available."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$product = $result->fetch_assoc();

$stmt->close();


/*
|--------------------------------------------------------------------------
| CHECK STOCK
|--------------------------------------------------------------------------
*/

$stock = (int) $product["stock"];


if ($stock <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "This product is currently out of stock."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| VENDORS CANNOT BUY THEIR OWN PRODUCTS
|--------------------------------------------------------------------------
*/

if ((int) $product["user_id"] === $userId) {

    echo json_encode([
        "success" => false,
        "message" => "You can't buy your own product."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| FIND OR CREATE USER CART
|--------------------------------------------------------------------------
|
| Your database has UNIQUE(user_id), so a user
| can only have one cart.
|
*/

$stmt = $conn->prepare("
    SELECT cart_id
    FROM cart
    WHERE user_id = ?
    LIMIT 1
");


$stmt->bind_param(
    "i",
    $userId
);


$stmt->execute();

$result = $stmt->get_result();


if ($result->num_rows > 0) {

    $cart = $result->fetch_assoc();

    $cartId = (int) $cart["cart_id"];

} else {

    $stmt->close();


    $stmt = $conn->prepare("
        INSERT INTO cart (user_id)
        VALUES (?)
    ");


    $stmt->bind_param(
        "i",
        $userId
    );


    if (!$stmt->execute()) {

        echo json_encode([
            "success" => false,
            "message" => "Could not create your cart."
        ]);

        $stmt->close();
        $conn->close();

        exit;
    }


    $cartId = $stmt->insert_id;
}


$stmt->close();


/*
|--------------------------------------------------------------------------
| CHECK WHETHER PRODUCT IS ALREADY IN CART
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("
    SELECT
        cart_item_id,
        quantity
    FROM cart_items
    WHERE cart_id = ?
      AND product_id = ?
    LIMIT 1
");


$stmt->bind_param(
    "ii",
    $cartId,
    $productId
);


$stmt->execute();

$result = $stmt->get_result();


if ($result->num_rows > 0) {

    /*
     * Existing cart item
     */

    $cartItem = $result->fetch_assoc();

    $cartItemId =
        (int) $cartItem["cart_item_id"];

    $existingQuantity =
        (int) $cartItem["quantity"];

    $newQuantity = $buyNow
        ? $quantity
        : $existingQuantity + $quantity;


    /*
     * Do not allow cart quantity
     * beyond current stock.
     */

    if ($newQuantity > $stock) {

        echo json_encode([
            "success" => false,
            "message" =>
                "You cannot add more than the available stock."
        ]);

        $stmt->close();
        $conn->close();

        exit;
    }


    $stmt->close();


    $stmt = $conn->prepare("
        UPDATE cart_items
        SET quantity = ?
        WHERE cart_item_id = ?
    ");


    $stmt->bind_param(
        "ii",
        $newQuantity,
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


    $finalQuantity = $newQuantity;

} else {

    /*
     * New cart item
     */

    $stmt->close();


    if ($quantity > $stock) {

        echo json_encode([
            "success" => false,
            "message" =>
                "You cannot add more than the available stock."
        ]);

        $conn->close();

        exit;
    }


    $stmt = $conn->prepare("
        INSERT INTO cart_items (
            cart_id,
            product_id,
            quantity
        )
        VALUES (?, ?, ?)
    ");


    $stmt->bind_param(
        "iii",
        $cartId,
        $productId,
        $quantity
    );


    if (!$stmt->execute()) {

        echo json_encode([
            "success" => false,
            "message" => "Could not add item to your cart."
        ]);

        $stmt->close();
        $conn->close();

        exit;
    }


    $cartItemId = $stmt->insert_id;

    $finalQuantity = $quantity;
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
        $product["product_name"] .
        " has been added to your cart.",

    "product_id" =>
        $productId,

    "cart_item_id" =>
        (int) $cartItemId,

    "quantity" =>
        $finalQuantity

]);

exit;