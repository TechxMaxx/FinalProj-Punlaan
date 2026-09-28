<?php

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "logged_in" => false,
        "message" => "Please log in first."
    ]);

    exit;
}

$user_id = (int) $_SESSION["user_id"];

require_once __DIR__ . "/../../FrontEnd/connection.php";


/* =========================================================
   GET PRODUCT ID
========================================================= */

$product_id =
    (int) ($_POST["product_id"] ?? 0);


if ($product_id <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid product ID."
    ]);

    exit;
}


/* =========================================================
   CHECK IF ALREADY SAVED
========================================================= */

$checkSql = "

    SELECT saved_plant_id

    FROM saved_plants

    WHERE
        user_id = ?
        AND product_id = ?

    LIMIT 1

";

$checkStmt =
    $conn->prepare($checkSql);

$checkStmt->bind_param(
    "ii",
    $user_id,
    $product_id
);

$checkStmt->execute();

$checkResult =
    $checkStmt->get_result();

$existing =
    $checkResult->fetch_assoc();

$checkStmt->close();


/* =========================================================
   REMOVE IF ALREADY SAVED
========================================================= */

if ($existing) {

    $deleteSql = "

        DELETE FROM saved_plants

        WHERE
            saved_plant_id = ?
            AND user_id = ?

    ";

    $deleteStmt =
        $conn->prepare($deleteSql);

    $saved_plant_id =
        (int) $existing["saved_plant_id"];

    $deleteStmt->bind_param(
        "ii",
        $saved_plant_id,
        $user_id
    );

    $deleteStmt->execute();

    $deleteStmt->close();

    echo json_encode([
        "success" => true,
        "saved" => false,
        "message" => "Plant removed from Saved Plants."
    ]);

    $conn->close();

    exit;
}


/* =========================================================
   SAVE PRODUCT
========================================================= */

$insertSql = "

    INSERT INTO saved_plants
        (user_id, product_id)

    VALUES
        (?, ?)

";

$insertStmt =
    $conn->prepare($insertSql);

$insertStmt->bind_param(
    "ii",
    $user_id,
    $product_id
);


if (!$insertStmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Could not save this plant."
    ]);

    $insertStmt->close();
    $conn->close();

    exit;
}


$insertStmt->close();

echo json_encode([
    "success" => true,
    "saved" => true,
    "message" => "Plant saved."
]);


$conn->close();

?>