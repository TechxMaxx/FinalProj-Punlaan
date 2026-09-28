<?php

/*
|--------------------------------------------------------------------------
| MARKETPLACE SETTINGS (settings table)
|--------------------------------------------------------------------------
|
| Edited by the admin in Settings → Marketplace rules.
| The defaults below are used until the table has a value.
|
|   $fee = (float)setting($conn, "shipping_base");
|
*/

const SETTING_DEFAULTS = [
    // Shipping by size (lib/shipping.php): first item / each extra / cap on extras (0 = no cap)
    "ship_small_first" => "25",
    "ship_small_extra" => "5",
    "ship_small_cap" => "50",
    "ship_medium_first" => "45",
    "ship_medium_extra" => "12",
    "ship_medium_cap" => "120",
    "ship_large_first" => "70",
    "ship_large_extra" => "25",
    "ship_large_cap" => "0",
    // + once per seller, by how far the buyer is
    "ship_zone_city" => "0",
    "ship_zone_province" => "15",
    "ship_zone_region" => "30",
    "ship_zone_island" => "50",
    "ship_zone_far" => "90",
    "commission_percent" => "5",
    "return_days" => "7",
    "min_payout" => "100",
];

function allSettings(mysqli $conn): array
{
    static $cache = null;

    if ($cache !== null) {
        return $cache;
    }

    $cache = SETTING_DEFAULTS;

    try {
        $result = $conn->query("SELECT setting_key, setting_value FROM settings");
        while ($row = $result->fetch_assoc()) {
            $cache[$row["setting_key"]] = $row["setting_value"];
        }
    } catch (Throwable $e) {
        // table not created yet — defaults
    }

    return $cache;
}

function setting(mysqli $conn, string $key): string
{
    return (string)(allSettings($conn)[$key] ?? SETTING_DEFAULTS[$key] ?? "");
}
