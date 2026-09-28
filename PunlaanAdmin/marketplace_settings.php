<?php

/*
|--------------------------------------------------------------------------
| ADMIN: MARKETPLACE RULES (settings table)
|--------------------------------------------------------------------------
|
| GET                → current values
| POST JSON {ship_small_first … ship_zone_far (see lib/shipping.php),
|            commission_percent, return_days, min_payout}
|
| New values apply to NEW orders. Orders already placed keep their
| shipping fee and commission rate.
|
*/

require_once __DIR__ . "/admin_auth.php";
require_once __DIR__ . "/connection.php";
require_once __DIR__ . "/../lib/settings.php";
require_once __DIR__ . "/../third_party/paymongo/paymongo_config.php";
require_once __DIR__ . "/../third_party/mail/mail_config.php";

header("Content-Type: application/json");

// Moderators can't see or change the marketplace rules
requireSuperAdmin($conn);

// key => [label, min, max]
const RULES = [
    "ship_small_first" => ["Small items: first item", 0, 2000],
    "ship_small_extra" => ["Small items: each extra", 0, 1000],
    "ship_small_cap" => ["Small items: extras cap", 0, 5000],
    "ship_medium_first" => ["Medium items: first item", 0, 2000],
    "ship_medium_extra" => ["Medium items: each extra", 0, 1000],
    "ship_medium_cap" => ["Medium items: extras cap", 0, 5000],
    "ship_large_first" => ["Large items: first item", 0, 2000],
    "ship_large_extra" => ["Large items: each extra", 0, 1000],
    "ship_large_cap" => ["Large items: extras cap", 0, 5000],
    "ship_zone_city" => ["Same city add-on", 0, 2000],
    "ship_zone_province" => ["Same province add-on", 0, 2000],
    "ship_zone_region" => ["Same region add-on", 0, 2000],
    "ship_zone_island" => ["Same island group add-on", 0, 2000],
    "ship_zone_far" => ["Other island group add-on", 0, 2000],
    "commission_percent" => ["Commission", 0, 50],
    "return_days" => ["Return period (days)", 0, 60],
    "min_payout" => ["Smallest payout", 0, 10000],
];

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $input = json_decode(file_get_contents("php://input"), true) ?? [];
    $values = [];

    foreach (RULES as $key => [$label, $min, $max]) {
        if (!isset($input[$key]) || !is_numeric($input[$key])) {
            echo json_encode(["success" => false, "message" => "$label must be a number."]);
            exit;
        }
        $value = round((float)$input[$key], 2);
        if ($value < $min || $value > $max) {
            echo json_encode(["success" => false, "message" => "$label must be between $min and $max."]);
            exit;
        }
        $values[$key] = $key === "return_days" ? (string)(int)$value : (string)$value;
    }


    $stmt = $conn->prepare("
        INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ");
    foreach ($values as $key => $value) {
        $stmt->bind_param("ss", $key, $value);
        $stmt->execute();
    }
    $stmt->close();

    echo json_encode(["success" => true, "message" => "Marketplace rules saved. They apply to new orders."]);
    exit;
}

echo json_encode([
    "success" => true,
    "settings" => allSettings($conn),
    "services" => [
        "paymongo" => paymongoIsConfigured() ? (paymongoIsLive() ? "live" : "test") : "off",
        "email" => mailIsConfigured() ? "on" : "off",
    ],
]);
