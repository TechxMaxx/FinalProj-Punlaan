<?php

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");


/*
|--------------------------------------------------------------------------
| CHECK SESSION
|--------------------------------------------------------------------------
*/

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => true,
        "logged_in" => false,
        "message" => "Not logged in."
    ]);

    exit;
}


require_once __DIR__ . "/../FrontEnd/connection.php";


/*
|--------------------------------------------------------------------------
| GET CURRENT USER ID
|--------------------------------------------------------------------------
*/

$userId = (int)$_SESSION["user_id"];


/*
|--------------------------------------------------------------------------
| LOAD CURRENT USER
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("
    SELECT
        user_id,
        first_name,
        last_name,
        store_name,
        email,
        phone,
        address,
        profile_picture,
        is_vendor,
        verification_status,
        account_status
    FROM users
    WHERE user_id = ?
    LIMIT 1
");


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "logged_in" => false,
        "message" => "Failed to prepare user query."
    ]);

    $conn->close();

    exit;
}


$stmt->bind_param(
    "i",
    $userId
);


$stmt->execute();

$result = $stmt->get_result();


/*
|--------------------------------------------------------------------------
| USER NO LONGER EXISTS
|--------------------------------------------------------------------------
*/

if ($result->num_rows === 0) {

    $_SESSION = [];
    session_destroy();

    echo json_encode([
        "success" => true,
        "logged_in" => false,
        "message" => "User account no longer exists."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$user = $result->fetch_assoc();


/*
|--------------------------------------------------------------------------
| ACCOUNT STATUS
|--------------------------------------------------------------------------
|
| 0 = Active
| 1 = Suspended
| 2 = Blocked
|
*/

if (
    (int)$user["account_status"] === 1 ||
    (int)$user["account_status"] === 2
) {

    $_SESSION = [];
    session_destroy();

    echo json_encode([
        "success" => true,
        "logged_in" => false,
        "message" => "Your account is no longer active."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


/*
|--------------------------------------------------------------------------
| RETURN CURRENT USER
|--------------------------------------------------------------------------
*/

echo json_encode([

    "success" => true,

    "logged_in" => true,

    "user" => [

        "user_id" =>
            (int)$user["user_id"],

        "first_name" =>
            $user["first_name"],

        "last_name" =>
            $user["last_name"],

        "store_name" =>
            $user["store_name"],

        "email" =>
            $user["email"],

        "phone" =>
            $user["phone"],

        "address" =>
            $user["address"],

        "profile_picture" =>
            $user["profile_picture"],

        "is_vendor" =>
            (int)$user["is_vendor"],

        "verification_status" =>
            (int)$user["verification_status"],

        "account_status" =>
            (int)$user["account_status"]

    ]

]);


$stmt->close();
$conn->close();

exit;