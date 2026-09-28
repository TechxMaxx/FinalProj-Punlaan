<?php

/*
|--------------------------------------------------------------------------
| PAYMONGO (GCash, Maya and card payments)
|--------------------------------------------------------------------------
|
| Until real keys are pasted below, Punlaan uses its built-in TEST MODE
| (the "Pay" button marks the order paid without real money).
|
| 1. Sign up (free): https://dashboard.paymongo.com/signup
| 2. Dashboard → Developers → API Keys
| 3. Copy the TEST keys (start with sk_test_ and pk_test_) below.
|    Test keys work right away — no business papers needed. Payments
|    with test keys are pretend payments you can approve on PayMongo's
|    test page.
| 4. For real money later: Dashboard → "Activate account" (business
|    documents), then swap in the LIVE keys (sk_live_ / pk_live_).
|
| KEEP THE SECRET KEY PRIVATE — never paste it in a chat, a screenshot
| or a public repository. Anyone with it can refund or view payments.
|
*/

define("PAYMONGO_SECRET_KEY", "sk_test_PASTE_YOUR_SECRET_KEY");
define("PAYMONGO_PUBLIC_KEY", "pk_test_PASTE_YOUR_PUBLIC_KEY");


function paymongoIsConfigured(): bool
{
    return (bool)preg_match('/^sk_(test|live)_[A-Za-z0-9]{10,}$/', PAYMONGO_SECRET_KEY)
        && strpos(PAYMONGO_SECRET_KEY, "PASTE_YOUR") === false;
}

function paymongoIsLive(): bool
{
    return strpos(PAYMONGO_SECRET_KEY, "sk_live_") === 0;
}
