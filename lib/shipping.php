<?php

/*
|--------------------------------------------------------------------------
| SHIPPING FEE — by item size + how far the buyer is
|--------------------------------------------------------------------------
|
| Every seller in an order ships one parcel, so each seller has its own
| fee (the buyer pays the sum):
|
|   fee = first-item fee of the biggest item
|       + a small extra for every other item   (extras capped per size)
|       + a zone add-on, once per parcel
|
| Size tier comes from the product's subcategory (Admin → Categories);
| a subcategory without its own tier uses its main category's tier.
|
|             first   each extra   cap on extras
|   small      ₱25       +₱5          ₱50        seedlings, succulents
|   medium     ₱45       +₱12         ₱120       bushes, foliage, supplies
|   large      ₱70       +₱25         no cap     saplings
|
|   zone: same city ₱0 · same province ₱15 · same region ₱30 ·
|         same island group ₱50 · another island group ₱90
|   (Metro Manila counts as one province.)
|
| A seller can offer free shipping above an amount (Storefront →
| "Free shipping on orders from ₱…"): their parcel is then ₱0.
|
| All amounts: Admin → Settings → Marketplace rules.
|
*/

require_once __DIR__ . "/settings.php";

const NCR_REGION_CODE = "130000000";   // Metro Manila (PSGC)
const SIZE_TIERS = ["small", "medium", "large"];
const SIZE_TIER_LABELS = ["small" => "Small", "medium" => "Medium", "large" => "Large"];

// First two digits of the PSGC region code → island group
const ISLAND_GROUPS = [
    "luzon" => ["01", "02", "03", "04", "05", "13", "14", "17"],
    "visayas" => ["06", "07", "08", "18"],
    "mindanao" => ["09", "10", "11", "12", "15", "16", "19"],
];

const ZONE_LABELS = [
    "city" => "Same city",
    "province" => "Same province",
    "region" => "Same region",
    "island" => "Same island group",
    "far" => "Other island group",
];


/* "Imus, Cavite" — city + province (or region when there's no province) */
function placeLabel(?string $city, ?string $province, ?string $region = null): string
{
    $city = trim((string)$city);
    $second = trim((string)($province ?: $region));

    // Metro Manila: just the city ("Quezon City", "Pasig") — never the street
    if (!$province && preg_match('/NCR|National Capital/i', $second)) {
        $second = "";
    } elseif (!$province) {
        // "Region IV-A – CALABARZON" → "CALABARZON"
        $second = trim(preg_replace('/^.*[–-]\s*/u', '', $second)) ?: $second;
    }

    // "City of Imus" → "Imus"
    $city = preg_replace('/^City of\s+/i', '', $city);

    return trim($city . ($city && $second ? ", " : "") . $second, ", ");
}


/*
 * Where a seller ships from + their free-shipping minimum.
 * Returns [label, region_code, province_code, city_code, free_min]
 */
