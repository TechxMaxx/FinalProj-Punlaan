<?php

/*
|--------------------------------------------------------------------------
| CATEGORIES (categories table, edited in Admin → Categories & Taxonomy)
|--------------------------------------------------------------------------
|
| Two levels: main categories (Marketplace sidebar) and their
| subcategories. Products store both names:
|   product.category    = main category name     e.g. "Seedlings"
|   product.subcategory = subcategory name       e.g. "Vegetable Seedlings"
|
*/

/*
 * [ {id, name, slug, sort_order, is_active, children: [ {id, name, slug, …} ]} ]
 */
function categoryTree(mysqli $conn, bool $includeHidden = false): array
{
    $rows = $conn->query("
        SELECT category_id, parent_id, name, slug, sort_order, is_active, size_tier
        FROM categories
        ORDER BY sort_order, name
    ")->fetch_all(MYSQLI_ASSOC);

    $tree = [];
    $children = [];

    foreach ($rows as $row) {
        if (!$includeHidden && !(int)$row["is_active"]) continue;

        $node = [
            "id" => (int)$row["category_id"],
            "name" => $row["name"],
            "slug" => $row["slug"],
            "sort_order" => (int)$row["sort_order"],
            "is_active" => (int)$row["is_active"] === 1,
            // Shipping size: small | medium | large (null on a subcategory = same as its main category)
            "size_tier" => $row["size_tier"],
        ];

        if ($row["parent_id"] === null) {
            $tree[$node["id"]] = $node + ["children" => []];
        } else {
            $children[(int)$row["parent_id"]][] = $node;
        }
    }

    foreach ($children as $parentId => $list) {
        if (isset($tree[$parentId])) {
            $tree[$parentId]["children"] = $list;
        }
    }

    return array_values($tree);
}


/*
 * Checks a category + subcategory pair from a seller's form.
 * Returns [category, subcategory|null] or throws RuntimeException.
 */
function validCategoryPair(mysqli $conn, string $category, string $subcategory): array
{
    foreach (categoryTree($conn) as $main) {
        if ($main["name"] !== $category) continue;

        if ($subcategory === "") {
            return [$category, null];
        }

        foreach ($main["children"] as $sub) {
            if ($sub["name"] === $subcategory) {
                return [$category, $subcategory];
            }
        }

        throw new RuntimeException("Please choose a subcategory of $category.");
    }

    throw new RuntimeException("Please choose a category.");
}


/* URL-friendly name: "Herb & Culinary Seedlings" → "herb-culinary-seedlings" */
function categorySlug(string $name): string
{
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $name), '-'));
    return $slug !== "" ? substr($slug, 0, 90) : "category";
}
