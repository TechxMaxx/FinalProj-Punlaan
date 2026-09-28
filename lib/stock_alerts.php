<?php

/*
|--------------------------------------------------------------------------
| LOW-STOCK ALERTS FOR SELLERS
|--------------------------------------------------------------------------
|
|   stockDropped($conn, $productId, $soldQuantity)
|       Call after a sale lowered the stock (the stock is already saved).
|       The seller hears about it once when the stock drops to
|       LOW_STOCK_LIMIT or below, and again when it sells out, so they
|       aren't told on every single order.
|
*/

require_once __DIR__ . "/notify.php";

const LOW_STOCK_LIMIT = 5;

function stockDropped(mysqli $conn, int $productId, int $soldQuantity): void
{
    $stmt = $conn->prepare("SELECT user_id, product_name, stock FROM product WHERE product_id = ?");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $product = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$product) return;

    $after = (int)$product["stock"];
    $before = $after + $soldQuantity;
    $name = $product["product_name"];
    $link = "MyAccount/vendor/Inventory.html?product=$productId";

    if ($after <= 0 && $before > 0) {
        notifyUser($conn, (int)$product["user_id"], "Sold out: $name",
            "$name just sold out, so buyers can't order it anymore. Add stock in Inventory to sell it again.",
            $link, ["subject" => "$name is sold out", "button" => "Open Inventory"]);
        return;
    }

    if ($after <= LOW_STOCK_LIMIT && $before > LOW_STOCK_LIMIT) {
        notifyUser($conn, (int)$product["user_id"], "Low stock: $name",
            "Only $after left of $name. Add stock in Inventory before it sells out.",
            $link, ["subject" => "Only $after left: $name", "button" => "Open Inventory"]);
    }
}
