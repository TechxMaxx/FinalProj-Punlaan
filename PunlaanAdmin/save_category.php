<?php

/*
|--------------------------------------------------------------------------
| ADMIN: EDIT CATEGORIES
|--------------------------------------------------------------------------
|
| POST JSON
|   {action: "add",    name, parent_id (null = main category)}
|   {action: "rename", id, name}     products using it are renamed too
|   {action: "toggle", id}           hide / show (hidden = sellers can't pick
|                                    it and the Marketplace sidebar skips it)
|   {action: "delete", id}           only when no product uses it
|   {action: "size", id, size}       shipping size: small | medium | large
|                                    ("" on a subcategory = same as its main category)
|
*/

require_once __DIR__ . "/admin_auth.php";
require_once __DIR__ . "/connection.php";
require_once __DIR__ . "/../lib/categories.php";

header("Content-Type: application/json");

$input = json_decode(file_get_contents("php://input"), true) ?? [];
$action = $input["action"] ?? "";
$name = trim(preg_replace('/\s+/', ' ', (string)($input["name"] ?? "")));

function answer(bool $ok, string $message): void
{
    echo json_encode(["success" => $ok, "message" => $message]);
    exit;
}

function findCategory(mysqli $conn, int $id): ?array
{
    $stmt = $conn->prepare("SELECT * FROM categories WHERE category_id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ?: null;
}

function nameTaken(mysqli $conn, string $name, ?int $parentId, int $exceptId = 0): bool
{
    $stmt = $conn->prepare("
        SELECT COUNT(*) FROM categories
        WHERE name = ? AND category_id <> ? AND (parent_id <=> ?)
    ");
    $stmt->bind_param("sii", $name, $exceptId, $parentId);
    $stmt->execute();
    $taken = (int)$stmt->get_result()->fetch_row()[0] > 0;
    $stmt->close();
    return $taken;
}

/* How many products use a category (main) or subcategory */
function productsUsing(mysqli $conn, array $cat): int
{
    $column = $cat["parent_id"] === null ? "category" : "subcategory";
    $stmt = $conn->prepare("SELECT COUNT(*) FROM product WHERE $column = ? AND status <> 3");
    $stmt->bind_param("s", $cat["name"]);
    $stmt->execute();
    $n = (int)$stmt->get_result()->fetch_row()[0];
    $stmt->close();
    return $n;
}


if ($action === "add") {

    if ($name === "" || mb_strlen($name) > 100) answer(false, "Enter a name (up to 100 characters).");

    $parentId = isset($input["parent_id"]) && $input["parent_id"] !== null ? (int)$input["parent_id"] : null;

    if ($parentId !== null) {
        $parent = findCategory($conn, $parentId);
        if (!$parent || $parent["parent_id"] !== null) answer(false, "Choose a main category.");
    }

    if (nameTaken($conn, $name, $parentId)) answer(false, "“{$name}” already exists there.");

    // Unique web address for the Marketplace link
    $base = categorySlug($name);
    $slug = $base;
    for ($i = 2; ; $i++) {
        $stmt = $conn->prepare("SELECT COUNT(*) FROM categories WHERE slug = ?");
        $stmt->bind_param("s", $slug);
        $stmt->execute();
        $exists = (int)$stmt->get_result()->fetch_row()[0] > 0;
        $stmt->close();
        if (!$exists) break;
        $slug = $base . "-" . $i;
    }

    $stmt = $conn->prepare("
        INSERT INTO categories (parent_id, name, slug, sort_order)
        SELECT ?, ?, ?, COALESCE(MAX(sort_order), 0) + 1 FROM categories WHERE parent_id <=> ?
    ");
    $stmt->bind_param("issi", $parentId, $name, $slug, $parentId);
    $stmt->execute();
    $stmt->close();

    answer(true, "“{$name}” added.");
}


$cat = findCategory($conn, (int)($input["id"] ?? 0));
if (!$cat) answer(false, "Category not found.");

$parentId = $cat["parent_id"] !== null ? (int)$cat["parent_id"] : null;


if ($action === "rename") {

    if ($name === "" || mb_strlen($name) > 100) answer(false, "Enter a name (up to 100 characters).");
    if ($name === $cat["name"]) answer(true, "No change.");
    if (nameTaken($conn, $name, $parentId, (int)$cat["category_id"])) answer(false, "“{$name}” already exists there.");

    $conn->begin_transaction();

    $stmt = $conn->prepare("UPDATE categories SET name = ? WHERE category_id = ?");
    $stmt->bind_param("si", $name, $cat["category_id"]);
    $stmt->execute();
    $stmt->close();

    // Keep products in the renamed category
    // (a subcategory only inside its own main category)
    if ($parentId === null) {
        $stmt = $conn->prepare("UPDATE product SET category = ? WHERE category = ?");
        $stmt->bind_param("ss", $name, $cat["name"]);
    } else {
        $parentName = findCategory($conn, $parentId)["name"];
        $stmt = $conn->prepare("UPDATE product SET subcategory = ? WHERE subcategory = ? AND category = ?");
        $stmt->bind_param("sss", $name, $cat["name"], $parentName);
    }
    $stmt->execute();
    $moved = $stmt->affected_rows;
    $stmt->close();

    $conn->commit();

    answer(true, "Renamed to “{$name}”" . ($moved ? " ($moved product(s) updated)." : "."));
}


if ($action === "toggle") {

    $stmt = $conn->prepare("UPDATE categories SET is_active = 1 - is_active WHERE category_id = ?");
    $stmt->bind_param("i", $cat["category_id"]);
    $stmt->execute();
    $stmt->close();

    answer(true, (int)$cat["is_active"]
        ? "“{$cat["name"]}” is hidden. Its products stay on sale; sellers can't choose it for new products."
        : "“{$cat["name"]}” is visible again.");
}


if ($action === "size") {

    $size = (string)($input["size"] ?? "");
    $allowed = ["small", "medium", "large"];

    if ($size === "" && $parentId !== null) {
        $size = null;                                 // follow the main category
    } elseif (!in_array($size, $allowed, true)) {
        answer(false, "Choose Small, Medium or Large.");
    }

    $stmt = $conn->prepare("UPDATE categories SET size_tier = ? WHERE category_id = ?");
    $stmt->bind_param("si", $size, $cat["category_id"]);
    $stmt->execute();
    $stmt->close();

    answer(true, "Shipping size for “{$cat["name"]}”: " . ($size ? ucfirst($size) : "same as its main category") . ". Applies to new orders.");
}


if ($action === "delete") {

    $used = productsUsing($conn, $cat);

    if ($parentId === null) {
        $stmt = $conn->prepare("SELECT name FROM categories WHERE parent_id = ?");
        $stmt->bind_param("i", $cat["category_id"]);
        $stmt->execute();
        foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $child) {
            $used += productsUsing($conn, ["parent_id" => $cat["category_id"], "name" => $child["name"]]);
        }
        $stmt->close();
    }

    if ($used > 0) {
        answer(false, "$used product(s) still use “{$cat["name"]}”. Hide it instead, or move those products first.");
    }

    $stmt = $conn->prepare("DELETE FROM categories WHERE category_id = ?");
    $stmt->bind_param("i", $cat["category_id"]);
    $stmt->execute();
    $stmt->close();

    answer(true, "“{$cat["name"]}” deleted.");
}

answer(false, "Unknown action.");
