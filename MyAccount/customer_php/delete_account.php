<?php

/*
|--------------------------------------------------------------------------
| DELETE MY ACCOUNT (Profile → Security)
|--------------------------------------------------------------------------
|
| POST JSON {password}
|
| Not allowed while something is still going on:
|   buyer:  orders not delivered/cancelled yet, open returns
|   seller: orders to finish, open returns, payouts waiting,
|           earnings not paid out yet
|
| What happens:
|   - Name, email, phone, address, photo, bio, shop details and Google /
|     Facebook links are erased; the email can be used again for a new
|     account.
|   - Cart, saved plants, addresses, seller ID documents and every
|     sign-in (this browser, "Keep me signed in", the mobile app) are removed.
|   - Past orders, reviews and payouts stay for the other side's records,
|     shown as "Deleted account". The shop and its listings disappear.
|   - account_status = 3 (deleted) — the account can't be used again.
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "User is not logged in."]);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../../lib/earnings.php";

$userId = (int)$_SESSION["user_id"];
$data = json_decode(file_get_contents("php://input"), true) ?? [];
$password = (string)($data["password"] ?? "");

function countRows(mysqli $conn, string $sql, int $userId): int
{
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $n = (int)$stmt->get_result()->fetch_row()[0];
    $stmt->close();
    return $n;
}


/* ---------- password ---------- */

$stmt = $conn->prepare("SELECT password, is_vendor, is_admin, profile_picture FROM users WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user) {
    echo json_encode(["success" => false, "message" => "Account not found."]);
    exit;
}

if ($password === "" || !password_verify($password, $user["password"])) {
    echo json_encode(["success" => false, "message" => "Your password is incorrect."]);
    exit;
}

if ((int)$user["is_admin"] === 1) {
    echo json_encode(["success" => false, "message" => "Admin accounts can't be deleted here."]);
    exit;
}


/* ---------- nothing left unfinished ---------- */

$problems = [];

if (countRows($conn, "
    SELECT COUNT(*) FROM order_items oi INNER JOIN orders o ON o.order_id = oi.order_id
    WHERE o.customer_id = ? AND oi.status NOT IN ('completed', 'cancelled')
", $userId)) {
    $problems[] = "You have orders that haven't arrived yet. Wait for them (or cancel them) in My Orders.";
}

if (countRows($conn, "SELECT COUNT(*) FROM return_requests WHERE customer_id = ? AND status IN ('requested', 'disputed')", $userId)) {
    $problems[] = "You have a return request that's still open.";
}

if ((int)$user["is_vendor"] === 1) {

    if (countRows($conn, "SELECT COUNT(*) FROM order_items WHERE vendor_id = ? AND status NOT IN ('completed', 'cancelled')", $userId)) {
        $problems[] = "Your shop has orders to finish in Order Processing.";
    }

    if (countRows($conn, "SELECT COUNT(*) FROM return_requests WHERE vendor_id = ? AND status IN ('requested', 'disputed')", $userId)) {
        $problems[] = "Your shop has return requests to answer.";
    }

    if (countRows($conn, "SELECT COUNT(*) FROM payouts WHERE vendor_id = ? AND status = 'requested'", $userId)) {
        $problems[] = "You have a payout request waiting to be sent.";
    }

    $earnings = vendorEarnings($conn, $userId);

    if ($earnings["balance"] > 0 || $earnings["on_hold"] > 0) {
        $problems[] = "You still have earnings (₱" . number_format($earnings["balance"] + $earnings["on_hold"], 2)
            . "). Request a payout in Sales & Payouts first.";
    }
}

if ($problems) {
    echo json_encode([
        "success" => false,
        "message" => "You can't delete your account yet: " . implode(" ", $problems),
        "problems" => $problems
    ]);
    exit;
}


/* ---------- erase ---------- */

// Files to remove after the database is updated
$files = [];
if ($user["profile_picture"]) $files[] = $user["profile_picture"];

$stmt = $conn->prepare("SELECT file_path FROM vendor_documents WHERE user_id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $doc) {
    $files[] = $doc["file_path"];
}
$stmt->close();

$conn->begin_transaction();

try {
    $placeholderEmail = "deleted-$userId-" . bin2hex(random_bytes(4)) . "@deleted.invalid";
    $unusablePassword = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);

    $stmt = $conn->prepare("
        UPDATE users SET
            first_name = 'Deleted', last_name = 'account',
            store_name = NULL, store_description = NULL, store_banner = NULL, store_links = NULL,
            email = ?, email_verified = 1, password = ?,
            google_id = NULL, facebook_id = NULL,
            phone = NULL, address = NULL, bio = NULL, geo_lat = NULL, geo_lng = NULL,
            profile_picture = NULL, free_ship_min = NULL,
            account_status = 3
        WHERE user_id = ?
    ");
    $stmt->bind_param("ssi", $placeholderEmail, $unusablePassword, $userId);
    $stmt->execute();
    $stmt->close();

    // Listings can't be bought anymore
    $stmt = $conn->prepare("UPDATE product SET stock = 0 WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();

    foreach (["cart", "saved_plants", "user_addresses", "vendor_documents",
              "remember_tokens", "api_tokens", "password_resets", "email_codes"] as $table) {
        $stmt = $conn->prepare("DELETE FROM $table WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $stmt->close();
    }

    $conn->commit();

} catch (Throwable $e) {
    $conn->rollback();
    error_log("Punlaan delete account $userId: " . $e->getMessage());
    echo json_encode(["success" => false, "message" => "Could not delete your account. Please try again."]);
    exit;
}

// Uploaded photo + ID documents (only files inside uploads/)
$uploads = realpath(__DIR__ . "/../../uploads");
foreach ($files as $path) {
    $full = realpath(__DIR__ . "/../../" . ltrim((string)$path, "/"));
    if ($uploads && $full && str_starts_with($full, $uploads . DIRECTORY_SEPARATOR) && is_file($full)) {
        @unlink($full);
    }
}


/* ---------- sign out ---------- */

forgetRememberedUser();
$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), "", time() - 42000, $params["path"], $params["domain"], $params["secure"], $params["httponly"]);
}

session_destroy();

echo json_encode(["success" => true, "message" => "Your account was deleted."]);
