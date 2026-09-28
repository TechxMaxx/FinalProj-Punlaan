<?php

/*
|--------------------------------------------------------------------------
| IS THIS EMAIL REGISTERED?  (Login / Register pages, while typing)
|--------------------------------------------------------------------------
|
| POST email → {"success": true, "exists": bool}
|
| Login shows "No account found with this email. Create an account"
| before the password is even typed; Register shows "already has an
| account — sign in instead". Limited to 30 checks per 10 minutes per
| visitor so it can't be used to test long email lists.
|
*/

require_once __DIR__ . "/../lib/session_boot.php";

header("Content-Type: application/json");

$email = trim((string)($_POST["email"] ?? ""));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Enter a valid email address."]);
    exit;
}

// Simple limit per browser session
$now = time();
$_SESSION["email_checks"] = array_values(array_filter(
    $_SESSION["email_checks"] ?? [],
    fn($t) => $t > $now - 600
));

if (count($_SESSION["email_checks"]) >= 30) {
    echo json_encode(["success" => false, "message" => "Too many checks. Please wait a few minutes."]);
    exit;
}

$_SESSION["email_checks"][] = $now;

require_once __DIR__ . "/../FrontEnd/connection.php";

$stmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$exists = (int)$stmt->get_result()->fetch_row()[0] > 0;
$stmt->close();
$conn->close();

echo json_encode(["success" => true, "exists" => $exists]);
