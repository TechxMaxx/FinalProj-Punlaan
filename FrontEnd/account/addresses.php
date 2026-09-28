<?php

/*
|--------------------------------------------------------------------------
| ADDRESS BOOK API
|--------------------------------------------------------------------------
|
| GET                                  → list the user's addresses
| POST {action: "save", address: {…}}  → add (no address_id) or edit
| POST {action: "delete", address_id}
| POST {action: "set_default", address_id}
|
*/

require_once __DIR__ . "/../../lib/session_boot.php";   // session + "Keep me signed in"

header("Content-Type: application/json");

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "logged_in" => false,
        "message" => "Please log in first."
    ]);

    exit;
}

require_once __DIR__ . "/../connection.php";
require_once __DIR__ . "/address_helpers.php";

$userId = (int) $_SESSION["user_id"];

const MAX_ADDRESSES = 10;
const NCR_REGION_CODE = "130000000";


function respond(array $data): void
{
    global $conn;

    echo json_encode($data);

    $conn->close();

    exit;
}


function listAddresses(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare("
        SELECT
            address_id, label, recipient_name, phone,
            region_code, region, province_code, province,
            city_code, city, barangay_code, barangay,
            street, postal_code, geo_lat, geo_lng, is_default
        FROM user_addresses
        WHERE user_id = ?
        ORDER BY is_default DESC, updated_at DESC
    ");

    $stmt->bind_param("i", $userId);
    $stmt->execute();

    $rows = [];

    foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
        $row["address_id"] = (int) $row["address_id"];
        $row["is_default"] = (int) $row["is_default"] === 1;
        $row["geo_lat"] = $row["geo_lat"] !== null ? (float) $row["geo_lat"] : null;
        $row["geo_lng"] = $row["geo_lng"] !== null ? (float) $row["geo_lng"] : null;
        $row["full_address"] = formatAddressLine($row);
        $rows[] = $row;
    }

    $stmt->close();

    return $rows;
}


