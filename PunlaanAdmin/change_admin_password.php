<?php

/* Change the logged-in admin's password (requires the current password) */

// Admins only
require_once __DIR__ . "/admin_auth.php";

require_once __DIR__ . "/connection.php";

header('Content-Type: application/json');

$adminId = (int) $_SESSION['admin_user_id'];

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

$stmt = $conn->prepare("SELECT password FROM users WHERE user_id = ? AND is_admin = 1");
$stmt->bind_param("i", $adminId);
$stmt->execute();
$hash = $stmt->get_result()->fetch_assoc()['password'] ?? '';
$stmt->close();

if ($hash === '' || !password_verify($current, $hash)) {
    echo json_encode(['success' => false, 'message' => 'Your current password is incorrect.']);
    exit;
}

if (password_verify($new, $hash)) {
    echo json_encode(['success' => false, 'message' => 'Choose a password different from your current one.']);
    exit;
}


/* ---------- Save ---------- */

$newHash = password_hash($new, PASSWORD_DEFAULT);

$stmt = $conn->prepare("UPDATE users SET password = ? WHERE user_id = ? AND is_admin = 1");
$stmt->bind_param("si", $newHash, $adminId);
$stmt->execute();
$stmt->close();

echo json_encode(['success' => true, 'message' => 'Password changed. Use the new password next time you log in.']);
