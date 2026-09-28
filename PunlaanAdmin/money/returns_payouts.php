<?php

/*
|--------------------------------------------------------------------------
| ADMIN: DISPUTES + SELLER PAYOUTS
|--------------------------------------------------------------------------
|
| GET → disputes waiting for a decision, recent returns, payouts
|
| POST JSON
|   {action: "decide", return_id, decision: "refund" | "close", note}
|       refund = the buyer gets the money back · close = the seller keeps it
|   {action: "payout_paid", payout_id, reference}   money was sent
|   {action: "payout_reject", payout_id, note}      declined (amount goes back to the balance)
|
| The admin only steps in when buyer and seller disagree, and to send
| the payouts sellers ask for (payouts: Super Admins only).
|
*/

require_once __DIR__ . "/../admin_auth.php";
require_once __DIR__ . "/../connection.php";
require_once __DIR__ . "/../../lib/returns.php";

header("Content-Type: application/json");
header("Cache-Control: no-store");

const PAYOUT_METHOD_NAMES = ["gcash" => "GCash", "maya" => "Maya", "bank" => "Bank transfer"];


if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $input = json_decode(file_get_contents("php://input"), true) ?? [];
    $action = $input["action"] ?? "";
    $note = mb_substr(trim((string)($input["note"] ?? "")), 0, 1000);

    /* ---------- decide a dispute ---------- */

    if ($action === "decide") {

        $return = loadReturn($conn, (int)($input["return_id"] ?? 0));

        if (!$return || $return["status"] !== "disputed") {
            echo json_encode(["success" => false, "message" => "This dispute was already decided."]);
            exit;
        }

        if (mb_strlen($note) < 5) {
            echo json_encode(["success" => false, "message" => "Write a short reason — both the buyer and seller will see it."]);
            exit;
        }

        if (($input["decision"] ?? "") === "refund") {
            try {
                $message = refundReturn($conn, $return, "admin", $note);
            } catch (Throwable $e) {
                echo json_encode(["success" => false, "message" => "The refund couldn't be sent: " . $e->getMessage()]);
                exit;
            }
            echo json_encode(["success" => true, "message" => $message]);
            exit;
        }

        closeReturn($conn, $return, $note);
        echo json_encode(["success" => true, "message" => "Dispute closed. The seller keeps the payment."]);
        exit;
    }

    /* ---------- payouts ---------- */

    if ($action === "payout_paid" || $action === "payout_reject") {

        // Sending money is for Super Admins only
        requireSuperAdmin($conn);

        $payoutId = (int)($input["payout_id"] ?? 0);

        $stmt = $conn->prepare("SELECT * FROM payouts WHERE payout_id = ? AND status = 'requested'");
        $stmt->bind_param("i", $payoutId);
        $stmt->execute();
        $payout = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$payout) {
            echo json_encode(["success" => false, "message" => "This payout was already handled."]);
            exit;
        }

        $amount = "₱" . number_format((float)$payout["amount"], 2);
        $to = PAYOUT_METHOD_NAMES[$payout["method"]] ?? $payout["method"];

        if ($action === "payout_paid") {

            $reference = mb_substr(trim((string)($input["reference"] ?? "")), 0, 100);

            if ($reference === "") {
                echo json_encode(["success" => false, "message" => "Enter the transfer reference number."]);
                exit;
            }

            $stmt = $conn->prepare("UPDATE payouts SET status = 'paid', reference = ?, processed_at = NOW() WHERE payout_id = ?");
            $stmt->bind_param("si", $reference, $payoutId);
            $stmt->execute();
            $stmt->close();

            notifyUser($conn, (int)$payout["vendor_id"], "Payout sent",
                "$amount was sent to your $to account ending in " . substr($payout["account_number"], -4) . ". Reference: $reference.",
                "MyAccount/vendor/Sales.html", ["subject" => "Your payout of $amount was sent", "button" => "View payouts"]);

            echo json_encode(["success" => true, "message" => "Marked as sent. The seller was notified."]);
            exit;
        }

        if (mb_strlen($note) < 5) {
            echo json_encode(["success" => false, "message" => "Tell the seller why (e.g. the account name doesn't match)."]);
            exit;
        }

        $stmt = $conn->prepare("UPDATE payouts SET status = 'rejected', admin_note = ?, processed_at = NOW() WHERE payout_id = ?");
        $stmt->bind_param("si", $note, $payoutId);
        $stmt->execute();
        $stmt->close();

        notifyUser($conn, (int)$payout["vendor_id"], "Payout declined",
            "Your $amount payout request was declined: $note The amount is back in your balance — you can request again.",
            "MyAccount/vendor/Sales.html", ["subject" => "About your payout request", "button" => "View payouts"]);

        echo json_encode(["success" => true, "message" => "Payout declined. The seller was notified."]);
        exit;
    }

    echo json_encode(["success" => false, "message" => "Unknown action."]);
    exit;
}


/* ---------- lists ---------- */

$returns = $conn->query("
    SELECT rr.return_id, rr.reason, rr.details, rr.photo, rr.refund_amount, rr.status,
           rr.seller_note, rr.dispute_note, rr.admin_note, rr.refund_method, rr.created_at, rr.resolved_at,
           oi.product_name, oi.quantity, o.order_number, o.payment_method,
           CONCAT(c.first_name, ' ', c.last_name) AS customer,
           COALESCE(NULLIF(v.store_name, ''), CONCAT(v.first_name, ' ', v.last_name)) AS vendor
    FROM return_requests rr
    INNER JOIN order_items oi ON oi.order_item_id = rr.order_item_id
    INNER JOIN orders o ON o.order_id = rr.order_id
    INNER JOIN users c ON c.user_id = rr.customer_id
    INNER JOIN users v ON v.user_id = rr.vendor_id
    ORDER BY (rr.status = 'disputed') DESC, rr.updated_at DESC
    LIMIT 200
")->fetch_all(MYSQLI_ASSOC);

foreach ($returns as &$r) {
    $r["return_id"] = (int)$r["return_id"];
    $r["refund_amount"] = (float)$r["refund_amount"];
    $r["status_label"] = RETURN_STATUS_LABELS[$r["status"]] ?? $r["status"];
}
unset($r);

// Moderators handle disputes only — no payout details
$canPayouts = currentAdminIsSuperAdmin($conn);

$payouts = !$canPayouts ? [] : $conn->query("
    SELECT p.payout_id, p.amount, p.method, p.account_name, p.account_number, p.status, p.reference,
           p.admin_note, p.requested_at, p.processed_at,
           COALESCE(NULLIF(v.store_name, ''), CONCAT(v.first_name, ' ', v.last_name)) AS vendor
    FROM payouts p
    INNER JOIN users v ON v.user_id = p.vendor_id
    ORDER BY (p.status = 'requested') DESC, p.requested_at DESC
    LIMIT 200
")->fetch_all(MYSQLI_ASSOC);

foreach ($payouts as &$p) {
    $p["payout_id"] = (int)$p["payout_id"];
    $p["amount"] = (float)$p["amount"];
    $p["method_label"] = PAYOUT_METHOD_NAMES[$p["method"]] ?? $p["method"];
}
unset($p);

echo json_encode(["success" => true, "returns" => $returns, "payouts" => $payouts, "can_payouts" => $canPayouts]);
