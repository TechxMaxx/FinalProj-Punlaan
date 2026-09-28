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

$data = json_decode(file_get_contents("php://input"), true);
$notificationId = isset($data["notification_id"]) ? (int)$data["notification_id"] : 0;
$userId = (int)$_SESSION["user_id"];

if ($notificationId <= 0) {
    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "Invalid notification ID."
    ]);
}

$sql = "
    UPDATE notification_recipients
    SET
        is_dismissed = 1,
        dismissed_at = NOW()
    WHERE notification_id = ?
      AND user_id = ?
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "SQL prepare failed: " . $conn->error
    ]);
}

$stmt->bind_param("ii", $notificationId, $userId);

if (!$stmt->execute()) {
    $error = $stmt->error;
    $stmt->close();
    $conn->close();

    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "Failed to dismiss notification: " . $error
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