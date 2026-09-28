<?php

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");


/* =========================================================
   CHECK LOGIN
========================================================= */

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "logged_in" => false,
        "message" => "Not logged in.",
        "plants" => []
    ]);

    exit;
}


$user_id = (int)$_SESSION["user_id"];


require_once __DIR__ . "/../../FrontEnd/connection.php";


/* =========================================================
   GET SAVED PLANTS
========================================================= */

$sql = "

    SELECT

        sp.saved_plant_id AS id,

        sp.product_id,

        p.product_name AS plant_name,
        p.product_image AS plant_image,
        p.subcategory AS category,
        p.price,
        p.stock,

        COALESCE(
            NULLIF(u.store_name, ''),
            CONCAT(
                u.first_name,
                ' ',
                u.last_name
            )
        ) AS vendor_name

    FROM saved_plants sp

    INNER JOIN product p
        ON sp.product_id = p.product_id

    INNER JOIN users u
        ON p.user_id = u.user_id

    WHERE sp.user_id = ?

    ORDER BY sp.saved_at DESC

";


$stmt = $conn->prepare($sql);


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare query.",
        "plants" => []
    ]);

    exit;
}


$stmt->bind_param(
    "i",
    $user_id
);


if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to load saved plants.",
        "plants" => []
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$result =
    $stmt->get_result();


$plants = [];


while ($row = $result->fetch_assoc()) {

    $row["id"] =
        (int)$row["id"];

    $row["product_id"] =
        (int)$row["product_id"];

    $row["price"] =
        (float)$row["price"];

    $row["stock"] =
        (int)$row["stock"];

    $row["in_stock"] =
        $row["stock"] > 0;


    $plants[] =
        $row;
}


/* =========================================================
   RETURN DATA
========================================================= */

echo json_encode([
    "success" => true,
    "logged_in" => true,
    "plants" => $plants
]);


$stmt->close();

$conn->close();

?>