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


/*
|--------------------------------------------------------------------------
| ACCEPT ONE OR MULTIPLE CART ITEM IDS
|--------------------------------------------------------------------------
|
| Single:
| {
|   "cart_item_ids": [5]
| }
|
| Multiple:
| {
|   "cart_item_ids": [5, 7, 9]
| }
|
*/

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
        "message" => "No cart items were selected."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| FIND THE USER'S CART
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
        "message" => "Failed to prepare cart query."
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
        "success" => true,
        "message" => "Your cart is already empty.",
        "removed" => 0
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
| BUILD PLACEHOLDERS
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


/*
|--------------------------------------------------------------------------
| CREATE TYPES STRING
|--------------------------------------------------------------------------
*/

$types =
    "i" .
    str_repeat(
        "i",
        count($cartItemIds)
    );


/*
|--------------------------------------------------------------------------
| DELETE ONLY ITEMS FROM THIS USER'S CART
|--------------------------------------------------------------------------
*/

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

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare cart removal."
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


/*
|--------------------------------------------------------------------------
| bind_param NEEDS REFERENCES
|--------------------------------------------------------------------------
*/

$references = [];

foreach ($params as $key => $value) {
    $references[$key] = &$params[$key];
}


call_user_func_array(
    [$stmt, "bind_param"],
    $references
);


/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Could not remove cart item(s)."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$removed =
    $stmt->affected_rows;


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
        $removed === 1
            ? "Item removed from your cart."
            : $removed . " items removed from your cart.",

    "removed" =>
        $removed

]);

exit;