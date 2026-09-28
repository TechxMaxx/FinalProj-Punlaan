<?php

/*
|--------------------------------------------------------------------------
| ADMIN ONLY
|--------------------------------------------------------------------------
*/

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (
    !isset($_SESSION["admin_user_id"]) ||
    (int)($_SESSION["is_admin"] ?? 0) !== 1
) {
    http_response_code(401);
    header("Content-Type: application/json");

    echo json_encode([
        "success" => false,
        "logged_in" => false,
        "message" => "Admin login required."
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| CHECK SUPER ADMIN
|--------------------------------------------------------------------------
*/

function currentAdminIsSuperAdmin(mysqli $conn): bool
{
    $id = (int)($_SESSION["admin_user_id"] ?? 0);

    $stmt = $conn->prepare("
        SELECT is_superadmin
        FROM users
        WHERE user_id = ?
          AND is_admin = 1
        LIMIT 1
    ");

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param("i", $id);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row && (int)$row["is_superadmin"] === 1;
}


/*
|--------------------------------------------------------------------------
| USER MANAGEMENT PERMISSION
|--------------------------------------------------------------------------
|
| Normal Admin:
|   - Can manage customers/vendors
|   - Cannot manage admins
|
| Super Admin:
|   - Can manage other admins
|   - Cannot modify own account
|
*/

function canManageUser(mysqli $conn, int $targetId): bool
{
    $currentId = (int)($_SESSION["admin_user_id"] ?? 0);

    // Prevent modifying your own account.
    if ($currentId === $targetId) {
        return false;
    }

    $stmt = $conn->prepare("
        SELECT is_admin
        FROM users
        WHERE user_id = ?
        LIMIT 1
    ");

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param("i", $targetId);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return false;
    }

    // Admin accounts require Super Admin.
    if ((int)$row["is_admin"] === 1) {
        return currentAdminIsSuperAdmin($conn);
    }

    // Customers/vendors can be managed by normal admins.
    return true;
}


/*
|--------------------------------------------------------------------------
| SUPER ADMIN ONLY ACTIONS
|--------------------------------------------------------------------------
|
| Moderators (normal admins) can't send payouts, change marketplace
| settings or manage admins. Call before those actions:
|   requireSuperAdmin($conn);
|
*/

function requireSuperAdmin(mysqli $conn): void
{
    if (currentAdminIsSuperAdmin($conn)) {
        return;
    }

    http_response_code(403);
    header("Content-Type: application/json");

    echo json_encode([
        "success" => false,
        "message" => "Only a Super Admin can do this."
    ]);

    exit;
}
