<?php

/*
|--------------------------------------------------------------------------
| APP SIGN-IN (included by api/index.php)
|--------------------------------------------------------------------------
|
| POST auth/login     {email, password, device?}
|        → {success, token, user}
|        → {success: false, verify: true, ticket, email}   email not verified yet
| POST auth/register  {first_name, last_name, email, password, device?}
|        → {success, verify: true, ticket, email}  (or token + user when
|          email sending isn't set up on the server)
| POST auth/verify    {ticket, code}  → {success, token, user}
| POST auth/resend    {ticket}        → {success, message, resend_in}
| POST auth/google    {id_token}      → {success, token, user}  (signs in or creates)
| GET  auth/me        (token)         → {success, user}
| POST auth/logout    (token)         → {success}
|
| Same rules as the website (lib/account_rules.php, lib/email_verify.php).
|
*/

require_once __DIR__ . "/../lib/account_rules.php";

$in = $_POST;
$device = isset($in["device"]) ? (string)$in["device"] : null;


/* Signed in: new token + the account */
function apiSignedIn(mysqli $conn, int $userId, ?string $device): void
{
    $token = apiIssueToken($conn, $userId, "login", $device);

    $stmt = $conn->prepare("UPDATE users SET last_login = NOW() WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();

    apiRespond(200, [
        "success" => true,
        "token" => $token,
        "user" => apiUserJson($conn, $userId)
    ]);
}

/* Email not verified yet: a short-lived ticket for auth/verify */
function apiNeedsVerify(mysqli $conn, int $userId, ?string $device, string $message): void
{
    $stmt = $conn->prepare("SELECT email FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $email = (string)$stmt->get_result()->fetch_row()[0];
    $stmt->close();

    apiRespond(200, [
        "success" => false,
        "verify" => true,
        "ticket" => apiIssueToken($conn, $userId, "verify", $device),
        "email" => maskEmail($email),
        "resend_in" => verificationWait($conn, $userId),
        "message" => $message
    ]);
}

function apiTicketUser(mysqli $conn, array $in): array
{
    $ticket = strtolower(trim((string)($in["ticket"] ?? "")));
    $row = preg_match('/^[a-f0-9]{64}$/', $ticket) ? apiFindToken($conn, $ticket, "verify") : null;

    if (!$row || (int)$row["account_status"] !== 0) {
        apiRespond(200, [
            "success" => false,
            "expired" => true,
            "message" => "This verification has expired. Please sign in again."
        ]);
    }

    return [$ticket, $row];
}


if ($_SERVER["REQUEST_METHOD"] !== "POST" && $route !== "auth/me") {
    apiRespond(405, ["success" => false, "message" => "Use POST."]);
}


switch ($route) {

    case "auth/login":

        $check = loginCheck($conn, trim((string)($in["email"] ?? "")), (string)($in["password"] ?? ""));

        if (!$check["ok"]) {
            apiRespond(200, $check["error"]);
        }

        $userId = (int)$check["user"]["user_id"];

        if ($check["needs_verify"]) {
            // Reuses the last code when one was sent less than a minute ago
            sendVerificationCode($conn, $userId);
            apiNeedsVerify($conn, $userId, $device, "Please verify your email first — we sent a 6-digit code.");
        }

        apiSignedIn($conn, $userId, $device);


    case "auth/register":

        $created = createAccount(
            $conn,
            trim((string)($in["first_name"] ?? "")),
            trim((string)($in["last_name"] ?? "")),
            trim((string)($in["email"] ?? "")),
            (string)($in["password"] ?? "")
        );

        if (!$created["ok"]) {
            apiRespond(200, $created["error"]);
        }

        if (!$created["needs_verify"]) {
            apiSignedIn($conn, $created["user_id"], $device);
        }

        $sent = sendVerificationCode($conn, $created["user_id"]);

        apiNeedsVerify($conn, $created["user_id"], $device, $sent["sent"]
            ? "Account created! Check your email for a 6-digit code."
            : "Account created. " . $sent["message"]);


    case "auth/verify":

        [$ticket, $row] = apiTicketUser($conn, $in);

        $result = checkVerificationCode($conn, (int)$row["user_id"], (string)($in["code"] ?? ""));

        if (!$result["ok"]) {
            apiRespond(200, ["success" => false, "message" => $result["message"]]);
        }

        apiRevokeToken($conn, $ticket);
        apiSignedIn($conn, (int)$row["user_id"], $device);


    case "auth/resend":

        [, $row] = apiTicketUser($conn, $in);

        $result = sendVerificationCode($conn, (int)$row["user_id"]);

        apiRespond(200, [
            "success" => $result["sent"],
            "message" => $result["message"],
            "resend_in" => $result["wait"]
        ]);


    case "auth/google":

        // The app signs in with Google on the phone and sends the ID token.
        // It must be issued for our Web client ID (google_config.php).
        require_once __DIR__ . "/../third_party/google/google_config.php";
        require_once __DIR__ . "/../lib/social_accounts.php";

        $idToken = (string)($in["id_token"] ?? "");
        $info = null;

        if ($idToken !== "") {
            $ch = curl_init("https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($idToken));
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
            $raw = curl_exec($ch);
            $ok = curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
            curl_close($ch);
            $info = $ok ? json_decode($raw, true) : null;
        }

        if (
            !is_array($info) ||
            ($info["aud"] ?? "") !== GOOGLE_CLIENT_ID ||
            !in_array($info["iss"] ?? "", ["accounts.google.com", "https://accounts.google.com"], true) ||
            (int)($info["exp"] ?? 0) < time() ||
            ($info["email_verified"] ?? "") !== "true" ||
            empty($info["sub"]) || empty($info["email"])
        ) {
            apiRespond(200, ["success" => false, "message" => "Google sign-in could not be verified."]);
        }

        $result = socialResolveUser(
            $conn, "google_id", "Google", $info["sub"], $info["email"],
            trim($info["given_name"] ?? ""), trim($info["family_name"] ?? ""), "any"
        );

        if (!$result["ok"]) {
            apiRespond(200, $result["error"]);
        }

        apiSignedIn($conn, (int)$result["user"]["user_id"], $device);


    case "auth/me":

        $user = apiTokenUser($conn, apiRequestToken());

        if (!$user) {
            apiRespond(401, ["success" => false, "logged_in" => false, "message" => "Please sign in again."]);
        }

        apiRespond(200, ["success" => true, "logged_in" => true, "user" => apiUserJson($conn, (int)$user["user_id"])]);


    case "auth/logout":

        $token = apiRequestToken();

        if ($token !== "") {
            // Also forget this phone's checkout state
            ini_set("session.use_cookies", "0");
            session_id("app" . substr(hash("sha256", "session|" . $token), 0, 40));
            session_start();
            session_destroy();

            apiRevokeToken($conn, $token);
        }

        apiRespond(200, ["success" => true, "message" => "Signed out."]);
}
