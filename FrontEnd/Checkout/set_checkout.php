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
| LOGGED-IN USER
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


$cartItemIds =
    $input["cart_item_ids"] ?? [];


if (!is_array($cartItemIds)) {

    $cartItemIds = [
        $cartItemIds
    ];

}


/*
|--------------------------------------------------------------------------
| CLEAN IDS
|--------------------------------------------------------------------------
*/

$cartItemIds =
    array_values(
        array_unique(
            array_filter(
                array_map(
                    "intval",
                    $cartItemIds
                ),
                function ($id) {
                    return $id > 0;
                }
            )
        )
    );


if (count($cartItemIds) === 0) {

    echo json_encode([
        "success" => false,
        "message" => "No items were selected."
    ]);

    $conn->close();

    exit;
}


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
        "message" => "Could not find your cart."
    ]);

    $conn->close();

    exit;
}


$stmt->bind_param(
    "i",
    $userId
);


$stmt->execute();

$result =
    $stmt->get_result();


if ($result->num_rows === 0) {

    echo json_encode([
        "success" => false,
        "message" => "Your cart is empty."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$cart =
    $result->fetch_assoc();


$cartId =
    (int) $cart["cart_id"];


$stmt->close();


/*
|--------------------------------------------------------------------------
| BUILD SQL PLACEHOLDERS
|--------------------------------------------------------------------------
*/

$placeholders =
    implode(
        ",",
        array_fill(
            0,
            count($cartItemIds),
            "?"
        )
    );


$types =
    "i" .
    str_repeat(
        "i",
        count($cartItemIds)
    );


/*
|--------------------------------------------------------------------------
| VERIFY SELECTED ITEMS BELONG TO USER
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT cart_item_id
    FROM cart_items
    WHERE cart_id = ?
      AND cart_item_id IN ($placeholders)
";


$stmt =
    $conn->prepare($sql);


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Could not verify selected items."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| BIND PARAMETERS
|--------------------------------------------------------------------------
*/

$params = [];

$params[] =
    $types;

$params[] =
    $cartId;

foreach ($cartItemIds as $id) {

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


$stmt->execute();

$result =
    $stmt->get_result();


$validIds = [];


while ($row = $result->fetch_assoc()) {

    $validIds[] =
        (int) $row["cart_item_id"];

}


$stmt->close();


/*
|--------------------------------------------------------------------------
| MAKE SURE EVERY SELECTED ITEM WAS VALID
|--------------------------------------------------------------------------
*/

if (
    count($validIds) !==
    count($cartItemIds)
) {

    echo json_encode([
        "success" => false,
        "message" =>
            "One or more selected cart items are no longer available."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| STORE SELECTION IN PHP SESSION
|--------------------------------------------------------------------------
|
| This is temporary checkout state.
| It is NOT the final order.
|
*/

$_SESSION["checkout_cart_item_ids"] =
    $validIds;


/*
|--------------------------------------------------------------------------
| SUCCESS
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success" => true,

    "message" =>
        "Checkout selection saved.",

    "count" =>
        count($validIds)

]);


$conn->close();

exit;