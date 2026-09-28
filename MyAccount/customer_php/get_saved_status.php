<?php

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");


if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "logged_in" => false,
        "saved" => false,
        "message" => "Not logged in."
    ]);

    exit;
}


$user_id = (int) $_SESSION["user_id"];

$product_id =
    (int) ($_GET["product_id"] ?? 0);


if ($product_id <= 0) {

    echo json_encode([
        "success" => false,
        "saved" => false,
        "message" => "Invalid product ID."
    ]);

    exit;
}


require_once __DIR__ . "/../../FrontEnd/connection.php";


$sql = "

    SELECT saved_plant_id

    FROM saved_plants

    WHERE
        user_id = ?
        AND product_id = ?

    LIMIT 1

";


$stmt =
    $conn->prepare($sql);


$stmt->bind_param(
    "ii",
    $user_id,
    $product_id
);


$stmt->execute();

$result =
    $stmt->get_result();


$saved =
    $result->num_rows > 0;


echo json_encode([
    "success" => true,
    "logged_in" => true,
    "saved" => $saved
]);


$stmt->close();

$conn->close();

?>