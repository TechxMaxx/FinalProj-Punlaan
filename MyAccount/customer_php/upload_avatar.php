<?php

/* Upload / replace the logged-in user's profile photo */

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User is not logged in.']);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/upload_helpers.php";

$userId = (int) $_SESSION['user_id'];

try {

    $path = saveUpload($_FILES['avatar'] ?? [], 'avatars', UPLOAD_TYPES_IMAGE, 2 * 1048576);

    // Remember the old photo so it can be removed
    $stmt = $conn->prepare("SELECT profile_picture FROM users WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $old = $stmt->get_result()->fetch_assoc()['profile_picture'] ?? null;
    $stmt->close();

    $stmt = $conn->prepare("UPDATE users SET profile_picture = ? WHERE user_id = ?");
    $stmt->bind_param("si", $path, $userId);
    $stmt->execute();
    $stmt->close();

    deleteUpload($old);

    echo json_encode([
        'success' => true,
        'message' => 'Profile photo updated.',
        'profile_picture' => $path
    ]);

} catch (RuntimeException $e) {

    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
