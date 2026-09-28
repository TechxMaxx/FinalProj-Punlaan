<?php

/*
|--------------------------------------------------------------------------
| VERIFY EMAIL (register/VerifyEmail.html)
|--------------------------------------------------------------------------
|
| POST JSON { action: "status" | "verify" | "resend" | "cancel", code }
|
| Works for the account in $_SESSION["verify_user_id"], set by
| register.php, login.php (unverified account) or a changed email in
| Profile. A correct code verifies the email and signs the person in.
|
*/

require_once __DIR__ . "/../lib/session_boot.php";

header("Content-Type: application/json");

require_once __DIR__ . "/../FrontEnd/connection.php";
require_once __DIR__ . "/../lib/email_verify.php";

function done(array $data): void
{
    echo json_encode($data);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true) ?? [];
$action = (string)($input["action"] ?? "status");
$userId = (int)($_SESSION["verify_user_id"] ?? 0);

if ($action === "cancel") {
    unset($_SESSION["verify_user_id"], $_SESSION["verify_remember"]);
    done(["success" => true]);
}

if ($userId <= 0) {
    done(["success" => false, "pending" => false, "message" => "Nothing to verify. Please sign in again."]);
}

$stmt = $conn->prepare("
    SELECT user_id, first_name, last_name, email, store_name, is_vendor, email_verified, account_status
    FROM users WHERE user_id = ?
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user || (int)$user["account_status"] !== 0) {
    unset($_SESSION["verify_user_id"], $_SESSION["verify_remember"]);
    done(["success" => false, "pending" => false, "message" => "This account can't be verified. Please contact Punlaan."]);
}


if ($action === "status") {
    done([
        "success" => true,
        "pending" => (int)$user["email_verified"] !== 1,
        "email" => maskEmail($user["email"]),
        "resend_in" => verificationWait($conn, $userId),
    ]);
}


if ($action === "resend") {
    $result = sendVerificationCode($conn, $userId);
    done([
        "success" => $result["sent"],
        "message" => $result["message"],
        "resend_in" => $result["wait"],
    ]);
}


if ($action === "verify") {
    $result = checkVerificationCode($conn, $userId, (string)($input["code"] ?? ""));

    if (!$result["ok"]) {
        done(["success" => false, "message" => $result["message"]]);
    }

    signInUser($conn, $user, (bool)($_SESSION["verify_remember"] ?? false));

    done(["success" => true, "message" => "Email verified! Welcome to Punlaan."]);
}


done(["success" => false, "message" => "Unknown action."]);
