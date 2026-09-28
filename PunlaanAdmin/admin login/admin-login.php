<?php

session_start();

header("Content-Type: application/json");

require_once "../connection.php";


/* =========================================================
   READ LOGIN DATA
========================================================= */

$email =
    trim($_POST["email"] ?? "");

$password =
    $_POST["password"] ?? "";


if ($email === "" || $password === "") {

    echo json_encode([
        "success" => false,
        "message" => "Please enter your email and password."
    ]);

    exit;
}


/* =========================================================
   FIND ACCOUNT
========================================================= */

$stmt = $conn->prepare("
    SELECT
        user_id,
        first_name,
        last_name,
        email,
        password,
        is_admin,
        account_status
    FROM users
    WHERE email = ?
    LIMIT 1
");


if (!$stmt) {

    echo json_encode([
        "success" => false,
        "message" => "Database error."
    ]);

    exit;
}


$stmt->bind_param(
    "s",
    $email
);


$stmt->execute();

$result =
    $stmt->get_result();


/* =========================================================
   ACCOUNT NOT FOUND
========================================================= */

if ($result->num_rows === 0) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid admin credentials."
    ]);

    $stmt->close();
    $conn->close();

    exit;
}


$user =
    $result->fetch_assoc();

$stmt->close();


/* =========================================================
   PASSWORD
========================================================= */

if (!password_verify(
    $password,
    $user["password"]
)) {

    echo json_encode([
        "success" => false,
        "message" => "Invalid admin credentials."
    ]);

    $conn->close();

    exit;
}


/* =========================================================
   ADMIN CHECK
========================================================= */

if ((int)$user["is_admin"] !== 1) {

    echo json_encode([
        "success" => false,
        "message" => "This account does not have administrator access."
    ]);

    $conn->close();

    exit;
}


/* =========================================================
   ACCOUNT STATUS
========================================================= */

if ((int)$user["account_status"] === 1) {

    echo json_encode([
        "success" => false,
        "message" => "This admin account is suspended."
    ]);

    $conn->close();

    exit;
}


if ((int)$user["account_status"] === 2) {

    echo json_encode([
        "success" => false,
        "message" => "This admin account is blocked."
    ]);

    $conn->close();

    exit;
}


/* =========================================================
   CREATE ADMIN SESSION
========================================================= */

session_regenerate_id(true);


$_SESSION["admin_user_id"] =
    (int)$user["user_id"];

$_SESSION["admin_first_name"] =
    $user["first_name"];

$_SESSION["admin_last_name"] =
    $user["last_name"];

$_SESSION["admin_email"] =
    $user["email"];

$_SESSION["is_admin"] =
    1;


/* =========================================================
   UPDATE LAST LOGIN
========================================================= */

$update =
    $conn->prepare("
        UPDATE users
        SET last_login = NOW()
        WHERE user_id = ?
    ");


if ($update) {

    $update->bind_param(
        "i",
        $user["user_id"]
    );

    $update->execute();

    $update->close();
}


/* =========================================================
   SUCCESS
========================================================= */

echo json_encode([

    "success" => true,

    "message" => "Admin login successful.",

    "user" => [
        "user_id" =>
            (int)$user["user_id"],

        "first_name" =>
            $user["first_name"],

        "last_name" =>
            $user["last_name"],

        "email" =>
            $user["email"]
    ]

]);


$conn->close();

?>