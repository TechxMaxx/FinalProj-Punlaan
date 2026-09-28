<?php

/*
|--------------------------------------------------------------------------
| EMAIL RULES — which addresses buyers and sellers may sign up with
|--------------------------------------------------------------------------
|
|   $problem = emailProblem($email);   // null = OK, otherwise a message
|
| 1. Must look like name@domain.tld
| 2. @punlaan… addresses are reserved for Punlaan admins
| 3. Throwaway / temporary inbox services are refused
| 4. The domain must be able to receive email (has MX or A records)
|
| Google / Facebook sign-ins skip this: those providers already verified
| the address.
|
*/

const RESERVED_EMAIL_WORD = "punlaan";

// Common temporary-inbox services (add more here if needed)
const DISPOSABLE_EMAIL_DOMAINS = [
    "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com",
    "burnermail.io", "discard.email", "dispostable.com", "dropmail.me",
    "emailondeck.com", "fakeinbox.com", "fakemail.net", "getairmail.com",
    "getnada.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
    "guerrillamailblock.com", "harakirimail.com", "inboxkitten.com", "maildrop.cc",
    "mailinator.com", "mailinator.net", "mailnesia.com", "mailpoof.com",
    "mintemail.com", "moakt.com", "mohmal.com", "mytemp.email", "nada.email",
    "sharklasers.com", "spamgourmet.com", "temp-mail.io", "temp-mail.org",
    "tempail.com", "tempmail.com", "tempmail.dev", "tempmail.net", "tempmailo.com",
    "tempr.email", "throwawaymail.com", "trashmail.com", "trashmail.de",
    "yopmail.com", "yopmail.fr", "yopmail.net",
];

function emailProblem(string $email): ?string
{
    $email = trim($email);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/@[^@.]+(\.[^@.]+)+$/', $email)) {
        return "Please enter a valid email address (like name@gmail.com).";
    }

    $domain = strtolower(substr(strrchr($email, "@"), 1));

    if (str_contains($domain, RESERVED_EMAIL_WORD)) {
        return "Punlaan email addresses are reserved for staff. Please use your own email.";
    }

    foreach (DISPOSABLE_EMAIL_DOMAINS as $blocked) {
        if ($domain === $blocked || str_ends_with($domain, "." . $blocked)) {
            return "Temporary email addresses aren't allowed. Please use an email you'll keep.";
        }
    }

    if (!emailDomainReceivesMail($domain)) {
        return "We couldn't find the email domain \"$domain\". Please check for typos (e.g. gmail.com).";
    }

    return null;
}

function emailDomainReceivesMail(string $domain): bool
{
    if (checkdnsrr($domain, "MX") || checkdnsrr($domain, "A")) {
        return true;
    }

    // No internet / DNS on this computer → don't block everyone
    return !checkdnsrr("gmail.com", "MX");
}
