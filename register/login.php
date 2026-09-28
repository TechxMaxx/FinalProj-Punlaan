<?php

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

require_once __DIR__ . "/../FrontEnd/connection.php";
require_once __DIR__ . "/../lib/account_rules.php";   // same rules as the mobile app


$email = trim($_POST["email"] ?? "");
$password = $_POST["password"] ?? "";
$remember = ($_POST["remember"] ?? "") === "1";

$check = loginCheck($conn, $email, $password);

if (!$check["ok"]) {
    echo json_encode($check["error"]);
    $conn->close();
    exit;
}

$user = $check["user"];


/*
|--------------------------------------------------------------------------
| EMAIL NOT VERIFIED YET → send a code, continue on VerifyEmail.html
|--------------------------------------------------------------------------
*/

if ($check["needs_verify"]) {

    $_SESSION["verify_user_id"] = (int)$user["user_id"];
    $_SESSION["verify_remember"] = $remember;

    // Reuses the last code when one was sent less than a minute ago
    sendVerificationCode($conn, (int)$user["user_id"]);

    echo json_encode([
        "success" => false,
        "verify" => true,
        "message" => "Please verify your email first — we sent a 6-digit code."
    ]);
    $conn->close();
    exit;
}


/*
|--------------------------------------------------------------------------
| CREATE SESSION (+ "Keep me signed in", last login)
|--------------------------------------------------------------------------
*/

signInUser($conn, $user, $remember);

$conn->close();

echo json_encode([
    "success" => true,
    "message" => "Login successful.",
    "is_vendor" => (int)$user["is_vendor"]
]);

exit;
