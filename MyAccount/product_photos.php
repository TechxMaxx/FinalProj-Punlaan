<?php

/*
|--------------------------------------------------------------------------
| PRODUCT PHOTOS (seller)
|--------------------------------------------------------------------------
|
| GET  ?product_id=…   → the product's photos, cover first
|
| POST (multipart) — applied together when the seller saves the product:
|   product_id
|   remove_ids[]   photos to delete
|   images[]       new photos (JPG / PNG / WEBP, max 3 MB each)
|   cover          "e:<image_id>" (existing photo) or "n:<index>" (new photo)
|
| Rules: up to 5 photos; the cover is copied into product.product_image
| (used by Marketplace cards, cart, orders). Changing the photos of a live
| product sends it back to the admin's Vendor Listings Approval queue.
|
*/

require_once __DIR__ . "/../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in."]);
    exit;
}

require_once __DIR__ . "/../FrontEnd/connection.php";
require_once __DIR__ . "/customer_php/upload_helpers.php";

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 3 * 1048576;
const NO_PHOTO = "products/no_photo.jpg";

$userId = (int) $_SESSION["user_id"];
$productId = (int) ($_GET["product_id"] ?? $_POST["product_id"] ?? 0);


/* ---------- The product must belong to this seller ---------- */

$stmt = $conn->prepare("SELECT product_id, status FROM product WHERE product_id = ? AND user_id = ?");
$stmt->bind_param("ii", $productId, $userId);
$stmt->execute();
$product = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$product) {
    echo json_encode(["success" => false, "message" => "Product not found."]);
    exit;
}


function listPhotos(mysqli $conn, int $productId): array
{
    $stmt = $conn->prepare("
        SELECT image_id, file_path
        FROM product_images
        WHERE product_id = ?
        ORDER BY sort_order, image_id
    ");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    return array_map(fn($r) => [
        "image_id" => (int) $r["image_id"],
        "path" => $r["file_path"]
    ], $rows);
}

/* Delete an uploaded product photo file (only inside FrontEnd/products/uploads) */
function deleteProductPhotoFile(string $path): void
{
    $dir = realpath(__DIR__ . "/../FrontEnd/products/uploads");
    $file = realpath(__DIR__ . "/../FrontEnd/" . $path);

    if ($dir && $file && strpos($file, $dir . DIRECTORY_SEPARATOR) === 0) {
        @unlink($file);
    }
}


/* ==========================================
   GET → LIST
========================================== */

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    echo json_encode(["success" => true, "photos" => listPhotos($conn, $productId)]);
    exit;
}


/* ==========================================
   POST → SAVE CHANGES
========================================== */

$removeIds = array_map("intval", (array) ($_POST["remove_ids"] ?? []));
$cover = (string) ($_POST["cover"] ?? "");

// Normalise $_FILES['images'] (multiple) into a list of single files
$newFiles = [];

if (!empty($_FILES["images"]["name"]) && is_array($_FILES["images"]["name"])) {
    foreach ($_FILES["images"]["name"] as $i => $name) {
        if ($_FILES["images"]["error"][$i] === UPLOAD_ERR_NO_FILE) continue;
        $newFiles[] = [
            "name" => $name,
            "type" => $_FILES["images"]["type"][$i],
            "tmp_name" => $_FILES["images"]["tmp_name"][$i],
            "error" => $_FILES["images"]["error"][$i],
            "size" => $_FILES["images"]["size"][$i],
        ];
    }
}

$existing = listPhotos($conn, $productId);
$keep = array_values(array_filter($existing, fn($p) => !in_array($p["image_id"], $removeIds, true)));
$removed = array_values(array_filter($existing, fn($p) => in_array($p["image_id"], $removeIds, true)));

if (count($keep) + count($newFiles) > MAX_PHOTOS) {
    echo json_encode(["success" => false, "message" => "A product can have up to " . MAX_PHOTOS . " photos."]);
    exit;
}

$changed = $removed || $newFiles;


/* ---------- Save new files first (nothing in the DB changes if one fails) ---------- */

$savedPaths = [];

try {
    foreach ($newFiles as $file) {
        // Returns "FrontEnd/products/uploads/xyz.jpg" → store as "products/uploads/xyz.jpg"
        $full = saveUpload($file, "uploads", UPLOAD_TYPES_IMAGE, MAX_PHOTO_BYTES, "FrontEnd/products");
        $savedPaths[] = substr($full, strlen("FrontEnd/"));
    }
} catch (RuntimeException $e) {
    foreach ($savedPaths as $p) deleteProductPhotoFile($p);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
    exit;
}


/* ---------- Apply in the database ---------- */

$conn->begin_transaction();

try {

    if ($removed) {
        $stmt = $conn->prepare("DELETE FROM product_images WHERE image_id = ? AND product_id = ?");
        foreach ($removed as $p) {
            $stmt->bind_param("ii", $p["image_id"], $productId);
            $stmt->execute();
        }
        $stmt->close();
    }

    $newIds = [];

    if ($savedPaths) {
        $stmt = $conn->prepare("INSERT INTO product_images (product_id, file_path, sort_order) VALUES (?, ?, 999)");
        foreach ($savedPaths as $path) {
            $stmt->bind_param("is", $productId, $path);
            $stmt->execute();
            $newIds[] = $stmt->insert_id;
        }
        $stmt->close();
    }

    // Final order: chosen cover first, then the rest in their current order
    $order = array_merge(array_column($keep, "image_id"), $newIds);

    $coverId = null;
    if (preg_match('/^e:(\d+)$/', $cover, $m) && in_array((int) $m[1], $order, true)) {
        $coverId = (int) $m[1];
    } elseif (preg_match('/^n:(\d+)$/', $cover, $m) && isset($newIds[(int) $m[1]])) {
        $coverId = $newIds[(int) $m[1]];
    }

    if ($coverId !== null && $order && $order[0] !== $coverId) {
        $order = array_merge([$coverId], array_values(array_diff($order, [$coverId])));
        $changed = true;
    }

    $stmt = $conn->prepare("UPDATE product_images SET sort_order = ? WHERE image_id = ?");
    foreach ($order as $i => $id) {
        $stmt->bind_param("ii", $i, $id);
        $stmt->execute();
    }
    $stmt->close();

    // Cover → product.product_image
    $photos = listPhotos($conn, $productId);
    $coverPath = $photos ? $photos[0]["path"] : NO_PHOTO;

    $stmt = $conn->prepare("UPDATE product SET product_image = ? WHERE product_id = ?");
    $stmt->bind_param("si", $coverPath, $productId);
    $stmt->execute();
    $stmt->close();

    // New photos on a live product → back to the admin's approval queue
    if ($changed && (int) $product["status"] === 1) {
        $stmt = $conn->prepare("UPDATE product SET status = 0, catalog_status = 2 WHERE product_id = ?");
        $stmt->bind_param("i", $productId);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();

} catch (Throwable $e) {

    $conn->rollback();
    foreach ($savedPaths as $p) deleteProductPhotoFile($p);

    echo json_encode(["success" => false, "message" => "Could not save the photos."]);
    exit;
}

// Remove deleted files only after the database change succeeded
foreach ($removed as $p) {
    deleteProductPhotoFile($p["path"]);
}

echo json_encode([
    "success" => true,
    "message" => $changed ? "Photos saved." : "No photo changes.",
    "photos" => $photos
]);
