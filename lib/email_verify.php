<?php

/*
|--------------------------------------------------------------------------
| EMAIL VERIFICATION CODE (6 digits)
|--------------------------------------------------------------------------
|
| New email sign-ups (and a changed email in Profile) must prove the
| address is theirs: a 6-digit code is emailed and typed on
| register/VerifyEmail.html.
|
|   verificationNeeded()                  false when Gmail isn't set up
|   sendVerificationCode($conn, $userId)  ["sent" => bool, "wait" => seconds, "message"]
|   checkVerificationCode($conn, $userId, $code)
|                                         ["ok" => bool, "message"]
|
| Rules: the code expires after 10 minutes, 5 wrong tries cancel it,
| "Resend" works after 60 seconds, at most 6 codes per hour.
| Codes are stored hashed (like passwords), never in plain text.
|
| The person waiting to verify is kept in $_SESSION["verify_user_id"].
|
*/

require_once __DIR__ . "/notify.php";

const VERIFY_CODE_MINUTES = 10;
const VERIFY_RESEND_SECONDS = 60;
const VERIFY_MAX_ATTEMPTS = 5;
const VERIFY_MAX_CODES_PER_HOUR = 6;


/* Without email set up nobody could receive a code → skip verification */
function verificationNeeded(): bool
{
    return mailIsConfigured();
}

function verificationHash(int $userId, string $code): string
{
    return hash("sha256", $userId . "|" . $code);
}

function maskEmail(string $email): string
{
    [$name, $domain] = array_pad(explode("@", $email, 2), 2, "");
    $visible = mb_substr($name, 0, min(2, max(1, mb_strlen($name) - 1)));
    return $visible . str_repeat("*", min(5, max(3, mb_strlen($name) - mb_strlen($visible)))) . "@" . $domain;
}

