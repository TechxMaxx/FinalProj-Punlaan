<?php

/*
|--------------------------------------------------------------------------
| RESET PASSWORD — check a reset link / save the new password
|--------------------------------------------------------------------------
|
| GET  ?token=…                                  → is the link still valid?
| POST token, new_password, confirm_password    → change the password
|
*/

header("Content-Type: application/json");

require_once __DIR__ . "/../FrontEnd/connection.php";


function findValidReset(mysqli $conn, string $token): ?array
{
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return null;
    }

    $hash = hash("sha256", $token);

    $stmt = $conn->prepare("
        SELECT r.reset_id, r.user_id, u.first_name, u.email
        FROM password_resets r
        INNER JOIN users u ON u.user_id = r.user_id
        WHERE r.token_hash = ?
          AND r.used_at IS NULL
          AND r.expires_at > NOW()
        LIMIT 1
    ");

    $stmt->bind_param("s", $hash);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();

    $stmt->close();

    return $row ?: null;
}

$invalidMessage = "This reset link is invalid or has expired. Please request a new one.";


/* ==========================================
   GET → CHECK LINK
========================================== */

if ($_SERVER["REQUEST_METHOD"] === "GET") {

    $reset = findValidReset($conn, (string)($_GET["token"] ?? ""));

    echo json_encode($reset
        ? [
            "success" => true,
            "first_name" => $reset["first_name"],
            // Show a hint like "j•••@gmail.com" so they know which account
            "email_hint" => preg_replace('/^(.).*(@.*)$/', '$1•••$2', $reset["email"])
          ]
        : ["success" => false, "message" => $invalidMessage]
    );

    exit;
}


/* ==========================================
   POST → SAVE NEW PASSWORD
========================================== */

$token = (string)($_POST["token"] ?? "");
$new = (string)($_POST["new_password"] ?? "");
$confirm = (string)($_POST["confirm_password"] ?? "");

if (strlen($new) < 8) {
    echo json_encode(["success" => false, "message" => "Password must be at least 8 characters."]);
    exit;
}

if ($new !== $confirm) {
    echo json_encode(["success" => false, "message" => "Passwords do not match."]);
    exit;
}

$reset = findValidReset($conn, $token);

if (!$reset) {
    echo json_encode(["success" => false, "message" => $invalidMessage]);
    exit;
}

$conn->begin_transaction();

try {

    $hash = password_hash($new, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("UPDATE users SET password = ?, email_verified = 1 WHERE user_id = ?");
    $stmt->bind_param("si", $hash, $reset["user_id"]);
    $stmt->execute();
    $stmt->close();

    // This link, and any other open link for the account, can't be used again
    $stmt = $conn->prepare("
        UPDATE password_resets
        SET used_at = NOW()
        WHERE user_id = ? AND used_at IS NULL
    ");
    $stmt->bind_param("i", $reset["user_id"]);
    $stmt->execute();
    $stmt->close();

    // Signed out of the mobile app on every phone
    $stmt = $conn->prepare("DELETE FROM api_tokens WHERE user_id = ?");
    $stmt->bind_param("i", $reset["user_id"]);
    $stmt->execute();
    $stmt->close();

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Your password has been changed. You can now log in."
    ]);

} catch (Throwable $e) {

    $conn->rollback();

    echo json_encode([
        "success" => false,
        "message" => "Could not change your password. Please try again."
    ]);
}
