<?php

/*
|--------------------------------------------------------------------------
| SELLER STOREFRONT
|--------------------------------------------------------------------------
|
| GET                         → the seller's store details
| POST action=save            → store_name, store_description, links[] (JSON),
|                               shop location: region/province/city (+ codes),
|                               lat/lng = the city's map point (for shipping)
| POST action=banner  (file)  → upload / replace the cover photo
| POST action=remove_banner   → remove the cover photo
|
| The shop logo is the seller's profile photo (Profile → photo).
| Everything here is what customers see on FrontEnd/SHOP.html.
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "logged_in" => false, "message" => "Please log in first."]);
    exit;
}

require_once __DIR__ . "/../../FrontEnd/connection.php";
require_once __DIR__ . "/../customer_php/upload_helpers.php";
require_once __DIR__ . "/../../lib/shipping.php";

$userId = (int)$_SESSION["user_id"];

const MAX_LINKS = 6;


function loadStore(mysqli $conn, int $userId): ?array
{
    $stmt = $conn->prepare("
        SELECT user_id, first_name, last_name, email, store_name, store_description,
               store_banner, store_links, profile_picture, is_vendor, verification_status,
               shop_region_code, shop_region, shop_province_code, shop_province,
               shop_city_code, shop_city, shop_lat, shop_lng, free_ship_min
        FROM users WHERE user_id = ?
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ?: null;
}

function storeJson(array $row, mysqli $conn): array
{
    $links = json_decode($row["store_links"] ?? "[]", true);

    $stmt = $conn->prepare("
        SELECT
            COUNT(*) AS total,
            SUM(status = 1 AND catalog_status = 3 AND stock > 0) AS live
        FROM product WHERE user_id = ? AND status <> 3
    ");
    $stmt->bind_param("i", $row["user_id"]);
    $stmt->execute();
    $counts = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Shop location; if never set, suggest the seller's default address (city only)
    $location = [
        "region_code" => $row["shop_region_code"],
        "region" => $row["shop_region"],
        "province_code" => $row["shop_province_code"],
        "province" => $row["shop_province"],
        "city_code" => $row["shop_city_code"],
        "city" => $row["shop_city"],
        "lat" => $row["shop_lat"] !== null ? (float)$row["shop_lat"] : null,
        "lng" => $row["shop_lng"] !== null ? (float)$row["shop_lng"] : null,
        "saved" => !empty($row["shop_city"]),
    ];

    if (!$location["saved"]) {
        $stmt = $conn->prepare("
            SELECT region_code, region, province_code, province, city_code, city
            FROM user_addresses
            WHERE user_id = ? AND city_code IS NOT NULL
            ORDER BY is_default DESC, address_id
            LIMIT 1
        ");
        $stmt->bind_param("i", $row["user_id"]);
        $stmt->execute();
        $suggested = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($suggested) {
            $location = array_merge($location, $suggested);
        }
    }

    return [
        "vendor_id" => (int)$row["user_id"],
        "owner_name" => trim($row["first_name"] . " " . $row["last_name"]),
        "store_name" => $row["store_name"] ?? "",
        "store_description" => $row["store_description"] ?? "",
        "store_banner" => $row["store_banner"],
        "profile_picture" => $row["profile_picture"],
        "links" => is_array($links) ? array_values($links) : [],
        "location" => $location,
        // "Imus, Cavite" — also the default location of new products
        "location_label" => $location["saved"] ? placeLabel($location["city"], $location["province"], $location["region"]) : "",
        // Free shipping for orders from this amount (null = off)
        "free_ship_min" => $row["free_ship_min"] !== null ? (float)$row["free_ship_min"] : null,
        "approved" => (int)$row["verification_status"] === 2,
        "products_total" => (int)$counts["total"],
        "products_live" => (int)$counts["live"]
    ];
}

$store = loadStore($conn, $userId);

if (!$store || (int)$store["is_vendor"] !== 1) {
    echo json_encode(["success" => false, "message" => "Only sellers have a storefront."]);
    exit;
}


/* ---------- GET: current store ---------- */

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => true, "store" => storeJson($store, $conn)]);
    exit;
}

$action = $_POST["action"] ?? "";


/* ---------- Save details + links ---------- */

