<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../FrontEnd/connection.php";

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

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
| Read fields
|--------------------------------------------------------------------------
*/

$product_name = trim(
    $input["product_name"] ?? ""
);

$category = trim(
    $input["category"] ?? ""
);

$subcategory = trim(
    $input["subcategory"] ?? ""
);

$description = trim(
    $input["description"] ?? ""
);

$location = trim(
    $input["location"] ?? ""
);

$price = $input["price"] ?? null;
$stock = $input["stock"] ?? null;


/*
|--------------------------------------------------------------------------
| Validate product name
|--------------------------------------------------------------------------
*/

if ($product_name === "") {
    echo json_encode([
        "success" => false,
        "message" => "Product name is required."
    ]);
    exit;
}


/*
|--------------------------------------------------------------------------
| Validate category + subcategory (categories table, Admin → Categories)
|--------------------------------------------------------------------------
*/

require_once __DIR__ . "/../lib/categories.php";

try {
    [$category, $subcategory] = validCategoryPair($conn, $category, $subcategory);
} catch (RuntimeException $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
    exit;
}

/*
|--------------------------------------------------------------------------
| Validate price
|--------------------------------------------------------------------------
*/

if (
    !is_numeric($price) ||
    (float)$price < 0
) {
    echo json_encode([
        "success" => false,
        "message" => "Please enter a valid price."
    ]);
    exit;
}


/*
|--------------------------------------------------------------------------
| Validate stock
|--------------------------------------------------------------------------
*/

if (
    !filter_var(
        $stock,
        FILTER_VALIDATE_INT
    ) &&
    (int)$stock !== 0
) {
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
| Default product image
|--------------------------------------------------------------------------
*/

$product_image = "products/no_photo.jpg";


/*
|--------------------------------------------------------------------------
| Insert product
|--------------------------------------------------------------------------
|
| status:
|   0 = Pending verification
|
| catalog_status:
|   2 = Review
|--------------------------------------------------------------------------
*/

$sql = "
    INSERT INTO product (
        user_id,
        product_image,
        product_name,
        category,
        subcategory,
        description,
        location,
        price,
        stock,
        status,
        catalog_status
    )
    VALUES (
        ?,
        ?,
        ?,
        ?,
        NULLIF(?, ''),
        ?,
        NULLIF(?, ''),
        ?,
        ?,
        0,
        2
    )
";


$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare insert query."
    ]);

    $conn->close();
    exit;
}


$stmt->bind_param(
    "issssssdi",
    $user_id,
    $product_image,
    $product_name,
    $category,
    $subcategory,
    $description,
    $location,
    $price,
    $stock
);


if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to add product: " . $stmt->error
    ]);

    $stmt->close();
    $conn->close();
    exit;
}


$newProductId =
    $stmt->insert_id;


$stmt->close();
$conn->close();


echo json_encode([
    "success" => true,
    "message" => "Product submitted for admin review.",
    "product_id" => $newProductId,
    "status" => 0,
    "catalog_status" => 2
]);

exit;
?>