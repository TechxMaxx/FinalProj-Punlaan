<?php

/*
|--------------------------------------------------------------------------
| PUNLAAN MOBILE APP API  —  <site>/api/?r=<route>
|--------------------------------------------------------------------------
|
| The app talks to the SAME database as the website, through the SAME
| PHP files: each route below runs one of the website's endpoints, so
| prices, shipping, stock, notifications and emails always follow the
| website's rules. Full list + examples: api/README.md
|
| Sign in with POST auth/login → { token }. Send the token on every
| request:  Authorization: Bearer <token>
|
| For a signed-in token the website's session ($_SESSION["user_id"] …)
| is filled from the token, and checkout steps (select → place order)
| are remembered per token, just like in a browser.
|
*/

require_once __DIR__ . "/../FrontEnd/connection.php";
require_once __DIR__ . "/../lib/api_auth.php";

header("Content-Type: application/json");
header("Cache-Control: no-store");


/*
| route => [website file, sign-in needed]
*/
const API_ROUTES = [

    // Shop (anyone)
    "categories"            => ["FrontEnd/get_categories.php", false],
    "products"              => ["FrontEnd/get_products.php", false],
    "product"               => ["FrontEnd/get_product.php", false],
    "product/report"        => ["FrontEnd/report.php", true],
    "product/reviews"       => ["FrontEnd/get_reviews.php", false],
    "shop"                  => ["FrontEnd/get_shop.php", false],
    "search/suggest"        => ["FrontEnd/search_suggest.php", false],
    "auth/forgot"           => ["register/forgot_password.php", false],

    // Cart + checkout
    "cart"                  => ["FrontEnd/Checkout/get_cart.php", true],
    "cart/count"            => ["FrontEnd/get_cart_count.php", true],
    "cart/add"              => ["FrontEnd/add_to_cart.php", true],
    "cart/update"           => ["FrontEnd/Checkout/update_cart.php", true],
    "cart/remove"           => ["FrontEnd/Checkout/remove_cart.php", true],
    "checkout/select"       => ["FrontEnd/Checkout/set_checkout.php", true],
    "checkout"              => ["FrontEnd/Checkout/get_checkout.php", true],
    "checkout/place"        => ["FrontEnd/Checkout/place_order.php", true],
    "checkout/summary"      => ["FrontEnd/Checkout/get_order_summary.php", true],
    "pay/start"             => ["FrontEnd/Checkout/paymongo_checkout.php", true],
    "pay/check"             => ["FrontEnd/Checkout/paymongo_verify.php", true],
    "pay/test"              => ["FrontEnd/Checkout/pay_order.php", true],   // only while PayMongo keys aren't set
    "addresses"             => ["FrontEnd/account/addresses.php", true],

    // Notifications
    "notifications"         => ["FrontEnd/notification/get_notifications.php", true],
    "notifications/counts"  => ["FrontEnd/notification/unread_counts.php", true],
    "notifications/read"    => ["FrontEnd/notification/mark_notification_read.php", true],
    "notifications/read_all"=> ["FrontEnd/notification/mark_all_notifications_read.php", true],
    "notifications/dismiss" => ["FrontEnd/notification/dismiss_notification.php", true],

    // Buyer account
    "profile"               => ["MyAccount/customer_php/get_profile.php", true],
    "profile/stats"         => ["MyAccount/customer_php/get_profile_stats.php", true],
    "profile/update"        => ["MyAccount/customer_php/update_profile.php", true],
    "profile/avatar"        => ["MyAccount/customer_php/upload_avatar.php", true],
    "profile/password"      => ["MyAccount/customer_php/change_password.php", true],
    "account/delete"        => ["MyAccount/customer_php/delete_account.php", true],
    "orders"                => ["MyAccount/customer_php/get_customer_orders.php", true],
    "orders/update"         => ["MyAccount/customer_php/update_customer_order.php", true],
    "reviews"               => ["MyAccount/customer_php/reviews.php", true],
    "returns"               => ["MyAccount/customer_php/returns.php", true],
    "saved"                 => ["MyAccount/customer_php/get_saved_plants.php", true],
    "saved/status"          => ["MyAccount/customer_php/get_saved_status.php", true],
    "saved/toggle"          => ["MyAccount/customer_php/toggle_saved_plant.php", true],
    "saved/remove"          => ["MyAccount/customer_php/remove_saved_plant.php", true],
    "apply-seller"          => ["MyAccount/customer_php/apply_vendor.php", true],
    "chat"                  => ["MyAccount/chat_php/chat.php", true],

    // Seller
    "seller/products"       => ["MyAccount/get_vendor_products.php", true],
    "seller/products/add"   => ["MyAccount/add_vendor_product.php", true],
    "seller/products/update"=> ["MyAccount/update_vendor_product.php", true],
    "seller/products/delete"=> ["MyAccount/delete_vendor_product.php", true],
    "seller/products/photos"=> ["MyAccount/product_photos.php", true],
    "seller/orders"         => ["MyAccount/vendor_php/get_vendor_orders.php", true],
    "seller/orders/update"  => ["MyAccount/vendor_php/update_vendor_order_status.php", true],
    "seller/store"          => ["MyAccount/vendor_php/storefront.php", true],
    "seller/sales"          => ["MyAccount/vendor_php/sales.php", true],
    "seller/reviews"        => ["MyAccount/vendor_php/reviews.php", true],
    "seller/returns"        => ["MyAccount/vendor_php/returns.php", true],
    "seller/tasks"          => ["MyAccount/vendor_php/tasks.php", true],
];


