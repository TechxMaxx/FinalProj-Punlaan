<?php

/*
|--------------------------------------------------------------------------
| ADMIN: REPORTS ABOUT PRODUCTS AND SHOPS
|--------------------------------------------------------------------------
|
| GET → reports (open first)
|
| POST JSON {report_id, action, note}
|   "dismiss"      nothing wrong — close it
|   "resolve"      handled some other way (e.g. talked to the seller)
|   "hide_product" hide the reported listing from the Marketplace
|                  (Master Catalog can show it again) and resolve
|   "suspend_shop" suspend the seller's account — the shop and all its
|                  listings disappear (All User Accounts → Reinstate)
|
| Actions close every other open report about the same product / shop.
| Super Admins and Moderators can both handle reports.
|
*/

require_once __DIR__ . "/admin_auth.php";
require_once __DIR__ . "/connection.php";
require_once __DIR__ . "/../lib/notify.php";

header("Content-Type: application/json");
header("Cache-Control: no-store");

$adminId = (int)$_SESSION["admin_user_id"];


if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $input = json_decode(file_get_contents("php://input"), true) ?? [];
    $reportId = (int)($input["report_id"] ?? 0);
    $action = (string)($input["action"] ?? "");
    $note = mb_substr(trim((string)($input["note"] ?? "")), 0, 1000);

    if (!in_array($action, ["dismiss", "resolve", "hide_product", "suspend_shop"], true)) {
        echo json_encode(["success" => false, "message" => "Unknown action."]);
        exit;
    }

    $stmt = $conn->prepare("
        SELECT r.*, p.product_name
        FROM reports r LEFT JOIN product p ON p.product_id = r.product_id
        WHERE r.report_id = ? AND r.status = 'open'
    ");
    $stmt->bind_param("i", $reportId);
    $stmt->execute();
    $report = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$report) {
        echo json_encode(["success" => false, "message" => "This report was already handled."]);
        exit;
    }

    if ($action !== "dismiss" && mb_strlen($note) < 5) {
        echo json_encode(["success" => false, "message" => "Write a short note about what you did (at least 5 characters)."]);
        exit;
    }

    $vendorId = (int)$report["vendor_id"];
    $productId = $report["product_id"] !== null ? (int)$report["product_id"] : null;

    if ($action === "hide_product") {
        if (!$productId) {
            echo json_encode(["success" => false, "message" => "This report is about a shop, not a listing."]);
            exit;
        }

        $stmt = $conn->prepare("UPDATE product SET catalog_status = 1 WHERE product_id = ?");
        $stmt->bind_param("i", $productId);
        $stmt->execute();
        $stmt->close();

        notifyUser($conn, $vendorId, "Listing hidden: {$report["product_name"]}",
            "Your listing {$report["product_name"]} was hidden from the Marketplace after a report ({$report["reason"]}). $note",
            "MyAccount/vendor/Inventory.html?product=$productId",
            ["subject" => "Your listing was hidden", "button" => "Open Inventory"]);
    }

    if ($action === "suspend_shop") {
        if (!canManageUser($conn, $vendorId)) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "You do not have permission to manage this account."]);
            exit;
        }

        $stmt = $conn->prepare("UPDATE users SET account_status = 1 WHERE user_id = ? AND account_status = 0");
        $stmt->bind_param("i", $vendorId);
        $stmt->execute();
        $stmt->close();
    }

    $status = $action === "dismiss" ? "dismissed" : "resolved";
    $fullNote = $note !== "" ? $note : "No problem found.";

    // Close this report and the other open ones about the same thing
    if ($action === "suspend_shop") {
        $stmt = $conn->prepare("
            UPDATE reports SET status = ?, admin_note = ?, handled_by = ?, handled_at = NOW()
            WHERE status = 'open' AND (report_id = ? OR vendor_id = ?)
        ");
        $stmt->bind_param("ssiii", $status, $fullNote, $adminId, $reportId, $vendorId);
    } else {
        $stmt = $conn->prepare("
            UPDATE reports SET status = ?, admin_note = ?, handled_by = ?, handled_at = NOW()
            WHERE status = 'open' AND (report_id = ?
               OR (target_type = ? AND vendor_id = ? AND product_id <=> ?))
        ");
        $stmt->bind_param("ssiisii", $status, $fullNote, $adminId, $reportId, $report["target_type"], $vendorId, $productId);
    }
    $stmt->execute();
    $closed = $stmt->affected_rows;
    $stmt->close();

    $messages = [
        "dismiss" => "Report dismissed.",
        "resolve" => "Marked as handled.",
        "hide_product" => "Listing hidden from the Marketplace. The seller was told why.",
        "suspend_shop" => "Shop suspended. Reinstate it in All User Accounts.",
    ];

    echo json_encode([
        "success" => true,
        "message" => $messages[$action] . ($closed > 1 ? " ($closed reports closed.)" : ""),
    ]);
    exit;
}


/* ---------- list ---------- */

$reports = $conn->query("
    SELECT r.report_id, r.target_type, r.product_id, r.vendor_id, r.reason, r.details, r.status,
           r.admin_note, r.created_at, r.handled_at,
           p.product_name, p.catalog_status,
           COALESCE(NULLIF(v.store_name, ''), CONCAT(v.first_name, ' ', v.last_name)) AS shop_name,
           v.account_status AS shop_status,
           COALESCE(CONCAT(rep.first_name, ' ', rep.last_name), 'Deleted account') AS reporter,
           CONCAT(a.first_name, ' ', a.last_name) AS handled_by_name,
           (SELECT COUNT(*) FROM reports r2
             WHERE r2.status = 'open' AND r2.vendor_id = r.vendor_id) AS open_about_shop
    FROM reports r
    INNER JOIN users v ON v.user_id = r.vendor_id
    LEFT JOIN product p ON p.product_id = r.product_id
    LEFT JOIN users rep ON rep.user_id = r.reporter_id
    LEFT JOIN users a ON a.user_id = r.handled_by
    ORDER BY (r.status = 'open') DESC, r.created_at DESC
    LIMIT 300
")->fetch_all(MYSQLI_ASSOC);

foreach ($reports as &$r) {
    $r["report_id"] = (int)$r["report_id"];
    $r["vendor_id"] = (int)$r["vendor_id"];
    $r["product_id"] = $r["product_id"] !== null ? (int)$r["product_id"] : null;
    $r["open_about_shop"] = (int)$r["open_about_shop"];
    $r["listing_hidden"] = $r["catalog_status"] !== null && (int)$r["catalog_status"] !== 3;
    $r["shop_suspended"] = (int)$r["shop_status"] !== 0;
    unset($r["catalog_status"], $r["shop_status"]);
}
unset($r);

echo json_encode(["success" => true, "reports" => $reports]);
