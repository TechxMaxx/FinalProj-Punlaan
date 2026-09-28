<?php

/*
|--------------------------------------------------------------------------
| FACEBOOK LOGIN CONFIG
|--------------------------------------------------------------------------
|
| From Meta for Developers (developers.facebook.com → My Apps → your app):
|   App settings → Basic → App ID / App secret
|
| The App secret must stay private — it is only used here on the server.
|
*/

define("FACEBOOK_APP_ID", "YOUR_APP_ID");
define("FACEBOOK_APP_SECRET", "YOUR_APP_SECRET");

// Graph API version (Meta retires old versions ~2 years after release)
define("FACEBOOK_GRAPH_VERSION", "v23.0");


/*
|--------------------------------------------------------------------------
| EXPOSE APP ID TO THE LOGIN / REGISTER PAGES
|--------------------------------------------------------------------------
|
| Only the public App ID and version are sent — never the secret.
| Only responds when this file is requested directly (not when included).
|
*/

if (realpath($_SERVER["SCRIPT_FILENAME"]) === __FILE__) {

    header("Content-Type: application/json");

    $configured = FACEBOOK_APP_ID !== "YOUR_APP_ID";

    echo json_encode([
        "app_id" => $configured ? FACEBOOK_APP_ID : null,
        "version" => FACEBOOK_GRAPH_VERSION
    ]);

    exit;
}
