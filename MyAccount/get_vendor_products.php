<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

require_once __DIR__ . "/../FrontEnd/connection.php";

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
| GET VENDOR INFORMATION
|--------------------------------------------------------------------------
*/

$userSql = "
    SELECT
        user_id,
        first_name,
        last_name,
        store_name,
        is_vendor,
        verification_status,
        account_status
    FROM users
    WHERE user_id = ?
";

$userStmt = $conn->prepare($userSql);

if (!$userStmt) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare vendor query."
    ]);
    exit;
}

$userStmt->bind_param("i", $user_id);

if (!$userStmt->execute()) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to load vendor."
    ]);

    $userStmt->close();
    $conn->close();
    exit;
}

$userResult = $userStmt->get_result();

if ($userResult->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Vendor not found."
    ]);

    $userStmt->close();
    $conn->close();
    exit;
}

$vendor = $userResult->fetch_assoc();

$userStmt->close();


/*
|--------------------------------------------------------------------------
| MAKE SURE USER IS ACTUALLY A VENDOR
|--------------------------------------------------------------------------
*/

if ((int)$vendor["is_vendor"] !== 1) {

    echo json_encode([
        "success" => false,
        "message" => "This account is not a vendor."
    ]);

    $conn->close();
    exit;
}


/*
|--------------------------------------------------------------------------
| GET VENDOR PRODUCTS
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT
        product_id,
        user_id,
        product_image,
        product_name,
        category,
        subcategory,
        description,
        location,
        price,
        stock,
        submitted_at,
        reviewed_at,
        status,
        rejection_reason,
        catalog_status
    FROM product
    WHERE user_id = ?
    ORDER BY submitted_at DESC
";

$stmt = $conn->prepare($sql);

if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare product query."
    ]);

    $conn->close();
    exit;
}

$stmt->bind_param("i", $user_id);

if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to load products."
    ]);

    $stmt->close();
    $conn->close();
    exit;
}

$result = $stmt->get_result();

$products = [];


/*
|--------------------------------------------------------------------------
| CONVERT DATABASE VALUES INTO JAVASCRIPT-FRIENDLY DATA
|--------------------------------------------------------------------------
*/

while ($row = $result->fetch_assoc()) {

    /*
     * Product status:
     *
     * 0 = Pending
     * 1 = Approved
     * 2 = Rejected
     */

   $status = (int)$row["status"];
$catalogStatus = (int)$row["catalog_status"];

/*
|--------------------------------------------------------------------------
| Display status for the vendor inventory
|--------------------------------------------------------------------------
|
| status:
|   0 = Pending verification
|   1 = Approved
|   2 = Rejected
|
| catalog_status:
|   0 = Not Approved
|   1 = Hidden
|   2 = Review
|   3 = Active
|
*/
if ($status === 3) {

    // Soft deleted
    $displayStatus = "deleted";

} elseif ($catalogStatus === 3 && $status === 1) {

    // Fully approved and active
    $displayStatus = "verified";

} elseif ($catalogStatus === 2) {

    // Product/catalog changes are being reviewed
    $displayStatus = "pending";

} elseif ($status === 2) {

    // Product verification was rejected
    $displayStatus = "revision";

} elseif ($catalogStatus === 0) {

    // Not submitted/approved for catalog
    $displayStatus = "draft";

} else {

    // Fallback
    $displayStatus = "draft";
}

    /*
     * Catalog status:
     *
     * 0 = Not Approved
     * 1 = Hidden
     * 2 = Review
     * 3 = Active
     */

    /*
     * Image
     */

    $image = $row["product_image"];

    if (empty($image)) {
        $image = "products/no_photo.jpg";
    }


    /*
     * max_stock does NOT exist in your database.
     *
     * We temporarily calculate one for the frontend.
     */

    $maxStock = max((int)$row["stock"], 50);


    $products[] = [

        "id" => (int)$row["product_id"],

        "product_id" => (string)$row["product_id"],

        "user_id" => (int)$row["user_id"],

        "name" => $row["product_name"],

        "category" => $row["category"],

        "subcategory" => $row["subcategory"],

        "description" => $row["description"],

        "location" => $row["location"],

        "price" => (float)$row["price"],

        "stock" => (int)$row["stock"],

        "max_stock" => $maxStock,

        "image" => $image,

        "images" => [$image],

        "status" => $displayStatus,

        "database_status" => (int)$row["status"],

        "catalog_status" => $catalogStatus,

        "rejection_reason" => $row["rejection_reason"],

        "submitted_at" => $row["submitted_at"],

        "reviewed_at" => $row["reviewed_at"]

    ];
}


/*
|--------------------------------------------------------------------------
| RETURN DATA
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success" => true,

    "vendor" => [

        "user_id" => (int)$vendor["user_id"],

        "first_name" => $vendor["first_name"],

        "last_name" => $vendor["last_name"],

        "store_name" => $vendor["store_name"],

        "is_vendor" => (int)$vendor["is_vendor"],

        "verification_status" => (int)$vendor["verification_status"],

        "account_status" => (int)$vendor["account_status"]

    ],

    "count" => count($products),

    "products" => $products

]);


$stmt->close();
$conn->close();

?>