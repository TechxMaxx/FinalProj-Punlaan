<?php

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header('Content-Type: application/json');

require_once __DIR__ . "/../../FrontEnd/connection.php";

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'User is not logged in.'
    ]);
    exit;
}

$userId = $_SESSION['user_id'];

try {

    $stmt = $conn->prepare("
        SELECT
            user_id,
            first_name,
            last_name,
            store_name,
            store_description,
            email,
            phone,
            address,
            bio,
            geo_lat,
            geo_lng,
            profile_picture,
            created_at,
            last_login,
            is_vendor,
            verification_status,
            account_status,
            (google_id IS NOT NULL) AS google_linked,
            (facebook_id IS NOT NULL) AS facebook_linked,
            (SELECT COUNT(*) FROM vendor_documents d WHERE d.user_id = users.user_id) AS document_count,
            (SELECT MAX(uploaded_at) FROM vendor_documents d WHERE d.user_id = users.user_id) AS applied_at
        FROM users
        WHERE user_id = ?
        LIMIT 1
    ");

    $stmt->bind_param("i", $userId);

    $stmt->execute();

    $result = $stmt->get_result();

    $user = $result->fetch_assoc();

    if (!$user) {

        echo json_encode([
            'success' => false,
            'message' => 'User not found.'
        ]);

        exit;
    }

    echo json_encode([
        'success' => true,
        'profile' => $user
    ]);

} catch (Exception $e) {

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);

}