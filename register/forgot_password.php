<?php

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD — send a reset link
|--------------------------------------------------------------------------
|
| POST email=…
|
| Always answers with the same message, whether or not the email has
| an account, so this page can't be used to find out who is registered.
|
*/

header("Content-Type: application/json");

require_once __DIR__ . "/../FrontEnd/connection.php";
require_once __DIR__ . "/../third_party/mail/mailer.php";

const RESET_MINUTES = 30;
const MAX_REQUESTS_PER_15_MIN = 3;

$email = trim($_POST["email"] ?? "");

$genericMessage =
    "If an account uses that email, we've sent a link to reset your password. " .
    "Check your inbox (and Spam). The link expires in " . RESET_MINUTES . " minutes.";

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {

    echo json_encode([
        "success" => false,
        "message" => "Please enter a valid email address."
    ]);

    exit;
}


/* ---------- Find the account ---------- */

$stmt = $conn->prepare("
    SELECT user_id, first_name, last_name, email
    FROM users
    WHERE email = ? AND is_admin = 0
    LIMIT 1
");

$stmt->bind_param("s", $email);
$stmt->execute();

$user = $stmt->get_result()->fetch_assoc();

$stmt->close();

if (!$user) {
    // Same answer as success (don't reveal that the email isn't registered)
    echo json_encode(["success" => true, "message" => $genericMessage]);
    exit;
}

$userId = (int) $user["user_id"];


/* ---------- Rate limit ---------- */

$stmt = $conn->prepare("
    SELECT COUNT(*) AS n
    FROM password_resets
    WHERE user_id = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)
");

$stmt->bind_param("i", $userId);
$stmt->execute();

$recent = (int) $stmt->get_result()->fetch_assoc()["n"];

$stmt->close();

if ($recent >= MAX_REQUESTS_PER_15_MIN) {

    echo json_encode([
        "success" => false,
        "message" => "Too many reset requests. Please wait 15 minutes and try again."
    ]);

    exit;
}


/* ---------- Create the token (only its hash is stored) ---------- */

$token = bin2hex(random_bytes(32));
$tokenHash = hash("sha256", $token);

// Older links stop working once a new one is requested
$stmt = $conn->prepare("
    UPDATE password_resets
    SET used_at = NOW()
    WHERE user_id = ? AND used_at IS NULL
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare("
    INSERT INTO password_resets (user_id, token_hash, expires_at)
    VALUES (?, ?, NOW() + INTERVAL " . RESET_MINUTES . " MINUTE)
");
$stmt->bind_param("is", $userId, $tokenHash);
$stmt->execute();
$stmt->close();

$conn->close();

$link = rtrim(APP_URL, "/") . "/register/ResetPassword.html?token=" . $token;


/* ---------- Email ---------- */

$name = trim($user["first_name"] . " " . $user["last_name"]);
$safeName = htmlspecialchars($user["first_name"] ?: "there", ENT_QUOTES, "UTF-8");
$safeLink = htmlspecialchars($link, ENT_QUOTES, "UTF-8");
$minutes = RESET_MINUTES;

$html = <<<HTML
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a3c2e">
  <h2 style="color:#2d6a4f;margin-bottom:4px">Reset your Punlaan password</h2>
  <p>Hi {$safeName},</p>
  <p>We received a request to reset your password. Click the button below to choose a new one.
     This link expires in {$minutes} minutes and can only be used once.</p>
  <p style="text-align:center;margin:28px 0">
    <a href="{$safeLink}" style="background:#2d6a4f;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:bold">Reset password</a>
  </p>
  <p style="font-size:13px;color:#4a7060">If the button doesn't work, copy this link into your browser:<br>
     <a href="{$safeLink}" style="color:#2d6a4f;word-break:break-all">{$safeLink}</a></p>
  <p style="font-size:13px;color:#4a7060">Didn't ask for this? You can ignore this email — your password won't change.</p>
</div>
HTML;

$text = "Hi " . ($user["first_name"] ?: "there") . ",\n\n" .
    "Reset your Punlaan password here (expires in " . RESET_MINUTES . " minutes):\n" .
    $link . "\n\n" .
    "Didn't ask for this? Ignore this email and your password won't change.";

$response = ["success" => true, "message" => $genericMessage];

try {

    sendMail($user["email"], $name, "Reset your Punlaan password", $html, $text);

} catch (RuntimeException $e) {

    error_log("Punlaan forgot_password: " . $e->getMessage());

    /*
     * Local testing only: when email isn't set up yet and the site runs on
     * localhost, show the link on the page so the flow can still be tested.
     */
    $isLocal = in_array($_SERVER["REMOTE_ADDR"] ?? "", ["127.0.0.1", "::1"], true);

    if (!mailIsConfigured() && $isLocal) {
        $response["dev_reset_link"] = $link;
        $response["dev_notice"] = "Email isn't set up yet (third_party/mail/mail_config.php), so here is the link for testing on this computer:";
    } else {
        $response = [
            "success" => false,
            "message" => "We couldn't send the email right now. Please try again later."
        ];
    }
}

echo json_encode($response);
