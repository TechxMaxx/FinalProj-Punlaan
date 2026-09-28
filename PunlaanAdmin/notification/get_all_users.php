<?php

session_start();

header("Content-Type: application/json");


/* =========================================================
   CHECK ADMIN SESSION
========================================================= */

if (
    !isset($_SESSION["admin_user_id"]) ||
    !isset($_SESSION["is_admin"]) ||
    (int)$_SESSION["is_admin"] !== 1
) {

    echo json_encode([]);

    exit;

}


require_once __DIR__ . "/../connection.php";


/* =========================================================
   LOAD ACTIVE USERS
========================================================= */

$sql = "

    SELECT

        user_id,

        first_name,

        last_name,

        email,

        is_vendor

    FROM users

    WHERE
        account_status = 0

    ORDER BY
        first_name ASC,
        last_name ASC

";


$stmt =
    $conn->prepare(
        $sql
    );


if (!$stmt) {

    echo json_encode([]);

    $conn->close();

    exit;

}


if (!$stmt->execute()) {

    echo json_encode([]);

    $stmt->close();
    $conn->close();

    exit;

}


$result =
    $stmt->get_result();


$users = [];


while (
    $row =
    $result->fetch_assoc()
) {

    $firstName =
        trim(
            $row["first_name"] ?? ""
        );


    $lastName =
        trim(
            $row["last_name"] ?? ""
        );


    $fullName =
        trim(
            $firstName .
            " " .
            $lastName
        );


    if ($fullName === "") {

        $fullName =
            "User #" .
            $row["user_id"];

    }


    $users[] = [

        "user_id" =>
            (int)$row["user_id"],

        "name" =>
            $fullName,

        "email" =>
            $row["email"],

        "is_vendor" =>
            (int)$row["is_vendor"]

    ];

}


echo json_encode(
    $users
);


$stmt->close();
$conn->close();

?>