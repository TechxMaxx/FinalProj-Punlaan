<?php

/*
|--------------------------------------------------------------------------
| SHARED SOCIAL LOGIN (GOOGLE / FACEBOOK) — website
|--------------------------------------------------------------------------
|
| Each provider's *_auth.php verifies its token with the provider, then
| calls socialAuthComplete() to log in or register the Punlaan user.
| The account rules are in lib/social_accounts.php (shared with the app).
|
| POST fields read here:
|   mode        "login" (Login page) or "register" (Register page)
|   remember    "1" = keep me signed in
|
*/

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

require_once __DIR__ . "/../FrontEnd/connection.php";
require_once __DIR__ . "/../lib/social_accounts.php";


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function socialRespond($data)
{
    global $conn;

    echo json_encode($data);

    if ($conn) {
        $conn->close();
    }

    exit;
}

function socialHttpGet($url, $headers = [])
{
    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => $headers
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);

    if ($response === false || $httpCode !== 200) {
        return null;
    }

    return json_decode($response, true);
}


/*
|--------------------------------------------------------------------------
| LOG IN OR REGISTER A VERIFIED SOCIAL USER, THEN START THE SESSION
|--------------------------------------------------------------------------
|
| $column      users column holding the provider's user ID
|              ("google_id" or "facebook_id")
| $label       Provider name shown in messages ("Google" / "Facebook")
| $providerId  The user's ID at the provider (already verified)
| $email       Verified email, or null if the provider didn't give one
|
*/

function socialAuthComplete($column, $label, $providerId, $email, $firstName, $lastName)
{
    global $conn;

    $mode = ($_POST["mode"] ?? "") === "register" ? "register" : "login";

    $result = socialResolveUser($conn, $column, $label, (string)$providerId, $email, (string)$firstName, (string)$lastName, $mode);

    if (!$result["ok"]) {
        socialRespond($result["error"]);
    }

    $user = $result["user"];

    session_regenerate_id(true);

    $_SESSION["user_id"] = (int)$user["user_id"];
    $_SESSION["first_name"] = $user["first_name"];
    $_SESSION["last_name"] = $user["last_name"];
    $_SESSION["email"] = $user["email"];
    $_SESSION["store_name"] = $user["store_name"];
    $_SESSION["is_vendor"] = (int)$user["is_vendor"];

    // "Keep me signed in" (Login page checkbox; new accounts stay signed in)
    if (($_POST["remember"] ?? "") === "1" || $mode === "register") {
        rememberUser($conn, (int)$user["user_id"]);
    }

    socialRespond([
        "success" => true,
        "message" => $mode === "register" ? "Account created with $label." : "Signed in with $label.",
        "is_vendor" => (int)$user["is_vendor"]
    ]);
}