function shopLocation(mysqli $conn, int $vendorId): array
{
    static $cache = [];

    if (isset($cache[$vendorId])) {
        return $cache[$vendorId];
    }

    $stmt = $conn->prepare("
        SELECT u.shop_region_code, u.shop_region, u.shop_province_code, u.shop_province,
               u.shop_city_code, u.shop_city, u.free_ship_min,
               a.region_code, a.region, a.province_code, a.province, a.city_code, a.city
        FROM users u
        LEFT JOIN user_addresses a ON a.user_id = u.user_id AND a.is_default = 1
        WHERE u.user_id = ?
        LIMIT 1
    ");
    $stmt->bind_param("i", $vendorId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc() ?: [];
    $stmt->close();

    // Shop location from Storefront, else the seller's default address
    $prefix = !empty($row["shop_city"]) ? "shop_" : "";

    return $cache[$vendorId] = [
        "label" => placeLabel($row[$prefix . "city"] ?? null, $row[$prefix . "province"] ?? null, $row[$prefix . "region"] ?? null),
        "region_code" => $row[$prefix . "region_code"] ?? null,
        "province_code" => $row[$prefix . "province_code"] ?? null,
        "city_code" => $row[$prefix . "city_code"] ?? null,
        "free_min" => isset($row["free_ship_min"]) && (float)$row["free_ship_min"] > 0 ? (float)$row["free_ship_min"] : null,
    ];
}


/* How far the buyer is from the shop: city | province | region | island | far */
function shippingZone(array $shop, array $address): string
{
    $same = fn($key) => !empty($shop[$key]) && !empty($address[$key]) && $shop[$key] === $address[$key];

    if (!$shop["region_code"]) return "region";          // seller hasn't set a location yet
    if ($same("city_code")) return "city";
    if ($same("province_code")) return "province";
    if ($same("region_code")) {
        return $address["region_code"] === NCR_REGION_CODE ? "province" : "region";
    }

    $group = function ($code) {
        foreach (ISLAND_GROUPS as $name => $prefixes) {
            if (in_array(substr((string)$code, 0, 2), $prefixes, true)) return $name;
        }
        return null;
    };

    $a = $group($shop["region_code"]);
    return $a !== null && $a === $group($address["region_code"] ?? "") ? "island" : "far";
}


/*
 * Size tier of each product (small | medium | large), from its
 * subcategory, else its main category, else medium.
 * $productIds → [product_id => tier]
 */
function productTiers(mysqli $conn, array $productIds): array
{
    $productIds = array_values(array_unique(array_map("intval", $productIds)));
    if (!$productIds) return [];

    $marks = implode(",", array_fill(0, count($productIds), "?"));
    $stmt = $conn->prepare("
        SELECT p.product_id, sub.size_tier AS sub_tier, main.size_tier AS main_tier
        FROM product p
        LEFT JOIN categories main ON main.parent_id IS NULL AND main.name = p.category
        LEFT JOIN categories sub ON sub.parent_id = main.category_id AND sub.name = p.subcategory
        WHERE p.product_id IN ($marks)
    ");
    $stmt->bind_param(str_repeat("i", count($productIds)), ...$productIds);
    $stmt->execute();

    $tiers = [];
    foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
        $tier = $row["sub_tier"] ?: $row["main_tier"] ?: "medium";
        $tiers[(int)$row["product_id"]] = in_array($tier, SIZE_TIERS, true) ? $tier : "medium";
    }
    $stmt->close();

    return $tiers;
}


/*
 * Fee for one seller's parcel → one delivery address (user_addresses row).
 * $lines: that seller's items → [[product_id, quantity, total], …]
 *
 * Returns [fee, zone, zone_label, from, free, free_min, add_for_free, items_fee, zone_fee]
 */
function shippingQuote(mysqli $conn, int $vendorId, array $address, array $lines): array
{
    $s = allSettings($conn);
    $shop = shopLocation($conn, $vendorId);
    $tiers = productTiers($conn, array_column($lines, 0));

    // Units per size
    $units = array_fill_keys(SIZE_TIERS, 0);
    $subtotal = 0.0;
    foreach ($lines as [$productId, $quantity, $total]) {
        $units[$tiers[(int)$productId] ?? "medium"] += max(1, (int)$quantity);
        $subtotal += (float)$total;
    }

    // The biggest item pays the "first item" fee; everything else adds its extra
    $biggest = null;
    foreach (array_reverse(SIZE_TIERS) as $tier) {
        if ($units[$tier] > 0) { $biggest = $tier; break; }
    }

    $itemsFee = 0.0;
    if ($biggest) {
        $itemsFee = (float)$s["ship_{$biggest}_first"];
        foreach (SIZE_TIERS as $tier) {
            $extraUnits = $units[$tier] - ($tier === $biggest ? 1 : 0);
            if ($extraUnits <= 0) continue;
            $extra = $extraUnits * (float)$s["ship_{$tier}_extra"];
            $cap = (float)$s["ship_{$tier}_cap"];
            $itemsFee += $cap > 0 ? min($cap, $extra) : $extra;
        }
    }

    $zone = shippingZone($shop, $address);
    $zoneFee = (float)$s["ship_zone_$zone"];
    $fee = (float)ceil($itemsFee + $zoneFee);

    // Seller's free-shipping offer
    $free = $shop["free_min"] !== null && $subtotal >= $shop["free_min"];

    return [
        "fee" => $free ? 0.0 : $fee,
        "zone" => $zone,
        "zone_label" => ZONE_LABELS[$zone],
        "from" => $shop["label"] ?: "Seller's location not set",
        "free" => $free,
        "free_min" => $shop["free_min"],
        "add_for_free" => $shop["free_min"] !== null && !$free ? round($shop["free_min"] - $subtotal, 2) : null,
        "items_fee" => $itemsFee,
        "zone_fee" => $zoneFee,
        "regular_fee" => $fee,
    ];
}
