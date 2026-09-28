<?php

/*
|--------------------------------------------------------------------------
| VIEW SELLER DOCUMENT (admins only)
|--------------------------------------------------------------------------
|
| Seller IDs/permits are stored in uploads/vendor_documents/, which the
| web server refuses to serve directly. This streams one file to a
| logged-in admin.
|
*/

session_start();

if (
    !isset($_SESSION["admin_user_id"]) ||
    (int)($_SESSION["is_admin"] ?? 0) !== 1
) {
    http_response_code(403);
    exit("Admins only.");
}

require 'connection.php';

$documentId = (int)($_GET["id"] ?? 0);

$stmt = $conn->prepare("SELECT file_path FROM vendor_documents WHERE document_id = ?");
$stmt->bind_param("i", $documentId);
$stmt->execute();

$doc = $stmt->get_result()->fetch_assoc();

$stmt->close();
$conn->close();

$baseDir = realpath(__DIR__ . "/../uploads/vendor_documents");
$file = $doc ? realpath(__DIR__ . "/../" . $doc["file_path"]) : false;

// The file must exist and be inside the documents folder
if (!$file || !$baseDir || strpos($file, $baseDir . DIRECTORY_SEPARATOR) !== 0) {
    http_response_code(404);
    exit("Document not found.");
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file);

header("Content-Type: " . $mime);
header("Content-Length: " . filesize($file));
header("Content-Disposition: inline; filename=\"" . basename($file) . "\"");
header("X-Content-Type-Options: nosniff");

readfile($file);
