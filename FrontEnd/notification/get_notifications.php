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
        "message" => "Please log in first.",
        "notifications" => []
    ]);
}

$connectionFile = __DIR__ . "/../connection.php";

if (!file_exists($connectionFile)) {
    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "connection.php not found.",
        "notifications" => []
    ]);
}

require_once $connectionFile;

if (!isset($conn) || !($conn instanceof mysqli)) {
    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "Database connection failed.",
        "notifications" => []
    ]);
}

$userId = (int)$_SESSION["user_id"];

$sql = "
    SELECT
        n.notification_id,
        n.title,
        n.message,
        n.audience,
        n.priority,
        n.kind,
        n.link,
        n.created_at,
        nr.is_read,
        nr.read_at,
        nr.is_dismissed,
        nr.dismissed_at
    FROM notification_recipients nr
    INNER JOIN notifications n
        ON nr.notification_id = n.notification_id
    WHERE nr.user_id = ?
      AND nr.is_dismissed = 0
    ORDER BY n.created_at DESC
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    respond([
        "success" => false,
        "logged_in" => true,
        "message" => "SQL prepare failed: " . $conn->error,
        "notifications" => []
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
        "message" => "SQL execute failed: " . $error,
        "notifications" => []
    ]);
}

$result = $stmt->get_result();
$notifications = [];

while ($row = $result->fetch_assoc()) {
    $row["notification_id"] = (int)$row["notification_id"];
    $row["is_read"] = (int)$row["is_read"];
    $row["is_dismissed"] = (int)$row["is_dismissed"];
    $notifications[] = $row;
}

$stmt->close();
$conn->close();

respond([
    "success" => true,
    "logged_in" => true,
    "count" => count($notifications),
    "notifications" => $notifications
]);
?>