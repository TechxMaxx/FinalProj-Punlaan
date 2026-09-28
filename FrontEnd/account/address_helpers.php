<?php

/*
|--------------------------------------------------------------------------
| ADDRESS HELPERS
|--------------------------------------------------------------------------
|
| Shared by account/addresses.php and Checkout/place_order.php.
|
*/


/*
 * One-line address, e.g.
 * "Blk 1 Lot 2 Mabini St., Brgy. Alicia, Quezon City, Metro Manila 1105"
 */
function formatAddressLine(array $a): string
{
    $parts = array_filter([
        trim((string)($a["street"] ?? "")),
        !empty($a["barangay"]) ? "Brgy. " . $a["barangay"] : "",
        $a["city"] ?? "",
        $a["province"] ?? "",
        // NCR has no province: show "Metro Manila" (other regions: the region name)
        empty($a["province"])
            ? (($a["region_code"] ?? "") === "130000000" ? "Metro Manila" : ($a["region"] ?? ""))
            : "",
    ]);

    $line = implode(", ", $parts);

    if (!empty($a["postal_code"])) {
        $line .= " " . $a["postal_code"];
    }

    return $line;
}


/*
 * Keep users.address equal to the default address, because older
 * pages (admin, vendor order views) still read that column.
 */
function syncDefaultAddress(mysqli $conn, int $userId): void
{
    $stmt = $conn->prepare("
        SELECT *
        FROM user_addresses
        WHERE user_id = ? AND is_default = 1
        LIMIT 1
    ");

    $stmt->bind_param("i", $userId);
    $stmt->execute();

    $default = $stmt->get_result()->fetch_assoc();

    $stmt->close();

    $line = $default ? formatAddressLine($default) : null;

    $stmt = $conn->prepare("UPDATE users SET address = ? WHERE user_id = ?");
    $stmt->bind_param("si", $line, $userId);
    $stmt->execute();
    $stmt->close();
}
