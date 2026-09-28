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
        "message" => "Not logged in."
    ]);

    exit;
}


$user_id = (int)$_SESSION["user_id"];


require_once __DIR__ . "/../../FrontEnd/connection.php";


/* =========================================================
   GET SAVED PLANT ID
========================================================= */

$saved_plant_id =
    (int)($_POST["saved_plant_id"] ?? 0);


if ($saved_plant_id <= 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid saved plant ID."
    ]);

    exit;
}


/* =========================================================
   DELETE
========================================================= */

$sql = "

    DELETE FROM saved_plants

    WHERE
        saved_plant_id = ?
        AND user_id = ?

";


$stmt =
    $conn->prepare($sql);


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to prepare delete query."
    ]);

    exit;
}


$stmt->bind_param(
    "ii",
    $saved_plant_id,
    $user_id
);


if (!$stmt->execute()) {

    echo json_encode([
        "success" => false,
        "message" => "Failed to remove saved plant."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


if ($stmt->affected_rows === 0) {

    echo json_encode([
        "success" => false,
        "message" => "Saved plant not found."
    ]);

} else {

    echo json_encode([
        "success" => true,
        "message" => "Plant removed from saved plants."
    ]);

}


$stmt->close();

$conn->close();

?>