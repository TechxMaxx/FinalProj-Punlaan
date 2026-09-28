<?php

/* Change the logged-in user's password (requires the current password) */

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User is not logged in.']);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";

$userId = (int) $_SESSION['user_id'];

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$current = (string)($data['current_password'] ?? '');
$new = (string)($data['new_password'] ?? '');
$confirm = (string)($data['confirm_password'] ?? '');


/* ---------- Validation ---------- */

if ($current === '' || $new === '') {
    echo json_encode(['success' => false, 'message' => 'Fill in your current and new password.']);
    exit;
}

if (strlen($new) < 8) {
    echo json_encode(['success' => false, 'message' => 'New password must be at least 8 characters.']);
    exit;
}

if ($new !== $confirm) {
    echo json_encode(['success' => false, 'message' => 'New passwords do not match.']);
    exit;
}


/* ---------- Check current password ---------- */

$stmt = $conn->prepare("SELECT password FROM users WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$hash = $stmt->get_result()->fetch_assoc()['password'] ?? '';
$stmt->close();

if (!password_verify($current, $hash)) {
    echo json_encode(['success' => false, 'message' => 'Your current password is incorrect.']);
    exit;
}

if (password_verify($new, $hash)) {
    echo json_encode(['success' => false, 'message' => 'Choose a password different from your current one.']);
    exit;
}


/* ---------- Save ---------- */

$newHash = password_hash($new, PASSWORD_DEFAULT);

$stmt = $conn->prepare("UPDATE users SET password = ? WHERE user_id = ?");
$stmt->bind_param("si", $newHash, $userId);
$stmt->execute();
$stmt->close();

// Signed out of the mobile app on other phones (the phone making this
// change through api/ keeps its sign-in)
$keepHash = isset($apiToken) ? hash("sha256", $apiToken) : "";
$stmt = $conn->prepare("DELETE FROM api_tokens WHERE user_id = ? AND token_hash <> ?");
$stmt->bind_param("is", $userId, $keepHash);
$stmt->execute();
$stmt->close();

echo json_encode(['success' => true, 'message' => 'Password changed.']);
