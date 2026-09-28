<?php

/*
|--------------------------------------------------------------------------
| GOOGLE CLIENT ID FOR THE LOGIN / REGISTER PAGES
|--------------------------------------------------------------------------
|
| The client ID is public, so google-signin.js fetches it from here.
| The ID itself is set in google_config.php.
|
*/

require_once __DIR__ . "/google_config.php";

header("Content-Type: application/json");
header("Cache-Control: no-store");

$configured = GOOGLE_CLIENT_ID !== "" && strpos(GOOGLE_CLIENT_ID, "YOUR_CLIENT_ID") === false;

echo json_encode([
    "client_id" => $configured ? GOOGLE_CLIENT_ID : null
]);
