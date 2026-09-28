<?php

/*
| Numbers for the red badges in the header and dashboard:
|   notifications = unread notifications
|   messages      = unread chat messages
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");
header("Cache-Control: no-store");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "notifications" => 0, "messages" => 0]);
    exit;
}

require_once __DIR__ . "/../connection.php";

$userId = (int)$_SESSION["user_id"];

$stmt = $conn->prepare("SELECT COUNT(*) FROM notification_recipients WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0");
$stmt->bind_param("i", $userId);
$stmt->execute();
$notifications = (int)$stmt->get_result()->fetch_row()[0];
$stmt->close();

$messages = 0;

try {
    $stmt = $conn->prepare("
        SELECT COUNT(*)
        FROM messages m
        INNER JOIN conversations c ON c.conversation_id = m.conversation_id
        WHERE m.sender_id <> ?
          AND (
                (c.customer_id = ? AND m.message_id > c.customer_last_read_id)
             OR (c.vendor_id = ? AND m.message_id > c.vendor_last_read_id)
          )
    ");
    $stmt->bind_param("iii", $userId, $userId, $userId);
    $stmt->execute();
    $messages = (int)$stmt->get_result()->fetch_row()[0];
    $stmt->close();
} catch (Throwable $e) {
    // chat tables not created yet
}

$conn->close();

echo json_encode([
    "success" => true,
    "logged_in" => true,
    "notifications" => $notifications,
    "messages" => $messages
]);