/* Does this address belong to the logged-in user? */
function ownsAddress(mysqli $conn, int $userId, int $addressId): bool
{
    $stmt = $conn->prepare("
        SELECT 1 FROM user_addresses
        WHERE address_id = ? AND user_id = ?
    ");

    $stmt->bind_param("ii", $addressId, $userId);
    $stmt->execute();

    $found = $stmt->get_result()->num_rows > 0;

    $stmt->close();

    return $found;
}


function makeDefault(mysqli $conn, int $userId, int $addressId): void
{
    $stmt = $conn->prepare("
        UPDATE user_addresses
        SET is_default = (address_id = ?)
        WHERE user_id = ?
    ");

    $stmt->bind_param("ii", $addressId, $userId);
    $stmt->execute();
    $stmt->close();
}


/* ==========================================
   GET → LIST
========================================== */

if ($_SERVER["REQUEST_METHOD"] === "GET") {

    respond([
        "success" => true,
        "addresses" => listAddresses($conn, $userId)
    ]);
}


$input = json_decode(file_get_contents("php://input"), true) ?? [];
$action = $input["action"] ?? "";


/* ==========================================
   SAVE (ADD OR EDIT)
========================================== */

if ($action === "save") {

    $a = $input["address"] ?? [];

    $clean = function ($key, $max) use ($a) {
        return mb_substr(trim((string)($a[$key] ?? "")), 0, $max);
    };

    $addressId     = (int)($a["address_id"] ?? 0);
    $label         = $clean("label", 30) ?: "Home";
    $recipient     = $clean("recipient_name", 150);
    $phone         = preg_replace('/[\s\-()]/', '', (string)($a["phone"] ?? ""));
    $regionCode    = $clean("region_code", 12);
    $region        = $clean("region", 100);
    $provinceCode  = $clean("province_code", 12);
    $province      = $clean("province", 100);
    $cityCode      = $clean("city_code", 12);
    $city          = $clean("city", 100);
    $barangayCode  = $clean("barangay_code", 12);
    $barangay      = $clean("barangay", 100);
    $street        = $clean("street", 255);
    $postalCode    = $clean("postal_code", 10);
    $isDefault     = !empty($a["is_default"]);

    // Optional map pin — must be inside the Philippines
    $geoLat = is_numeric($a["geo_lat"] ?? null) ? round((float)$a["geo_lat"], 7) : null;
    $geoLng = is_numeric($a["geo_lng"] ?? null) ? round((float)$a["geo_lng"], 7) : null;

    if ($geoLat === null || $geoLng === null ||
        $geoLat < 4.0 || $geoLat > 21.5 || $geoLng < 116.0 || $geoLng > 127.0) {
        $geoLat = null;
        $geoLng = null;
    }


    /* ---------- Validation ---------- */

    $errors = [];

    if ($recipient === "") {
        $errors[] = "Enter the recipient's full name.";
    }

    if (!preg_match('/^(\+?63|0)9\d{9}$/', $phone)) {
        $errors[] = "Enter a valid mobile number, e.g. 0917 123 4567.";
    }

    if ($region === "" || $city === "" || $barangay === "") {
        $errors[] = "Select the region, city/municipality, and barangay.";
    }

    if ($regionCode !== NCR_REGION_CODE && $region !== "" && $province === "") {
        $errors[] = "Select the province.";
    }

    if ($street === "") {
        $errors[] = "Enter the house number, building, and street.";
    }

    if ($postalCode !== "" && !preg_match('/^\d{4}$/', $postalCode)) {
        $errors[] = "Postal code must be 4 digits.";
    }

    if ($errors) {
        respond(["success" => false, "message" => $errors[0], "errors" => $errors]);
    }

    if ($regionCode === NCR_REGION_CODE) {
        $provinceCode = "";
        $province = "";
    }


    /* ---------- Edit ---------- */

    if ($addressId > 0) {

        if (!ownsAddress($conn, $userId, $addressId)) {
            respond(["success" => false, "message" => "Address not found."]);
        }

        $stmt = $conn->prepare("
            UPDATE user_addresses SET
                label = ?, recipient_name = ?, phone = ?,
                region_code = ?, region = ?,
                province_code = NULLIF(?, ''), province = NULLIF(?, ''),
                city_code = ?, city = ?,
                barangay_code = ?, barangay = ?,
                street = ?, postal_code = NULLIF(?, ''),
                geo_lat = ?, geo_lng = ?
            WHERE address_id = ? AND user_id = ?
        ");

        $stmt->bind_param(
            "sssssssssssssddii",
            $label, $recipient, $phone,
            $regionCode, $region,
            $provinceCode, $province,
            $cityCode, $city,
            $barangayCode, $barangay,
            $street, $postalCode,
            $geoLat, $geoLng,
            $addressId, $userId
        );

        $stmt->execute();
        $stmt->close();


    /* ---------- Add ---------- */

    } else {

        $stmt = $conn->prepare("SELECT COUNT(*) AS n FROM user_addresses WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $count = (int) $stmt->get_result()->fetch_assoc()["n"];
        $stmt->close();

        if ($count >= MAX_ADDRESSES) {
            respond([
                "success" => false,
                "message" => "You can save up to " . MAX_ADDRESSES . " addresses. Delete one first."
            ]);
        }

        // The first address is always the default
        if ($count === 0) {
            $isDefault = true;
        }

        $stmt = $conn->prepare("
            INSERT INTO user_addresses (
                user_id, label, recipient_name, phone,
                region_code, region, province_code, province,
                city_code, city, barangay_code, barangay,
                street, postal_code, geo_lat, geo_lng
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, NULLIF(?, ''), NULLIF(?, ''),
                ?, ?, ?, ?,
                ?, NULLIF(?, ''), ?, ?
            )
        ");

        $stmt->bind_param(
            "isssssssssssssdd",
            $userId, $label, $recipient, $phone,
            $regionCode, $region, $provinceCode, $province,
            $cityCode, $city, $barangayCode, $barangay,
            $street, $postalCode, $geoLat, $geoLng
        );

        $stmt->execute();

        $addressId = $stmt->insert_id;

        $stmt->close();
    }


    if ($isDefault) {
        makeDefault($conn, $userId, $addressId);
    }

    syncDefaultAddress($conn, $userId);

    respond([
        "success" => true,
        "message" => "Address saved.",
        "address_id" => $addressId,
        "addresses" => listAddresses($conn, $userId)
    ]);
}


/* ==========================================
   DELETE
========================================== */

if ($action === "delete") {

    $addressId = (int)($input["address_id"] ?? 0);

    if (!ownsAddress($conn, $userId, $addressId)) {
        respond(["success" => false, "message" => "Address not found."]);
    }

    $stmt = $conn->prepare("DELETE FROM user_addresses WHERE address_id = ? AND user_id = ?");
    $stmt->bind_param("ii", $addressId, $userId);
    $stmt->execute();
    $stmt->close();

    // If the default was deleted, the most recently used address becomes default
    $stmt = $conn->prepare("
        SELECT address_id FROM user_addresses
        WHERE user_id = ?
        ORDER BY is_default DESC, updated_at DESC
        LIMIT 1
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $next = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($next) {
        $stmt = $conn->prepare("SELECT COUNT(*) AS n FROM user_addresses WHERE user_id = ? AND is_default = 1");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $hasDefault = (int) $stmt->get_result()->fetch_assoc()["n"] > 0;
        $stmt->close();

        if (!$hasDefault) {
            makeDefault($conn, $userId, (int) $next["address_id"]);
        }
    }

    syncDefaultAddress($conn, $userId);

    respond([
        "success" => true,
        "message" => "Address deleted.",
        "addresses" => listAddresses($conn, $userId)
    ]);
}


/* ==========================================
   SET DEFAULT
========================================== */

if ($action === "set_default") {

    $addressId = (int)($input["address_id"] ?? 0);

    if (!ownsAddress($conn, $userId, $addressId)) {
        respond(["success" => false, "message" => "Address not found."]);
    }

    makeDefault($conn, $userId, $addressId);
    syncDefaultAddress($conn, $userId);

    respond([
        "success" => true,
        "message" => "Default address updated.",
        "addresses" => listAddresses($conn, $userId)
    ]);
}


respond(["success" => false, "message" => "Unknown action."]);
