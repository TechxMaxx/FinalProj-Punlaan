<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../FrontEnd/connection.php";

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

/*
|--------------------------------------------------------------------------
| GET LOGGED-IN USER
|--------------------------------------------------------------------------
*/

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "message" => "Not logged in."
    ]);

    exit;
}

$user_id = (int)$_SESSION["user_id"];

/*
|--------------------------------------------------------------------------
| Read JSON request
|--------------------------------------------------------------------------
*/

$input = json_decode(
    file_get_contents("php://input"),
    true
);

if (!is_array($input)) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid request data."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| Required product ID
|--------------------------------------------------------------------------
*/

$product_id = filter_var(
    $input["product_id"] ?? null,
    FILTER_VALIDATE_INT
);

if (!$product_id) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid product ID."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| Confirm that this product belongs to this vendor
|--------------------------------------------------------------------------
*/

$checkSql = "
    SELECT
        product_id,
        status
    FROM product
    WHERE product_id = ?
      AND user_id = ?
";

$checkStmt =
    $conn->prepare($checkSql);

if (!$checkStmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare product check."
    ]);

    exit;
}

$checkStmt->bind_param(
    "ii",
    $product_id,
    $user_id
);

if (!$checkStmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to check product."
    ]);

    $checkStmt->close();
    $conn->close();

    exit;
}

$checkResult =
    $checkStmt->get_result();

if ($checkResult->num_rows === 0) {

    $checkStmt->close();
    $conn->close();

    echo json_encode([
        "success" => false,
        "message" => "Product not found or does not belong to this vendor."
    ]);

    exit;
}

$product =
    $checkResult->fetch_assoc();

$checkStmt->close();


/*
|--------------------------------------------------------------------------
| Prevent deleting an already deleted product
|--------------------------------------------------------------------------
*/

if ((int)$product["status"] === 3) {

    $conn->close();

    echo json_encode([
        "success" => false,
        "message" => "This product has already been deleted."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| SOFT DELETE
|--------------------------------------------------------------------------
|
| status:
|   0 = Pending
|   1 = Approved
|   2 = Rejected
|   3 = Deleted
|
| We do NOT use DELETE FROM.
|--------------------------------------------------------------------------
*/

$sql = "
    UPDATE product
    SET
        status = 3
    WHERE product_id = ?
      AND user_id = ?
";

$stmt =
    $conn->prepare($sql);

if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare delete query."
    ]);

    $conn->close();

    exit;
}

$stmt->bind_param(
    "ii",
    $product_id,
    $user_id
);


if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to delete product: " . $stmt->error
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$stmt->close();
$conn->close();


echo json_encode([
    "success" => true,
    "message" => "Product deleted successfully.",
    "product_id" => $product_id,
    "status" => 3
]);

exit;