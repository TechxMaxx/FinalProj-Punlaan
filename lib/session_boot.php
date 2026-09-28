<?php

/*
|--------------------------------------------------------------------------
| SESSION + "KEEP ME SIGNED IN"
|--------------------------------------------------------------------------
|
| Every customer/seller PHP file starts with:
|
|   require_once __DIR__ . "/../lib/session_boot.php";   (path varies)
|
| instead of session_start(). It starts the session and, when the
| session has expired but the browser still has the "Keep me signed in"
| cookie, signs the user back in.
|
| The cookie holds "selector:validator". Only a SHA-256 hash of the
| validator is stored (remember_tokens table), so a leaked database
| can't be used to log in. Tokens last 30 days.
|
*/

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

const REMEMBER_COOKIE = "punlaan_remember";
const REMEMBER_DAYS = 30;


function rememberIsHttps(): bool
{
    return (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off")
        || strtolower($_SERVER["HTTP_X_FORWARDED_PROTO"] ?? "") === "https";
}

function rememberSetCookie(string $value, int $expires): void
{
    setcookie(REMEMBER_COOKIE, $value, [
        "expires" => $expires,
        "path" => "/",
        "secure" => rememberIsHttps(),
        "httponly" => true,
        "samesite" => "Lax"
    ]);
}

// Own small connection: this file runs before the page's connection.php
function rememberDb(): ?mysqli
{
    require_once __DIR__ . "/../app_config.php";

    try {
        $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    } catch (Throwable $e) {
        return null;
    }

    if ($db->connect_error) {
        return null;
    }

    $db->set_charset("utf8mb4");
    return $db;
}


/* Called after a successful login when "Keep me signed in" is ticked */
function rememberUser(mysqli $conn, int $userId): void
{
    $selector = bin2hex(random_bytes(12));
    $validator = bin2hex(random_bytes(32));
    $hash = hash("sha256", $validator);
    $expires = time() + REMEMBER_DAYS * 86400;
    $expiresAt = date("Y-m-d H:i:s", $expires);

    try {
        // Old tokens of this user that have run out
        $stmt = $conn->prepare("DELETE FROM remember_tokens WHERE user_id = ? AND expires_at < NOW()");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("INSERT INTO remember_tokens (user_id, selector, token_hash, expires_at) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $userId, $selector, $hash, $expiresAt);
        $stmt->execute();
        $stmt->close();
    } catch (Throwable $e) {
        error_log("Punlaan remember-me: " . $e->getMessage());
        return;
    }

    rememberSetCookie($selector . ":" . $validator, $expires);
}


/* Called on logout: removes this browser's token */
function forgetRememberedUser(?mysqli $conn = null): void
{
    $cookie = $_COOKIE[REMEMBER_COOKIE] ?? "";

    if ($cookie !== "") {
        $selector = explode(":", $cookie, 2)[0];
        $db = $conn ?: rememberDb();

        if ($db) {
            try {
                $stmt = $db->prepare("DELETE FROM remember_tokens WHERE selector = ?");
                $stmt->bind_param("s", $selector);
                $stmt->execute();
                $stmt->close();
            } catch (Throwable $e) {
                // table missing — nothing to remove
            }
            if (!$conn) $db->close();
        }
    }

    rememberSetCookie("", time() - 3600);
    unset($_COOKIE[REMEMBER_COOKIE]);
}


/* Session expired but the cookie is valid → sign the user back in */
function restoreRememberedUser(): void
{
    $parts = explode(":", (string)$_COOKIE[REMEMBER_COOKIE], 2);

    if (count($parts) !== 2 || !ctype_xdigit($parts[0]) || !ctype_xdigit($parts[1])) {
        rememberSetCookie("", time() - 3600);
        return;
    }

    [$selector, $validator] = $parts;

    $db = rememberDb();
    if (!$db) return;

    try {
        $stmt = $db->prepare("
            SELECT t.token_hash, u.user_id, u.first_name, u.last_name, u.email, u.store_name,
                   u.is_vendor, u.verification_status, u.account_status, u.email_verified
            FROM remember_tokens t
            INNER JOIN users u ON u.user_id = t.user_id
            WHERE t.selector = ? AND t.expires_at > NOW()
            LIMIT 1
        ");
        $stmt->bind_param("s", $selector);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    } catch (Throwable $e) {
        $db->close();
        return;
    }

    $valid = $row
        && hash_equals($row["token_hash"], hash("sha256", $validator))
        && (int)$row["account_status"] === 0
        && (int)$row["email_verified"] === 1
        // same rule as login.php: sellers under review / rejected can't sign in
        && !((int)$row["is_vendor"] === 1 && in_array((int)$row["verification_status"], [1, 3], true));

    if (!$valid) {
        forgetRememberedUser($db);
        $db->close();
        return;
    }

    session_regenerate_id(true);

    $_SESSION["user_id"] = (int)$row["user_id"];
    $_SESSION["first_name"] = $row["first_name"];
    $_SESSION["last_name"] = $row["last_name"];
    $_SESSION["email"] = $row["email"];
    $_SESSION["store_name"] = $row["store_name"];
    $_SESSION["is_vendor"] = (int)$row["is_vendor"];

    $db->close();
}


/*
 * Log a user in (password login, or right after verifying the email code).
 * $user needs: user_id, first_name, last_name, email, store_name, is_vendor
 */
function signInUser(mysqli $conn, array $user, bool $remember): void
{
    session_regenerate_id(true);

    $_SESSION["user_id"] = (int)$user["user_id"];
    $_SESSION["first_name"] = $user["first_name"];
    $_SESSION["last_name"] = $user["last_name"];
    $_SESSION["email"] = $user["email"];
    $_SESSION["store_name"] = $user["store_name"];
    $_SESSION["is_vendor"] = (int)$user["is_vendor"];
    unset($_SESSION["verify_user_id"], $_SESSION["verify_remember"]);

    // "Keep me signed in" → stay logged in for 30 days on this browser
    if ($remember) {
        rememberUser($conn, (int)$user["user_id"]);
    } else {
        forgetRememberedUser($conn);
    }

    $stmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE user_id = ?");
    if ($stmt) {
        $stmt->bind_param("i", $user["user_id"]);
        $stmt->execute();
        $stmt->close();
    }
}


if (empty($_SESSION["user_id"]) && !empty($_COOKIE[REMEMBER_COOKIE])) {
    restoreRememberedUser();
}
