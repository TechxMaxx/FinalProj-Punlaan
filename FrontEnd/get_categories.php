<?php

/*
| Categories for the Marketplace sidebar and the seller's product form.
| [ {id, name, slug, children: [{id, name, slug}]} ] — visible ones only.
*/

header("Content-Type: application/json");
header("Cache-Control: no-store");

require_once __DIR__ . "/connection.php";
require_once __DIR__ . "/../lib/categories.php";

echo json_encode(["success" => true, "categories" => categoryTree($conn)]);

$conn->close();
