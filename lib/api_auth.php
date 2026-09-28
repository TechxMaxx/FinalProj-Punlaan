<?php

/*
|--------------------------------------------------------------------------
| MOBILE APP SIGN-IN TOKENS (api_tokens table)
|--------------------------------------------------------------------------
|
| The app signs in once and gets a random token. It sends it with every
| request as "Authorization: Bearer <token>". Only a SHA-256 hash is
| stored, so a leaked database can't be used to sign in.
|
|   kind "login"  → signed in, lasts API_TOKEN_DAYS (renewed while used)
|   kind "verify" → waiting for the 6-digit email code, lasts 30 minutes
|
| Signing out, a new password or a blocked account ends the token.
|
*/

const API_TOKEN_DAYS = 90;
const API_VERIFY_MINUTES = 30;


/* The token the app sent (Authorization: Bearer … or X-Auth-Token) */
function apiRequestToken(): string
{
    $header = $_SERVER["HTTP_AUTHORIZATION"]
        ?? $_SERVER["REDIRECT_HTTP_AUTHORIZATION"]
        ?? "";

    if ($header === "" && function_exists("apache_request_headers")) {
        foreach (apache_request_headers() as $name => $value) {
            if (strcasecmp($name, "Authorization") === 0) $header = $value;
        }
    }

    if (preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($header), $m)) {
        return strtolower($m[1]);
    }

    $alt = strtolower(trim($_SERVER["HTTP_X_AUTH_TOKEN"] ?? ""));
    return preg_match('/^[a-f0-9]{64}$/', $alt) ? $alt : "";
}


function apiIssueToken(mysqli $conn, int $userId, string $kind = "login", ?string $device = null): string
{
    $token = bin2hex(random_bytes(32));
    $hash = hash("sha256", $token);
    $device = $device !== null ? mb_substr(trim($device), 0, 100) : null;
    $expires = $kind === "login"
        ? date("Y-m-d H:i:s", time() + API_TOKEN_DAYS * 86400)
        : date("Y-m-d H:i:s", time() + API_VERIFY_MINUTES * 60);

    $stmt = $conn->prepare("DELETE FROM api_tokens WHERE user_id = ? AND expires_at < NOW()");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare("
        INSERT INTO api_tokens (user_id, token_hash, kind, device, expires_at, last_used_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmt->bind_param("issss", $userId, $hash, $kind, $device, $expires);
    $stmt->execute();
    $stmt->close();

    return $token;
}


/* Token row + its user, or null when unknown / expired */
function apiFindToken(mysqli $conn, string $token, string $kind = "login"): ?array
{
    if ($token === "") return null;

    $hash = hash("sha256", $token);

    $stmt = $conn->prepare("
        SELECT t.token_id, t.last_used_at,
               u.user_id, u.first_name, u.last_name, u.email, u.store_name,
               u.is_vendor, u.verification_status, u.account_status, u.email_verified
        FROM api_tokens t
        INNER JOIN users u ON u.user_id = t.user_id
        WHERE t.token_hash = ? AND t.kind = ? AND t.expires_at > NOW()
        LIMIT 1
    ");
    $stmt->bind_param("ss", $hash, $kind);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ?: null;
}


/*
 * The signed-in user for this token, or null. Same rules as the
 * website's "Keep me signed in": active, verified email, and sellers
 * under review / rejected can't use their account yet.
 */
function apiTokenUser(mysqli $conn, string $token): ?array
{
    $row = apiFindToken($conn, $token, "login");

    $valid = $row
        && (int)$row["account_status"] === 0
        && (int)$row["email_verified"] === 1
        && !((int)$row["is_vendor"] === 1 && in_array((int)$row["verification_status"], [1, 3], true));

    if (!$valid) {
        if ($row) apiRevokeToken($conn, $token);
        return null;
    }

    // Renew at most once an hour (keeps writes low)
    if (!$row["last_used_at"] || strtotime($row["last_used_at"]) < time() - 3600) {
        $expires = date("Y-m-d H:i:s", time() + API_TOKEN_DAYS * 86400);
        $stmt = $conn->prepare("UPDATE api_tokens SET last_used_at = NOW(), expires_at = ? WHERE token_id = ?");
        $stmt->bind_param("si", $expires, $row["token_id"]);
        $stmt->execute();
        $stmt->close();
    }

    return $row;
}


function apiRevokeToken(mysqli $conn, string $token): void
{
    $hash = hash("sha256", $token);
    $stmt = $conn->prepare("DELETE FROM api_tokens WHERE token_hash = ?");
    $stmt->bind_param("s", $hash);
    $stmt->execute();
    $stmt->close();
}


/* Sign the user out on every phone (new password, blocked account) */
function apiRevokeAllTokens(mysqli $conn, int $userId): void
{
    $stmt = $conn->prepare("DELETE FROM api_tokens WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
}


/* The account as the app shows it */
function apiUserJson(mysqli $conn, int $userId): ?array
{
    $stmt = $conn->prepare("
        SELECT user_id, first_name, last_name, store_name, email, phone, address,
               bio, profile_picture, is_vendor, verification_status, account_status
        FROM users
        WHERE user_id = ?
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) return null;

    foreach (["user_id", "is_vendor", "verification_status", "account_status"] as $key) {
        $user[$key] = (int)$user[$key];
    }

    return $user;
}
