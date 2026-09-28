<?php

/*
|--------------------------------------------------------------------------
| APPLY TO SELL
|--------------------------------------------------------------------------
|
| A customer submits a seller application from their Profile:
|   store_name, store_description, phone, government ID (required),
|   business permit (optional).
|
| They stay a customer (is_vendor = 0) with verification_status = 1
| until an admin approves them in Users → Verification.
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User is not logged in.']);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/upload_helpers.php";

$userId = (int) $_SESSION['user_id'];

$storeName = trim($_POST['store_name'] ?? '');
$storeDescription = trim($_POST['store_description'] ?? '');
$phone = preg_replace('/[\s\-()]/', '', (string)($_POST['phone'] ?? ''));
$agreed = !empty($_POST['agree']);


/* ---------- Who can apply ---------- */

$stmt = $conn->prepare("
    SELECT
        is_vendor,
        verification_status,
        (SELECT COUNT(*) FROM vendor_documents d WHERE d.user_id = users.user_id) AS document_count
    FROM users
    WHERE user_id = ?
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ((int)$user['is_vendor'] === 1) {
    echo json_encode(['success' => false, 'message' => 'You are already a seller.']);
    exit;
}

// Pending applications can still add an ID if they applied at sign-up without one
if ((int)$user['verification_status'] === 1 && (int)$user['document_count'] > 0) {
    echo json_encode(['success' => false, 'message' => 'Your application is already under review.']);
    exit;
}


/* ---------- Validation ---------- */

if ($storeName === '' || mb_strlen($storeName) > 100) {
    echo json_encode(['success' => false, 'message' => 'Enter a shop name (up to 100 characters).']);
    exit;
}

if (mb_strlen($storeDescription) < 20 || mb_strlen($storeDescription) > 1000) {
    echo json_encode(['success' => false, 'message' => 'Describe what you will sell (20–1000 characters).']);
    exit;
}

if (!preg_match('/^(\+?63|0)9\d{9}$/', $phone)) {
    echo json_encode(['success' => false, 'message' => 'Enter a valid mobile number, e.g. 0917 123 4567.']);
    exit;
}

if (!$agreed) {
    echo json_encode(['success' => false, 'message' => 'Please agree to the seller terms.']);
    exit;
}


/* ---------- Save documents, then the application ---------- */

$saved = [];
$inTransaction = false;

try {

    $saved[] = [
        'type' => 'Government ID',
        'path' => saveUpload($_FILES['government_id'] ?? [], 'vendor_documents', UPLOAD_TYPES_DOCUMENT, 5 * 1048576)
    ];

    if (($_FILES['business_permit']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        $saved[] = [
            'type' => 'Business Permit',
            'path' => saveUpload($_FILES['business_permit'], 'vendor_documents', UPLOAD_TYPES_DOCUMENT, 5 * 1048576)
        ];
    }

    $conn->begin_transaction();
    $inTransaction = true;

    // A new application replaces documents from an earlier (rejected) one
    $stmt = $conn->prepare("SELECT file_path FROM vendor_documents WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $oldFiles = array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC), 'file_path');
    $stmt->close();

    $stmt = $conn->prepare("DELETE FROM vendor_documents WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare("INSERT INTO vendor_documents (user_id, document_type, file_path) VALUES (?, ?, ?)");
    foreach ($saved as $doc) {
        $stmt->bind_param("iss", $userId, $doc['type'], $doc['path']);
        $stmt->execute();
    }
    $stmt->close();

    $stmt = $conn->prepare("
        UPDATE users
        SET store_name = ?,
            store_description = ?,
            phone = ?,
            verification_status = 1
        WHERE user_id = ? AND is_vendor = 0
    ");
    $stmt->bind_param("sssi", $storeName, $storeDescription, $phone, $userId);
    $stmt->execute();
    $stmt->close();

    $conn->commit();
    $inTransaction = false;

    foreach ($oldFiles as $old) {
        deleteUpload($old);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Application submitted! We will review it within 1–3 business days.'
    ]);

} catch (Throwable $e) {

    if ($inTransaction) {
        $conn->rollback();
    }

    // Remove files saved before the failure
    foreach ($saved as $doc) {
        deleteUpload($doc['path']);
    }

    echo json_encode([
        'success' => false,
        'message' => $e instanceof RuntimeException ? $e->getMessage() : 'Could not submit your application.'
    ]);
}
