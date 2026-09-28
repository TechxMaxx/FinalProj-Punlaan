<?php

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");
header("Cache-Control: no-store");

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "logged_in" => false
    ]);

    exit;
}

// Read the name and photo fresh, so profile edits show everywhere right away
require_once __DIR__ . "/../FrontEnd/connection.php";

$userId = (int)$_SESSION["user_id"];

$stmt = $conn->prepare("SELECT first_name, last_name, profile_picture, is_vendor FROM users WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

if (!$user) {
    echo json_encode([
        "success" => false,
        "logged_in" => false
    ]);
    exit;
}

$_SESSION["first_name"] = $user["first_name"];
$_SESSION["is_vendor"] = (int)$user["is_vendor"];

echo json_encode([
    "success" => true,
    "logged_in" => true,
    "user_id" => $userId,
    "first_name" => $user["first_name"],
    "last_name" => $user["last_name"],
    // Relative to the project root (uploads/…) or a full URL
    "profile_picture" => $user["profile_picture"],
    "is_vendor" => (int)$user["is_vendor"]
]);
