<?php
require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"
header("Content-Type: application/json; charset=UTF-8");

function respond($data) {
    echo json_encode($data);
    exit;
}

if (!isset($_SESSION["user_id"])) {
    respond([
        "success" => false,
        "logged_in" => false,
        "message" => "Please log in first."
    ]);
}

$connectionFile = __DIR__ . "/../connection.php";

if (!file_exists($connectionFile)) {
    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "connection.php not found."
    ]);
}

require_once $connectionFile;

if (!isset($conn) || !($conn instanceof mysqli)) {
    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "Database connection failed."
    ]);
}

$userId = (int)$_SESSION["user_id"];

$sql = "
    UPDATE notification_recipients
    SET
        is_read = 1,
        read_at = NOW()
    WHERE user_id = ?
      AND is_read = 0
      AND is_dismissed = 0
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "SQL prepare failed: " . $conn->error
    ]);
}

$stmt->bind_param("i", $userId);

if (!$stmt->execute()) {
    $error = $stmt->error;
    $stmt->close();
    $conn->close();

    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "Failed to mark all notifications as read: " . $error
    ]);
}

$updated = $stmt->affected_rows;

$stmt->close();
$conn->close();

respond([
    "success" => true,
    "logged_in" => true,
    "updated" => $updated
]);
?>