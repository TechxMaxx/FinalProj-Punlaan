<?php

require_once __DIR__ . "/../social_auth.php";
require_once __DIR__ . "/facebook_config.php";


/*
|--------------------------------------------------------------------------
| READ FACEBOOK ACCESS TOKEN
|--------------------------------------------------------------------------
|
| "access_token" comes from the Facebook popup (facebook-signin.js).
|
*/

$accessToken = $_POST["access_token"] ?? "";

if ($accessToken === "") {

    socialRespond([
        "success" => false,
        "message" => "Missing Facebook token."
    ]);
}

$graph = "https://graph.facebook.com/" . FACEBOOK_GRAPH_VERSION;


/*
|--------------------------------------------------------------------------
| VERIFY TOKEN WITH FACEBOOK
|--------------------------------------------------------------------------
|
| debug_token (called with our app's credentials) confirms the token is
| valid and was issued to OUR app, and tells us which user it belongs to.
|
*/

$debug = socialHttpGet(
    "$graph/debug_token?" . http_build_query([
        "input_token" => $accessToken,
        "access_token" => FACEBOOK_APP_ID . "|" . FACEBOOK_APP_SECRET
    ])
);

$tokenData = $debug["data"] ?? [];

if (
    empty($tokenData["is_valid"]) ||
    (string)($tokenData["app_id"] ?? "") !== FACEBOOK_APP_ID ||
    empty($tokenData["user_id"])
) {

    socialRespond([
        "success" => false,
        "message" => "Facebook login could not be verified."
    ]);
}


/*
|--------------------------------------------------------------------------
| GET PROFILE
|--------------------------------------------------------------------------
|
| appsecret_proof proves the request comes from our server.
| "email" is missing if the user has no email on Facebook or declined it.
|
*/

$profile = socialHttpGet(
    "$graph/me?" . http_build_query([
        "fields" => "id,first_name,last_name,email",
        "access_token" => $accessToken,
        "appsecret_proof" => hash_hmac("sha256", $accessToken, FACEBOOK_APP_SECRET)
    ])
);

if (!is_array($profile) || ($profile["id"] ?? "") !== (string)$tokenData["user_id"]) {

    socialRespond([
        "success" => false,
        "message" => "Could not read your Facebook profile."
    ]);
}


/*
|--------------------------------------------------------------------------
| LOG IN / REGISTER
|--------------------------------------------------------------------------
*/

socialAuthComplete(
    "facebook_id",
    "Facebook",
    $profile["id"],
    $profile["email"] ?? null,
    trim($profile["first_name"] ?? ""),
    trim($profile["last_name"] ?? "")
);
