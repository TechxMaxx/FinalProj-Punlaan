<?php

require_once __DIR__ . "/../social_auth.php";
require_once __DIR__ . "/google_config.php";


/*
|--------------------------------------------------------------------------
| READ GOOGLE ACCESS TOKEN
|--------------------------------------------------------------------------
|
| "access_token" comes from the Google popup (google-signin.js).
|
*/

$accessToken = $_POST["access_token"] ?? "";

if ($accessToken === "") {

    socialRespond([
        "success" => false,
        "message" => "Missing Google token."
    ]);
}


/*
|--------------------------------------------------------------------------
| VERIFY TOKEN WITH GOOGLE
|--------------------------------------------------------------------------
|
| tokeninfo confirms the token was issued to OUR app (aud) and is still
| valid; userinfo then gives us the user's name.
|
*/

$token = socialHttpGet(
    "https://oauth2.googleapis.com/tokeninfo?access_token=" . urlencode($accessToken)
);

if (
    !is_array($token) ||
    ($token["aud"] ?? "") !== GOOGLE_CLIENT_ID ||
    (int)($token["expires_in"] ?? 0) <= 0 ||
    ($token["email_verified"] ?? "") !== "true" ||
    empty($token["sub"]) ||
    empty($token["email"])
) {

    socialRespond([
        "success" => false,
        "message" => "Google sign-in could not be verified."
    ]);
}

$profile = socialHttpGet(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    ["Authorization: Bearer " . $accessToken]
) ?? [];

$firstName = trim($profile["given_name"] ?? "") ?: trim($profile["name"] ?? "");


/*
|--------------------------------------------------------------------------
| LOG IN / REGISTER
|--------------------------------------------------------------------------
*/

socialAuthComplete(
    "google_id",
    "Google",
    $token["sub"],
    $token["email"],
    $firstName,
    trim($profile["family_name"] ?? "")
);
