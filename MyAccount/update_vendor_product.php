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

$input = json_decode(file_get_contents("php://input"), true);

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
| Editable fields
|--------------------------------------------------------------------------
*/

$product_name = trim($input["product_name"] ?? "");
$category = trim($input["category"] ?? "");
$subcategory = trim($input["subcategory"] ?? "");
$description = trim($input["description"] ?? "");
$location = trim($input["location"] ?? "");

$price = $input["price"] ?? null;
$stock = $input["stock"] ?? null;


/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

if ($product_name === "") {
    echo json_encode([
        "success" => false,
        "message" => "Product name is required."
    ]);
    exit;
}

if ($category === "") {
    echo json_encode([
        "success" => false,
        "message" => "Category is required."
    ]);
    exit;
}

// Must be one of the categories in Admin → Categories
require_once __DIR__ . "/../lib/categories.php";

try {
    [$category, $subcategory] = validCategoryPair($conn, $category, $subcategory);
    $subcategory = (string)$subcategory;
} catch (RuntimeException $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
    exit;
}

if (!is_numeric($price) || (float)$price < 0) {
    echo json_encode([
        "success" => false,
        "message" => "Please enter a valid price."
    ]);
    exit;
}

if (!filter_var($stock, FILTER_VALIDATE_INT) && (int)$stock !== 0) {
    echo json_encode([
        "success" => false,
        "message" => "Please enter a valid stock quantity."
    ]);
    exit;
}

$price = (float)$price;
$stock = (int)$stock;


/*
|--------------------------------------------------------------------------
| Confirm that this product belongs to this vendor
|--------------------------------------------------------------------------
*/

$checkSql = "
    SELECT
        product_id,
        status,
        catalog_status
    FROM product
    WHERE product_id = ?
      AND user_id = ?
";

$checkStmt = $conn->prepare($checkSql);

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

$checkStmt->execute();

$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows === 0) {

    $checkStmt->close();
    $conn->close();

    echo json_encode([
        "success" => false,
        "message" => "Product not found or does not belong to this vendor."
    ]);

    exit;
}

$oldProduct = $checkResult->fetch_assoc();

$checkStmt->close();


/*
|--------------------------------------------------------------------------
| Save edited product
|--------------------------------------------------------------------------
|
| Edits go back through the same review as new listings:
|
| status:
|   0 = Pending (shows up again in admin → Vendor Listings Approval)
|   1 = Approved
|   2 = Rejected
|
| catalog_status:
|   2 = Review (hidden from the Marketplace until approved again)
|--------------------------------------------------------------------------
*/
$sql = "
    UPDATE product
    SET
        product_name = ?,
        category = ?,
        subcategory = NULLIF(?, ''),
        description = ?,
        location = NULLIF(?, ''),
        price = ?,
        stock = ?,

        status = 0,
        catalog_status = 2,
        rejection_reason = NULL

    WHERE product_id = ?
      AND user_id = ?
";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare update query."
    ]);

    $conn->close();
    exit;
}

$stmt->bind_param(
    "sssssdiii",
    $product_name,
    $category,
    $subcategory,
    $description,
    $location,
    $price,
    $stock,
    $product_id,
    $user_id
);

if (!$stmt->execute()) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to update product: " . $stmt->error
    ]);

    $stmt->close();
    $conn->close();
    exit;
}

$stmt->close();
$conn->close();

echo json_encode([
    "success" => true,
    "message" => "Product changes submitted for admin review.",
    "product_id" => $product_id,
    "catalog_status" => 2
]);

exit;