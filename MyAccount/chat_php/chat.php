<?php

/*
|--------------------------------------------------------------------------
| BUYER ↔ SELLER CHAT
|--------------------------------------------------------------------------
|
| GET  ?action=list                         my conversations (as buyer and as seller)
| GET  ?action=thread&id=5&after=120        messages newer than #120 (marks them read)
| POST {action: "start", vendor_id, product_id?}   buyer opens a chat with a shop
| POST {action: "start", customer_id}              seller opens a chat with one of their buyers
| POST {action: "send", conversation_id, body, product_id?}
|
| The pages ask for new messages every few seconds (free hosting has
| no live connections). The other person gets a notification only for
| the first unread message, so a long chat doesn't flood the bell.
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");
header("Cache-Control: no-store");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in first."]);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../../lib/notify.php";

$me = (int)$_SESSION["user_id"];

function reply(array $data): void
{
    echo json_encode($data);
    exit;
}

/* The conversation, if I'm in it; adds "role" (customer | vendor) */
function myConversation(mysqli $conn, int $id, int $me): ?array
{
    $stmt = $conn->prepare("SELECT * FROM conversations WHERE conversation_id = ? AND (customer_id = ? OR vendor_id = ?)");
    $stmt->bind_param("iii", $id, $me, $me);
    $stmt->execute();
    $c = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($c) {
        $c["role"] = (int)$c["customer_id"] === $me ? "customer" : "vendor";
    }

    return $c ?: null;
}

function productCard(mysqli $conn, ?int $productId): ?array
{
    if (!$productId) return null;

    $stmt = $conn->prepare("SELECT product_id, product_name, product_image, price FROM product WHERE product_id = ?");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $p = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $p ? [
        "product_id" => (int)$p["product_id"],
        "name" => $p["product_name"],
        "image" => $p["product_image"],
        "price" => (float)$p["price"],
    ] : null;
}


$action = $_GET["action"] ?? "";
$input = [];

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $input = json_decode(file_get_contents("php://input"), true) ?? [];
    $action = $input["action"] ?? "";
}


/* ---------- my conversations ---------- */

