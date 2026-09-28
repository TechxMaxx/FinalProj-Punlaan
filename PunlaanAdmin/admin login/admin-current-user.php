<?php

session_start();

header("Content-Type: application/json");


/* =========================================================
   CHECK ADMIN SESSION
========================================================= */

if (
    !isset($_SESSION["admin_user_id"]) ||
    (int)($_SESSION["is_admin"] ?? 0) !== 1
) {
    echo json_encode([
        "success" => true,
        "logged_in" => false
    ]);
    exit;
}


require_once "../connection.php";

$adminId = (int)$_SESSION["admin_user_id"];


/* =========================================================
   LOAD ADMIN
========================================================= */

$stmt = $conn->prepare("
    SELECT
        user_id,
        first_name,
        last_name,
        email,
        is_admin,
        is_superadmin,
        account_status
    FROM users
    WHERE user_id = ?
    LIMIT 1
");

$stmt->bind_param("i", $adminId);
$stmt->execute();

$result = $stmt->get_result();


/* =========================================================
   ADMIN NO LONGER EXISTS
========================================================= */

if ($result->num_rows === 0) {

    $_SESSION = [];
    session_destroy();

    echo json_encode([
        "success" => true,
        "logged_in" => false
    ]);

    exit;
}


$admin = $result->fetch_assoc();


/* =========================================================
   RECHECK ADMIN PERMISSION
========================================================= */

if (
    (int)$admin["is_admin"] !== 1 ||
    (int)$admin["account_status"] !== 0
) {

    $_SESSION = [];
    session_destroy();

    echo json_encode([
        "success" => true,
        "logged_in" => false,
        "message" => "Admin account is no longer active."
    ]);

    exit;
}


/* =========================================================
   RETURN ADMIN
========================================================= */

echo json_encode([
    "success" => true,
    "logged_in" => true,

    "user" => [
        "user_id" =>
            (int)$admin["user_id"],

        "first_name" =>
            $admin["first_name"],

        "last_name" =>
            $admin["last_name"],

        "email" =>
            $admin["email"],

        "is_admin" =>
            (int)$admin["is_admin"],

        "is_superadmin" =>
            (int)$admin["is_superadmin"],

        "account_status" =>
            (int)$admin["account_status"]
    ]
]);

$stmt->close();
$conn->close();

?>