if ($action === "save") {

    $name = trim((string)($_POST["store_name"] ?? ""));
    $description = trim((string)($_POST["store_description"] ?? ""));
    $rawLinks = json_decode((string)($_POST["links"] ?? "[]"), true);

    if ($name === "" || mb_strlen($name) > 100) {
        echo json_encode(["success" => false, "message" => "Enter a store name (up to 100 characters)."]);
        exit;
    }

    if (mb_strlen($description) > 1000) {
        echo json_encode(["success" => false, "message" => "About your store can be up to 1000 characters."]);
        exit;
    }

    $links = [];

    foreach (is_array($rawLinks) ? $rawLinks : [] as $link) {
        $link = trim((string)$link);
        if ($link === "") continue;

        // Allow "facebook.com/myshop" without https://
        if (!preg_match('~^https?://~i', $link)) {
            $link = "https://" . $link;
        }

        $host = parse_url($link, PHP_URL_HOST);

        if (
            strlen($link) > 255 ||
            !filter_var($link, FILTER_VALIDATE_URL) ||
            !$host || strpos($host, ".") === false
        ) {
            echo json_encode(["success" => false, "message" => "This doesn't look like a web link: " . mb_substr($link, 0, 60)]);
            exit;
        }

        if (!in_array($link, $links, true)) {
            $links[] = $link;
        }
    }

    if (count($links) > MAX_LINKS) {
        echo json_encode(["success" => false, "message" => "You can add up to " . MAX_LINKS . " links."]);
        exit;
    }

    $linksJson = json_encode($links, JSON_UNESCAPED_SLASHES);

    // Free shipping from ₱… (blank / 0 = off). The seller pays that shipping.
    $freeRaw = trim((string)($_POST["free_ship_min"] ?? ""));
    $freeMin = null;

    if ($freeRaw !== "" && (float)$freeRaw > 0) {
        if (!is_numeric($freeRaw) || (float)$freeRaw > 1000000) {
            echo json_encode(["success" => false, "message" => "Enter the free-shipping amount in pesos, e.g. 500."]);
            exit;
        }
        $freeMin = round((float)$freeRaw, 2);
    }

    $stmt = $conn->prepare("UPDATE users SET store_name = ?, store_description = ?, store_links = ?, free_ship_min = ? WHERE user_id = ?");
    $stmt->bind_param("sssdi", $name, $description, $linksJson, $freeMin, $userId);
    $stmt->execute();
    $stmt->close();

    // Shop location (city + province only — never the street address)
    $loc = json_decode((string)($_POST["location"] ?? ""), true);

    if (is_array($loc) && trim((string)($loc["city"] ?? "")) !== "") {

        $clean = fn($key, $max = 100) => mb_substr(trim((string)($loc[$key] ?? "")), 0, $max) ?: null;
        $code = fn($key) => preg_match('/^\d{6,12}$/', (string)($loc[$key] ?? "")) ? (string)$loc[$key] : null;

        $lat = is_numeric($loc["lat"] ?? null) ? (float)$loc["lat"] : null;
        $lng = is_numeric($loc["lng"] ?? null) ? (float)$loc["lng"] : null;

        // Only map points inside the Philippines
        if ($lat === null || $lng === null || $lat < 4 || $lat > 22 || $lng < 116 || $lng > 127.5) {
            $lat = $lng = null;
        }

        if (!$code("city_code") || !$code("region_code")) {
            echo json_encode(["success" => false, "message" => "Choose your shop's region and city from the lists."]);
            exit;
        }

        $regionCode = $code("region_code");
        $region = $clean("region");
        $provinceCode = $code("province_code");
        $province = $clean("province");
        $cityCode = $code("city_code");
        $city = $clean("city");

        $stmt = $conn->prepare("
            UPDATE users
            SET shop_region_code = ?, shop_region = ?, shop_province_code = ?, shop_province = ?,
                shop_city_code = ?, shop_city = ?, shop_lat = ?, shop_lng = ?
            WHERE user_id = ?
        ");
        $stmt->bind_param("ssssssddi", $regionCode, $region, $provinceCode, $province, $cityCode, $city, $lat, $lng, $userId);
        $stmt->execute();
        $stmt->close();
    }

    $_SESSION["store_name"] = $name;

    echo json_encode([
        "success" => true,
        "message" => "Storefront saved.",
        "store" => storeJson(loadStore($conn, $userId), $conn)
    ]);
    exit;
}


/* ---------- Cover photo ---------- */

if ($action === "banner") {

    try {
        $path = saveUpload($_FILES["banner"] ?? [], "banners", UPLOAD_TYPES_IMAGE, 3 * 1048576);
    } catch (RuntimeException $e) {
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
        exit;
    }

    $stmt = $conn->prepare("UPDATE users SET store_banner = ? WHERE user_id = ?");
    $stmt->bind_param("si", $path, $userId);
    $stmt->execute();
    $stmt->close();

    deleteUpload($store["store_banner"]);

    echo json_encode(["success" => true, "message" => "Cover photo updated.", "store_banner" => $path]);
    exit;
}

if ($action === "remove_banner") {

    $stmt = $conn->prepare("UPDATE users SET store_banner = NULL WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();

    deleteUpload($store["store_banner"]);

    echo json_encode(["success" => true, "message" => "Cover photo removed."]);
    exit;
}

echo json_encode(["success" => false, "message" => "Unknown action."]);
