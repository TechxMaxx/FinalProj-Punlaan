<?php

/*
|--------------------------------------------------------------------------
| SAFE FILE UPLOADS
|--------------------------------------------------------------------------
|
| Checks the real file type (not the name the browser sent), limits the
| size, and saves under a random name in punlaan/uploads/<folder>/.
| Returns the path relative to the project root, e.g.
| "uploads/avatars/5f2c…e1.jpg".
|
*/

const UPLOAD_TYPES_IMAGE = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

const UPLOAD_TYPES_DOCUMENT = UPLOAD_TYPES_IMAGE + [
    'application/pdf' => 'pdf',
];


/*
 * $root is the top folder under the project ("uploads" by default;
 * product photos use "FrontEnd/products" so their paths match the
 * existing "products/…" image paths).
 */
function saveUpload(array $file, string $folder, array $allowedTypes, int $maxBytes, string $root = 'uploads'): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        throw new RuntimeException('Please choose a file.');
    }

    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        throw new RuntimeException('The upload failed. Please try again.');
    }

    if ($file['size'] > $maxBytes) {
        throw new RuntimeException('The file is too large (max ' . round($maxBytes / 1048576) . ' MB).');
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);

    if (!isset($allowedTypes[$mime])) {
        $kinds = strtoupper(implode(', ', array_unique(array_values($allowedTypes))));
        throw new RuntimeException("Unsupported file type. Use $kinds.");
    }

    $dir = __DIR__ . '/../../' . $root . '/' . $folder;

    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        throw new RuntimeException('Could not save the file.');
    }

    $name = bin2hex(random_bytes(16)) . '.' . $allowedTypes[$mime];

    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
        throw new RuntimeException('Could not save the file.');
    }

    return $root . '/' . $folder . '/' . $name;
}


/* Delete a previously uploaded file (only inside uploads/) */
function deleteUpload(?string $relativePath): void
{
    if (!$relativePath || strpos($relativePath, 'uploads/') !== 0) {
        return;
    }

    $uploads = realpath(__DIR__ . '/../../uploads');
    $file = realpath(__DIR__ . '/../../' . $relativePath);

    if ($uploads && $file && strpos($file, $uploads . DIRECTORY_SEPARATOR) === 0) {
        @unlink($file);
    }
}
