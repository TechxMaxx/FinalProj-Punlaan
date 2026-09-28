<?php

// Admins only
require_once __DIR__ . "/admin_auth.php";

header('Content-Type: application/json');

require 'connection.php';


/*
 * Seller applications:
 *  - customers who applied from their Profile or chose
 *    "Customer + Vendor" at sign-up (is_vendor = 0, status 1 or 3)
 *  - vendors already approved/rejected (is_vendor = 1)
 */

$sql = "
SELECT
    u.user_id,
    CONCAT(
        u.first_name,
        ' ',
        u.last_name
    ) AS name,

    u.email,
    u.store_name,
    u.is_vendor,
    u.verification_status,
    u.created_at,

    GROUP_CONCAT(
        CONCAT(v.document_type, '|', v.document_id)
        ORDER BY v.uploaded_at
        SEPARATOR '\n'
    ) AS documents,

    MAX(v.uploaded_at) AS submitted

FROM users u

LEFT JOIN vendor_documents v
    ON u.user_id = v.user_id

WHERE
    (u.is_vendor = 1 AND u.verification_status IN (1, 2, 3))
    OR
    (u.is_vendor = 0 AND u.verification_status IN (1, 3))

GROUP BY u.user_id

ORDER BY COALESCE(MAX(v.uploaded_at), u.created_at) DESC
";


$result =
    $conn->query($sql);


$data = [];


while ($row = $result->fetch_assoc()) {

    switch ((int)$row['verification_status']) {

        case 1:
            $row['status'] = 'Pending';
            break;

        case 2:
            $row['status'] = 'Approved';
            break;

        case 3:
            $row['status'] = 'Rejected';
            break;

        default:
            $row['status'] = 'Unknown';
    }


    $row['type'] =
        $row['store_name'] ?: 'Vendor';

    $row['accountSub'] =
        'Individual';


    /* Documents: "Type|id" lines → [{type, url}] (viewed through view_document.php) */

    $files = [];

    foreach (array_filter(explode("\n", (string)$row['documents'])) as $line) {
        [$type, $id] = array_pad(explode('|', $line, 2), 2, '');
        $files[] = ['type' => $type, 'url' => 'view_document.php?id=' . (int)$id];
    }

    $row['doc_files'] = $files;

    $row['docs'] =
        implode(', ', array_column($files, 'type'));

    $row['submitted'] =
        $row['submitted'] ?: $row['created_at'];


    unset(
        $row['documents'],
        $row['is_vendor'],
        $row['verification_status'],
        $row['created_at']
    );


    $data[] =
        $row;
}


echo json_encode($data);
