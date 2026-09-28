<?php

/*
|--------------------------------------------------------------------------
| NOTIFICATIONS + EMAILS
|--------------------------------------------------------------------------
|
|   notifyUser($conn, $userId, $title, $message, $link, $email);
|
| 1. Adds an in-app notification (bell icon / Notifications page).
| 2. Emails the user through Gmail SMTP (third_party/mail) — only
|    when email is set up in mail_config.php. Emails are sent after
|    the page has answered, so buttons stay fast.
|
| $link  page opened from the notification, relative to the project
|        root, e.g. "MyAccount/customer/MyOrders.html"
| $email true  = email the same title + message
|        false = in-app only
|        array = richer email: ["subject", "intro", "rows" => [[label, value]…],
|                "items" => [[name, qty, amount]…], "button" => "View order"]
|
| Sample accounts (…@test.com, customer@gmail.com, …) never get
| emails, so strangers who own those addresses aren't spammed.
|
*/

require_once __DIR__ . "/../third_party/mail/mailer.php";


function notifyUser(mysqli $conn, int $userId, string $title, string $message, ?string $link = null, $email = true): void
{
    try {
        $title = mb_substr($title, 0, 120);
        $message = mb_substr($message, 0, 500);

        $stmt = $conn->prepare("
            INSERT INTO notifications (title, message, audience, priority, kind, link, target_user_id)
            VALUES (?, ?, 'Specific', 'Info', 'system', ?, ?)
        ");
        $stmt->bind_param("sssi", $title, $message, $link, $userId);
        $stmt->execute();
        $notificationId = $stmt->insert_id;
        $stmt->close();

        $stmt = $conn->prepare("INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)");
        $stmt->bind_param("ii", $notificationId, $userId);
        $stmt->execute();
        $stmt->close();

    } catch (Throwable $e) {
        error_log("Punlaan notify: " . $e->getMessage());
    }

    if ($email === false || !mailIsConfigured()) {
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT email, first_name FROM users WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    } catch (Throwable $e) {
        return;
    }

    if (!$user || !filter_var($user["email"], FILTER_VALIDATE_EMAIL) || isSampleEmail($user["email"])) {
        return;
    }

    $options = is_array($email) ? $email : [];

    queueEmail(
        $user["email"],
        $user["first_name"] ?: "there",
        $options["subject"] ?? $title,
        $title,
        $options["intro"] ?? $message,
        $options,
        $link
    );
}


/* Accounts from the sample data — never emailed */
function isSampleEmail(string $email): bool
{
    $email = strtolower(trim($email));
    $domain = substr(strrchr($email, "@") ?: "", 1);

    if (in_array($domain, ["punlaan.com", "punlaan.test", "test.com", "example.com", "example.org"], true)) {
        return true;
    }

    return in_array($email, [
        "tes@gmail.com", "test@gmail.com", "ball@gmail.com", "bruh@gmail.com", "bro@gmail.com",
        "tester@gmail.com", "nathan@gmail.com", "customer@gmail.com", "example@gmail.com", "admin@gmail.com",
    ], true);
}


/* ---------- sending after the response ---------- */

function queueEmail(string $to, string $name, string $subject, string $heading, string $intro, array $options, ?string $link): void
{
    static $registered = false;

    $GLOBALS["punlaanMailQueue"][] = [
        "to" => $to,
        "name" => $name,
        "subject" => $subject,
        "html" => emailHtml($name, $heading, $intro, $options, $link),
        "text" => emailText($name, $heading, $intro, $options, $link)
    ];

    if (!$registered) {
        $registered = true;
        register_shutdown_function("sendQueuedEmails");
    }
}

function sendQueuedEmails(): void
{
    $queue = $GLOBALS["punlaanMailQueue"] ?? [];
    $GLOBALS["punlaanMailQueue"] = [];

    if (!$queue) return;

    // Finish the page for the visitor first, then talk to Gmail
    if (function_exists("fastcgi_finish_request")) {
        fastcgi_finish_request();
    } elseif (function_exists("litespeed_finish_request")) {
        litespeed_finish_request();
    }

    ignore_user_abort(true);
    @set_time_limit(90);

    foreach ($queue as $mail) {
        try {
            sendMail($mail["to"], $mail["name"], $mail["subject"], $mail["html"], $mail["text"]);
        } catch (Throwable $e) {
            error_log("Punlaan email to " . $mail["to"] . " failed: " . $e->getMessage());
        }
    }
}


/* ---------- email layout ---------- */

function emailUrl(?string $link): string
{
    return rtrim(APP_URL, "/") . "/" . ltrim((string)$link, "/");
}

function emailPeso($value): string
{
    return "₱" . number_format((float)$value, 2);
}

function emailHtml(string $name, string $heading, string $intro, array $o, ?string $link): string
{
    $e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, "UTF-8");

    $rows = "";
    foreach ($o["rows"] ?? [] as [$label, $value]) {
        $rows .= "<tr><td style='padding:6px 0;color:#6b7c72;font-size:14px'>{$e($label)}</td>"
               . "<td style='padding:6px 0;text-align:right;font-size:14px;font-weight:600;color:#1a1a1a'>{$e($value)}</td></tr>";
    }

    $items = "";
    foreach ($o["items"] ?? [] as [$itemName, $qty, $amount]) {
        $items .= "<tr><td style='padding:8px 0;border-bottom:1px solid #eef2ee;font-size:14px;color:#1a1a1a'>{$e($itemName)}"
                . " <span style='color:#6b7c72'>× {$e($qty)}</span></td>"
                . "<td style='padding:8px 0;border-bottom:1px solid #eef2ee;text-align:right;font-size:14px'>{$e(emailPeso($amount))}</td></tr>";
    }

    $button = $link
        ? "<p style='margin:26px 0 8px'><a href='{$e(emailUrl($link))}' style='background:#28512F;color:#ffffff;"
          . "text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block'>"
          . $e($o["button"] ?? "Open Punlaan") . "</a></p>"
        : "";

    return "<!doctype html><html><body style='margin:0;background:#f3f6f3;font-family:Arial,Helvetica,sans-serif'>"
        . "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background:#f3f6f3;padding:24px 12px'><tr><td align='center'>"
        . "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden'>"
        . "<tr><td style='background:#28512F;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:700'>🌿 Punlaan</td></tr>"
        . "<tr><td style='padding:26px 24px 10px'>"
        . "<p style='margin:0 0 6px;color:#6b7c72;font-size:14px'>Hi {$e($name)},</p>"
        . "<h1 style='margin:0 0 12px;font-size:21px;color:#1a1a1a'>{$e($heading)}</h1>"
        . "<p style='margin:0;font-size:15px;line-height:1.55;color:#333'>" . nl2br($e($intro)) . "</p>"
        . ($items ? "<table role='presentation' width='100%' style='margin-top:18px;border-collapse:collapse'>$items</table>" : "")
        . ($rows ? "<table role='presentation' width='100%' style='margin-top:14px;border-collapse:collapse'>$rows</table>" : "")
        . $button
        . "</td></tr>"
        . "<tr><td style='padding:18px 24px 24px;color:#8a9a90;font-size:12px;line-height:1.5'>"
        . "You're getting this because you have an account on Punlaan, the green market. "
        . "This is an automatic message — reply in the Punlaan Messages page instead."
        . "</td></tr></table></td></tr></table></body></html>";
}

function emailText(string $name, string $heading, string $intro, array $o, ?string $link): string
{
    $text = "Hi $name,\n\n$heading\n\n$intro\n";

    foreach ($o["items"] ?? [] as [$itemName, $qty, $amount]) {
        $text .= "\n- $itemName x $qty  " . emailPeso($amount);
    }
    foreach ($o["rows"] ?? [] as [$label, $value]) {
        $text .= "\n$label: $value";
    }
    if ($link) {
        $text .= "\n\n" . ($o["button"] ?? "Open Punlaan") . ": " . emailUrl($link);
    }

    return $text . "\n\n— Punlaan\n";
}