function apiRespond(int $status, array $data): void
{
    global $conn;
    http_response_code($status);
    echo json_encode($data);
    $conn->close();
    exit;
}


$route = strtolower(trim((string)($_GET["r"] ?? ""), "/"));
unset($_GET["r"]);


// The app may send JSON: make it readable as $_POST too
// (the website files read either php://input or $_POST)
if (!$_POST && stripos($_SERVER["CONTENT_TYPE"] ?? "", "application/json") !== false) {
    $json = json_decode(file_get_contents("php://input"), true);
    if (is_array($json)) $_POST = $json;
}


/* ---------- sign-in routes (api/auth.php) ---------- */

if (in_array($route, ["auth/login", "auth/register", "auth/verify", "auth/resend", "auth/google", "auth/me", "auth/logout"], true)) {
    require __DIR__ . "/auth.php";
    exit;
}

if (!isset(API_ROUTES[$route])) {
    apiRespond(404, ["success" => false, "message" => "Unknown API route: " . $route]);
}

[$file, $needsLogin] = API_ROUTES[$route];


/* ---------- who is calling ---------- */

$apiToken = apiRequestToken();
$apiUser = $apiToken !== "" ? apiTokenUser($conn, $apiToken) : null;

if ($apiToken !== "" && !$apiUser) {
    apiRespond(401, ["success" => false, "logged_in" => false, "message" => "Please sign in again."]);
}

if ($needsLogin && !$apiUser) {
    apiRespond(401, ["success" => false, "logged_in" => false, "message" => "Please sign in first."]);
}


/* ---------- the website session, kept per token ---------- */

ini_set("session.use_cookies", "0");
ini_set("session.use_only_cookies", "0");
ini_set("session.use_trans_sid", "0");

if ($apiUser) {
    session_id("app" . substr(hash("sha256", "session|" . $apiToken), 0, 40));
    session_start();

    $_SESSION["user_id"] = (int)$apiUser["user_id"];
    $_SESSION["first_name"] = $apiUser["first_name"];
    $_SESSION["last_name"] = $apiUser["last_name"];
    $_SESSION["email"] = $apiUser["email"];
    $_SESSION["store_name"] = $apiUser["store_name"];
    $_SESSION["is_vendor"] = (int)$apiUser["is_vendor"];
}


/* ---------- run the website endpoint ---------- */

$target = realpath(__DIR__ . "/../" . $file);

if (!$target) {
    apiRespond(500, ["success" => false, "message" => "This feature isn't available on the server."]);
}

// Website files include each other with paths relative to their folder
chdir(dirname($target));

require $target;
