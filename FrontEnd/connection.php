<?php
// Database connection — settings live in /app_config.php
// (local XAMPP vs. online hosting is chosen automatically)
require_once __DIR__ . "/../app_config.php";

// Create Connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Check Connection
if ($conn->connect_error) {
    // Don't reveal database details to visitors
    error_log("Punlaan database connection failed: " . $conn->connect_error);
    http_response_code(500);
    die(IS_LOCAL
        ? "Database connection failed: " . $conn->connect_error
        : "The website is temporarily unavailable. Please try again later.");
}

// Set Character Encoding
$conn->set_charset("utf8mb4");

// Philippine time for every date the database gives back or saves
// (online hosts often run MySQL in another timezone)
$conn->query("SET time_zone = '+08:00'");
?>