if ($action === "list") {

    $stmt = $conn->prepare("
        SELECT c.conversation_id, c.customer_id, c.vendor_id, c.last_message_at,
               IF(c.customer_id = ?, 'customer', 'vendor') AS role,
               other.user_id AS other_id,
               IF(c.customer_id = ?,
                  COALESCE(NULLIF(other.store_name, ''), CONCAT(other.first_name, ' ', other.last_name)),
                  CONCAT(other.first_name, ' ', other.last_name)) AS other_name,
               other.profile_picture AS other_avatar,
               m.body AS last_body, m.sender_id AS last_sender,
               (SELECT COUNT(*) FROM messages x
                WHERE x.conversation_id = c.conversation_id AND x.sender_id <> ?
                  AND x.message_id > IF(c.customer_id = ?, c.customer_last_read_id, c.vendor_last_read_id)) AS unread
        FROM conversations c
        INNER JOIN users other ON other.user_id = IF(c.customer_id = ?, c.vendor_id, c.customer_id)
        LEFT JOIN messages m ON m.message_id = c.last_message_id
        WHERE c.customer_id = ? OR c.vendor_id = ?
        ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    ");
    $stmt->bind_param("iiiiiii", $me, $me, $me, $me, $me, $me, $me);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    reply(["success" => true, "me" => $me, "conversations" => array_map(fn($r) => [
        "conversation_id" => (int)$r["conversation_id"],
        "role" => $r["role"],
        "other_id" => (int)$r["other_id"],
        "other_name" => $r["other_name"],
        "other_avatar" => $r["other_avatar"],
        "last_body" => $r["last_body"],
        "last_mine" => (int)$r["last_sender"] === $me,
        "last_message_at" => $r["last_message_at"],
        "unread" => (int)$r["unread"],
    ], $rows)]);
}


/* ---------- messages in one conversation ---------- */

if ($action === "thread") {

    $c = myConversation($conn, (int)($_GET["id"] ?? 0), $me);
    if (!$c) reply(["success" => false, "message" => "Conversation not found."]);

    $after = (int)($_GET["after"] ?? 0);

    $stmt = $conn->prepare("
        SELECT message_id, sender_id, body, product_id, created_at
        FROM messages
        WHERE conversation_id = ? AND message_id > ?
        ORDER BY message_id
        LIMIT 200
    ");
    $stmt->bind_param("ii", $c["conversation_id"], $after);
    $stmt->execute();
    $messages = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $products = [];
    foreach ($messages as &$m) {
        $m["message_id"] = (int)$m["message_id"];
        $m["mine"] = (int)$m["sender_id"] === $me;
        $pid = $m["product_id"] ? (int)$m["product_id"] : null;
        if ($pid && !isset($products[$pid])) $products[$pid] = productCard($conn, $pid);
        $m["product"] = $pid ? $products[$pid] : null;
        unset($m["sender_id"], $m["product_id"]);
    }
    unset($m);

    // Mark as read up to the newest message
    if ($messages) {
        $lastId = end($messages)["message_id"];
        $column = $c["role"] === "customer" ? "customer_last_read_id" : "vendor_last_read_id";
        $stmt = $conn->prepare("UPDATE conversations SET $column = GREATEST($column, ?) WHERE conversation_id = ?");
        $stmt->bind_param("ii", $lastId, $c["conversation_id"]);
        $stmt->execute();
        $stmt->close();
    }

    // The other person has read up to…
    $otherRead = (int)($c["role"] === "customer" ? $c["vendor_last_read_id"] : $c["customer_last_read_id"]);

    reply(["success" => true, "messages" => $messages, "other_read_id" => $otherRead]);
}


/* ---------- open a conversation ---------- */

if ($action === "start") {

    $vendorId = (int)($input["vendor_id"] ?? 0);
    $customerId = (int)($input["customer_id"] ?? 0);
    $productId = (int)($input["product_id"] ?? 0) ?: null;

    if ($vendorId) {

        // Buyer → shop (must be an approved, active seller, and not myself)
        if ($vendorId === $me) reply(["success" => false, "message" => "This is your own shop."]);

        $stmt = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? AND is_vendor = 1 AND verification_status = 2 AND account_status = 0");
        $stmt->bind_param("i", $vendorId);
        $stmt->execute();
        $ok = $stmt->get_result()->fetch_row();
        $stmt->close();

        if (!$ok) reply(["success" => false, "message" => "This shop can't receive messages right now."]);

        $customerId = $me;

    } elseif ($customerId) {

        // Seller → one of their own buyers
        $stmt = $conn->prepare("
            SELECT 1 FROM orders o INNER JOIN order_items oi ON oi.order_id = o.order_id
            WHERE o.customer_id = ? AND oi.vendor_id = ? LIMIT 1
        ");
        $stmt->bind_param("ii", $customerId, $me);
        $stmt->execute();
        $ok = $stmt->get_result()->fetch_row();
        $stmt->close();

        if (!$ok) reply(["success" => false, "message" => "You can only message buyers who ordered from you."]);

        $vendorId = $me;

    } else {
        reply(["success" => false, "message" => "Who do you want to message?"]);
    }

    $stmt = $conn->prepare("INSERT IGNORE INTO conversations (customer_id, vendor_id, product_id) VALUES (?, ?, ?)");
    $stmt->bind_param("iii", $customerId, $vendorId, $productId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare("SELECT conversation_id FROM conversations WHERE customer_id = ? AND vendor_id = ?");
    $stmt->bind_param("ii", $customerId, $vendorId);
    $stmt->execute();
    $id = (int)$stmt->get_result()->fetch_row()[0];
    $stmt->close();

    reply(["success" => true, "conversation_id" => $id, "product" => productCard($conn, $productId)]);
}


/* ---------- send ---------- */

if ($action === "send") {

    $c = myConversation($conn, (int)($input["conversation_id"] ?? 0), $me);
    if (!$c) reply(["success" => false, "message" => "Conversation not found."]);

    $body = trim((string)($input["body"] ?? ""));
    $productId = (int)($input["product_id"] ?? 0) ?: null;

    if ($body === "") reply(["success" => false, "message" => "Type a message first."]);
    if (mb_strlen($body) > 2000) reply(["success" => false, "message" => "Messages can be up to 2000 characters."]);

    $stmt = $conn->prepare("INSERT INTO messages (conversation_id, sender_id, body, product_id) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iisi", $c["conversation_id"], $me, $body, $productId);
    $stmt->execute();
    $messageId = $stmt->insert_id;
    $stmt->close();

    $myColumn = $c["role"] === "customer" ? "customer_last_read_id" : "vendor_last_read_id";
    $stmt = $conn->prepare("UPDATE conversations SET last_message_id = ?, last_message_at = NOW(), $myColumn = ? WHERE conversation_id = ?");
    $stmt->bind_param("iii", $messageId, $messageId, $c["conversation_id"]);
    $stmt->execute();
    $stmt->close();

    // Notify only if the other person had read everything before this message
    $otherId = $c["role"] === "customer" ? (int)$c["vendor_id"] : (int)$c["customer_id"];
    $otherRead = (int)($c["role"] === "customer" ? $c["vendor_last_read_id"] : $c["customer_last_read_id"]);

    if ($otherRead >= (int)$c["last_message_id"]) {
        $stmt = $conn->prepare("SELECT first_name, store_name FROM users WHERE user_id = ?");
        $stmt->bind_param("i", $me);
        $stmt->execute();
        $sender = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $name = $c["role"] === "vendor" && $sender["store_name"] ? $sender["store_name"] : $sender["first_name"];

        notifyUser($conn, $otherId, "New message from $name", mb_substr($body, 0, 140),
            "MyAccount/customer/Messages.html?c=" . $c["conversation_id"], false);
    }

    reply(["success" => true, "message_id" => $messageId]);
}

reply(["success" => false, "message" => "Unknown action."]);