/* Seconds until "Resend" is allowed again (0 = now) */
function verificationWait(mysqli $conn, int $userId): int
{
    $stmt = $conn->prepare("
        SELECT GREATEST(0, ? - TIMESTAMPDIFF(SECOND, MAX(created_at), NOW()))
        FROM email_codes WHERE user_id = ?
    ");
    $seconds = VERIFY_RESEND_SECONDS;
    $stmt->bind_param("ii", $seconds, $userId);
    $stmt->execute();
    $wait = $stmt->get_result()->fetch_row()[0];
    $stmt->close();

    return $wait === null ? 0 : (int)$wait;
}


function sendVerificationCode(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare("SELECT email, first_name FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        return ["sent" => false, "wait" => 0, "message" => "Account not found."];
    }

    $wait = verificationWait($conn, $userId);
    if ($wait > 0) {
        return ["sent" => false, "wait" => $wait, "message" => "Please wait $wait seconds before asking for a new code."];
    }

    $stmt = $conn->prepare("SELECT COUNT(*) FROM email_codes WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 HOUR");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $recent = (int)$stmt->get_result()->fetch_row()[0];
    $stmt->close();

    if ($recent >= VERIFY_MAX_CODES_PER_HOUR) {
        return ["sent" => false, "wait" => 0, "message" => "Too many codes were sent. Please try again in an hour."];
    }

    // Only the newest code works
    $stmt = $conn->prepare("UPDATE email_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();

    $code = str_pad((string)random_int(0, 999999), 6, "0", STR_PAD_LEFT);
    $hash = verificationHash($userId, $code);
    $minutes = VERIFY_CODE_MINUTES;

    $stmt = $conn->prepare("
        INSERT INTO email_codes (user_id, email, code_hash, expires_at)
        VALUES (?, ?, ?, NOW() + INTERVAL ? MINUTE)
    ");
    $stmt->bind_param("issi", $userId, $user["email"], $hash, $minutes);
    $stmt->execute();
    $stmt->close();

    $name = $user["first_name"] ?: "there";
    $intro = "Use this code to verify your email on Punlaan:\n\n$code\n\n"
        . "It expires in $minutes minutes. If you didn't sign up, you can ignore this email.";

    try {
        sendMail(
            $user["email"],
            $name,
            "$code is your Punlaan verification code",
            verificationEmailHtml($name, $code, $minutes),
            emailText($name, "Verify your email", $intro, [], null)
        );
    } catch (Throwable $e) {
        error_log("Punlaan verification email failed: " . $e->getMessage());
        return ["sent" => false, "wait" => 0, "message" => "We couldn't send the email right now. Please try again in a minute."];
    }

    return ["sent" => true, "wait" => VERIFY_RESEND_SECONDS, "message" => "We sent a new code to " . maskEmail($user["email"]) . "."];
}


function checkVerificationCode(mysqli $conn, int $userId, string $code): array
{
    $code = preg_replace('/\D/', '', $code);

    if (strlen($code) !== 6) {
        return ["ok" => false, "message" => "Enter the 6-digit code from the email."];
    }

    $stmt = $conn->prepare("
        SELECT code_id, code_hash, attempts, expires_at > NOW() AS still_valid
        FROM email_codes
        WHERE user_id = ? AND used_at IS NULL
        ORDER BY code_id DESC LIMIT 1
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || !(int)$row["still_valid"]) {
        return ["ok" => false, "message" => "This code has expired. Tap \"Resend code\" to get a new one."];
    }

    if ((int)$row["attempts"] >= VERIFY_MAX_ATTEMPTS) {
        return ["ok" => false, "message" => "Too many wrong tries. Tap \"Resend code\" to get a new one."];
    }

    if (!hash_equals($row["code_hash"], verificationHash($userId, $code))) {
        $stmt = $conn->prepare("UPDATE email_codes SET attempts = attempts + 1 WHERE code_id = ?");
        $stmt->bind_param("i", $row["code_id"]);
        $stmt->execute();
        $stmt->close();

        $left = VERIFY_MAX_ATTEMPTS - (int)$row["attempts"] - 1;
        return ["ok" => false, "message" => $left > 0
            ? "That code isn't right. $left " . ($left === 1 ? "try" : "tries") . " left."
            : "Too many wrong tries. Tap \"Resend code\" to get a new one."];
    }

    $stmt = $conn->prepare("UPDATE email_codes SET used_at = NOW() WHERE code_id = ?");
    $stmt->bind_param("i", $row["code_id"]);
    $stmt->execute();
    $stmt->close();

    markEmailVerified($conn, $userId);

    return ["ok" => true, "message" => "Email verified."];
}

function markEmailVerified(mysqli $conn, int $userId): void
{
    $stmt = $conn->prepare("UPDATE users SET email_verified = 1 WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
}


function verificationEmailHtml(string $name, string $code, int $minutes): string
{
    $e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, "UTF-8");

    return "<!doctype html><html><body style='margin:0;background:#f3f6f3;font-family:Arial,Helvetica,sans-serif'>"
        . "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background:#f3f6f3;padding:24px 12px'><tr><td align='center'>"
        . "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden'>"
        . "<tr><td style='background:#28512F;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:700'>🌿 Punlaan</td></tr>"
        . "<tr><td style='padding:26px 24px 8px'>"
        . "<p style='margin:0 0 6px;color:#6b7c72;font-size:14px'>Hi {$e($name)},</p>"
        . "<h1 style='margin:0 0 12px;font-size:21px;color:#1a1a1a'>Verify your email</h1>"
        . "<p style='margin:0;font-size:15px;line-height:1.55;color:#333'>Enter this code on Punlaan to finish setting up your account:</p>"
        . "<p style='margin:22px 0;text-align:center'><span style='display:inline-block;background:#f0f7f1;border:1px solid #cfe5d4;"
        . "border-radius:12px;padding:14px 22px;font-size:32px;font-weight:700;letter-spacing:10px;color:#1b4332'>{$e($code)}</span></p>"
        . "<p style='margin:0;font-size:14px;color:#555'>The code expires in $minutes minutes.</p>"
        . "</td></tr>"
        . "<tr><td style='padding:18px 24px 24px;color:#8a9a90;font-size:12px;line-height:1.5'>"
        . "If you didn't create a Punlaan account, you can ignore this email — nothing will happen."
        . "</td></tr></table></td></tr></table></body></html>";
}
