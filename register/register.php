<?php

require_once __DIR__ . "/../lib/session_boot.php";

header("Content-Type: application/json");

require_once __DIR__ . "/../FrontEnd/connection.php";
require_once __DIR__ . "/../lib/account_rules.php";   // same rules as the mobile app

$created = createAccount(
    $conn,
    trim((string)($_POST["first_name"] ?? "")),
    trim((string)($_POST["last_name"] ?? "")),
    trim((string)($_POST["email"] ?? "")),
    (string)($_POST["password"] ?? "")
);

if (!$created["ok"]) {
    echo json_encode($created["error"]);
    $conn->close();
    exit;
}

if ($created["needs_verify"]) {

    $_SESSION["verify_user_id"] = $created["user_id"];
    $_SESSION["verify_remember"] = false;
    $sent = sendVerificationCode($conn, $created["user_id"]);

    echo json_encode([
        "success" => true,
        "verify" => true,
        "message" => $sent["sent"]
            ? "Account created! Check your email for a 6-digit code."
            : "Account created. " . $sent["message"]
    ]);
    $conn->close();
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "Account created successfully."
]);

$conn->close();
