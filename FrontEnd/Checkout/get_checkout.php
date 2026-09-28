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
| CHECK CHECKOUT SELECTION
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
        "logged_in" => true,
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
            count($selectedIds),
            "?"
        )
    );


/*
|--------------------------------------------------------------------------
| LOAD CUSTOMER
|--------------------------------------------------------------------------
*/

$stmt =
    $conn->prepare("
        SELECT
            user_id,
            first_name,
            last_name,
            phone,
            address,
            account_status
        FROM users
        WHERE user_id = ?
        LIMIT 1
    ");


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Could not load customer information."
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
        "message" => "Your account could not be found."
    ]);

    $stmt->close();
    $conn->close();

    exit;
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

    echo json_encode([
        "success" => false,
        "message" => "Your account is not active."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| LOAD SELECTED CART ITEMS
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT

        ci.cart_item_id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,

        p.product_name,
        p.product_image,
        p.price,
        p.stock,
        p.status,
        p.catalog_status,

        u.user_id AS vendor_id,
        u.first_name AS vendor_first_name,
        u.last_name AS vendor_last_name,
        u.store_name AS vendor_store_name,
        u.is_vendor,
        u.verification_status,
        u.account_status AS vendor_account_status

    FROM cart_items ci

    INNER JOIN cart c
        ON ci.cart_id = c.cart_id

    INNER JOIN product p
        ON ci.product_id = p.product_id

    INNER JOIN users u
        ON p.user_id = u.user_id

    WHERE c.user_id = ?

      AND ci.cart_item_id IN (
        $placeholders
      )

    ORDER BY ci.added_at ASC
";


$stmt =
    $conn->prepare($sql);


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Could not load checkout items."
    ]);

    $conn->close();

    exit;
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
    $userId;


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


$stmt->execute();

$result =
    $stmt->get_result();


/*
|--------------------------------------------------------------------------
| BUILD ITEMS
|--------------------------------------------------------------------------
*/

$items = [];

$subtotal = 0;

$itemCount = 0;


while ($row = $result->fetch_assoc()) {

    /*
     * Product availability check.
     */

    if (
        (int)$row["status"] !== 1 ||
        (int)$row["catalog_status"] !== 3 ||
        (int)$row["stock"] <= 0 ||
        (int)$row["is_vendor"] !== 1 ||
        (int)$row["verification_status"] !== 2 ||
        (int)$row["vendor_account_status"] !== 0
    ) {

        echo json_encode([
            "success" => false,
            "message" =>
                "One of the selected products is no longer available."
        ]);

        $stmt->close();
        $conn->close();

        exit;
    }


    /*
     * Stock check.
     */

    if (
        (int)$row["quantity"] >
        (int)$row["stock"]
    ) {

        echo json_encode([
            "success" => false,
            "message" =>
                $row["product_name"] .
                " does not have enough stock."
        ]);

        $stmt->close();
        $conn->close();

        exit;
    }


    /*
     * Vendor name.
     */

    $vendorName =
        !empty($row["vendor_store_name"])
            ? $row["vendor_store_name"]
            : trim(
                ($row["vendor_first_name"] ?? "") .
                " " .
                ($row["vendor_last_name"] ?? "")
            );


    /*
     * Product image.
     */

    $image =
        !empty($row["product_image"])
            ? "../" . ltrim(
                $row["product_image"],
                "/"
            )
            : "../products/no_photo.jpg";


    /*
     * Price comes from database.
     */

    $price =
        (float)$row["price"];


    $quantity =
        (int)$row["quantity"];


    $productTotal =
        $price * $quantity;


    $subtotal +=
        $productTotal;


    $itemCount +=
        $quantity;


    $items[] = [

        "cart_item_id" =>
            (int)$row["cart_item_id"],

        "product_id" =>
            (int)$row["product_id"],

        "vendor_id" =>
            (int)$row["vendor_id"],

        "vendor" =>
            $vendorName,

        "name" =>
            $row["product_name"],

        "image" =>
            $image,

        "price" =>
            $price,

        "quantity" =>
            $quantity,

        "total" =>
            $productTotal

    ];
}


$stmt->close();


/*
|--------------------------------------------------------------------------
| CHECK THAT ALL SELECTED ITEMS WERE FOUND
|--------------------------------------------------------------------------
*/

if (
    count($items) !==
    count($selectedIds)
) {

    echo json_encode([
        "success" => false,
        "message" =>
            "One or more checkout items could not be found."
    ]);

    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| SHIPPING PER SELLER (item sizes + zone — see lib/shipping.php)
|--------------------------------------------------------------------------
|
| ?address_id= the address picked at checkout (else the default one).
| The same calculation is repeated by place_order.php.
|
*/

require_once __DIR__ . "/../../lib/shipping.php";

$addressId =
    (int)($_GET["address_id"] ?? 0);

$stmt =
    $conn->prepare("
        SELECT *
        FROM user_addresses
        WHERE user_id = ?
          AND (address_id = ? OR (? = 0 AND is_default = 1))
        LIMIT 1
    ");

$stmt->bind_param("iii", $userId, $addressId, $addressId);
$stmt->execute();
$address = $stmt->get_result()->fetch_assoc();
$stmt->close();

$shipments = [];
$shippingTotal = 0;

// Each seller's items → one parcel
$linesByVendor = [];
$vendorNames = [];
foreach ($items as $item) {
    $linesByVendor[$item["vendor_id"]][] = [$item["product_id"], $item["quantity"], $item["total"]];
    $vendorNames[$item["vendor_id"]] = $item["vendor"];
}

foreach ($linesByVendor as $vendorId => $lines) {

    $shop = shopLocation($conn, $vendorId);

    $quote = $address && !empty($address["city_code"])
        ? shippingQuote($conn, $vendorId, $address, $lines)
        : null;

    $shipments[$vendorId] = [
        "vendor_id" => $vendorId,
        "vendor" => $vendorNames[$vendorId],
        "from" => $shop["label"],
        "fee" => $quote ? $quote["fee"] : null,
        "zone" => $quote ? $quote["zone_label"] : null,
        "free" => $quote ? $quote["free"] : false,
        "free_min" => $shop["free_min"],
        // "Add ₱X more from this shop for free shipping"
        "add_for_free" => $quote ? $quote["add_for_free"] : null,
        "regular_fee" => $quote ? $quote["regular_fee"] : null
    ];

    $shippingTotal += $quote ? $quote["fee"] : 0;
}


/*
|--------------------------------------------------------------------------
| RETURN CHECKOUT DATA
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success" => true,

    "logged_in" => true,

    "customer" => [

        "user_id" =>
            (int)$customer["user_id"],

        "name" =>
            trim(
                $customer["first_name"] .
                " " .
                $customer["last_name"]
            ),

        "phone" =>
            $customer["phone"],

        "address" =>
            $customer["address"]

    ],

    "items" =>
        $items,

    "subtotal" =>
        $subtotal,

    "item_count" =>
        $itemCount,

    // One entry per seller; fee is null until a valid address is chosen
    "shipments" =>
        array_values($shipments),

    "shipping_total" =>
        $shippingTotal,

    "address_id" =>
        $address ? (int)$address["address_id"] : null

]);


$conn->close();

exit;