<?php

/*
|--------------------------------------------------------------------------
| SUPER ADMIN: MAKE ANOTHER ADMIN A SUPER ADMIN OR A MODERATOR
|--------------------------------------------------------------------------
|
| POST JSON {user_id, role: "super" | "moderator"}
|
| Super Admin: everything.
| Moderator:   no payouts, no marketplace settings, can't manage admins.
|
| You can't change your own role, so there is always at least one
| active Super Admin (you).
|
*/

require_once __DIR__ . "/superadmin_auth.php";

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$targetId = (int)($data["user_id"] ?? 0);
$role = (string)($data["role"] ?? "");

if ($targetId <= 0 || !in_array($role, ["super", "moderator"], true)) {
    echo json_encode(["success" => false, "message" => "Choose an admin and a role."]);
    exit;
}

if ($targetId === $adminId) {
    echo json_encode(["success" => false, "message" => "You can't change your own role. Ask another Super Admin."]);
    exit;
}

$stmt = $conn->prepare("SELECT is_admin, is_superadmin FROM users WHERE user_id = ?");
$stmt->bind_param("i", $targetId);
$stmt->execute();
$target = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$target || (int)$target["is_admin"] !== 1) {
    echo json_encode(["success" => false, "message" => "That account is not an admin."]);
    exit;
}

$isSuper = $role === "super" ? 1 : 0;
$roleName = $isSuper ? "super_admin" : "admin";

// Never leave the marketplace without an active Super Admin
if (!$isSuper) {
    $stmt = $conn->prepare("
        SELECT COUNT(*) FROM users
        WHERE is_admin = 1 AND is_superadmin = 1 AND account_status = 0 AND user_id <> ?
    ");
    $stmt->bind_param("i", $targetId);
    $stmt->execute();
    $othersLeft = (int)$stmt->get_result()->fetch_row()[0];
    $stmt->close();

    if ($othersLeft === 0) {
        echo json_encode(["success" => false, "message" => "There must always be at least one Super Admin."]);
        exit;
    }
}

$stmt = $conn->prepare("UPDATE users SET is_superadmin = ?, admin_role = ? WHERE user_id = ? AND is_admin = 1");
$stmt->bind_param("isi", $isSuper, $roleName, $targetId);
$stmt->execute();
$stmt->close();

echo json_encode([
    "success" => true,
    "message" => $isSuper ? "They are now a Super Admin." : "They are now a Moderator."
]);
