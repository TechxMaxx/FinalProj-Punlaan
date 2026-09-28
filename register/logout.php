<?php

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

header('Content-Type: application/json');

// Also forget "Keep me signed in" on this browser
forgetRememberedUser();

$_SESSION = [];

if (
    ini_get("session.use_cookies")
) {

    $params =
        session_get_cookie_params();

    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );

}

session_destroy();

echo json_encode([
    "success" => true,
    "message" => "Logged out successfully."
]);

exit;

?>