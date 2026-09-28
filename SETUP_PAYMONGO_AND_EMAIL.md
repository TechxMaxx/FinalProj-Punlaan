# Turning on real payments (PayMongo) and order emails (Gmail)

Both are **off until you add keys**. While they're off, the website still works:

- GCash / Maya / card use **test mode** — the "Pay" button marks the order paid; no money moves.
- Order updates appear only in the website's bell (🔔), not by email.

Never paste a secret key or password into a chat, a screenshot, a group chat or a public
repository. Type it straight into the file.

---

## Part 1 — PayMongo (GCash, Maya, credit/debit cards)

### A. Test mode first: free, no documents needed

1. Go to **https://dashboard.paymongo.com/signup** and sign up with your email.
2. Confirm your email (PayMongo sends a link) and log in.
3. In the dashboard, open **Developers → API keys**.
   You'll see two **test** keys:
   - Public key: starts with `pk_test_`
   - Secret key: starts with `sk_test_` (click *Reveal* to see it)
4. Open `third_party/paymongo/paymongo_config.php` in your editor and replace the placeholders:
   ```php
   define("PAYMONGO_SECRET_KEY", "sk_test_…your secret key…");
   define("PAYMONGO_PUBLIC_KEY", "pk_test_…your public key…");
   ```
5. Save. Upload that one file to InfinityFree (File Manager → `htdocs/third_party/paymongo/`).
6. Try it: order something with **GCash** → on the confirmation page press **Pay** → PayMongo's
   page opens → choose *Authorize Test Payment* → you come back to Punlaan and the order
   shows **Paid**. No real money is charged with test keys.

Admin → Settings → Platform shows "PayMongo (test keys)" when it's connected.

### B. Real money (live mode) — needs verification

PayMongo has to verify the business before it gives **live** keys:

1. Dashboard → **Activate your account**.
2. Choose the business type and upload what they ask for. Typical for a small business:
   - Valid government ID of the owner
   - DTI business name registration (sole proprietor) or SEC papers (corporation)
   - BIR Certificate of Registration (Form 2303)
   - Bank account for PayMongo to send the collected money to
   - The website address: `https://punlaan-market.free.nf`, plus a short description of what you sell
3. Wait for approval (usually a few business days; they email you if something is missing).
4. After approval, **Developers → API keys → Live**: copy `sk_live_…` and `pk_live_…` into the
   same config file.

> For a school project, **test mode is enough** to show the full payment flow to your professor.
> Live mode is only needed to take real customers' money.

### How it works (for your documentation)

- The customer pays on **PayMongo's own page** (Checkout Session), so Punlaan never sees card
  numbers or GCash PINs.
- When they come back, Punlaan asks PayMongo "was this paid?" and marks the order Paid.
  (No webhooks are needed — free hosting blocks them.)
- Refunds (cancelled paid orders, approved returns) are sent back through PayMongo's Refunds
  API automatically. Refunds can take 5–10 banking days to appear.
- PayMongo charges a small fee per transaction (see their pricing page); test mode is free.

---

## Part 2 — Gmail order emails

Punlaan emails buyers and sellers about orders (placed, paid, packed, shipped, delivered,
cancelled), returns, reviews and payouts. It uses a Gmail account through Gmail's SMTP server.

1. Create (or use) a Gmail account just for the website, e.g. `punlaan.noreply@gmail.com`.
2. Turn on **2-Step Verification**: https://myaccount.google.com/security
3. Create an **App Password**: https://myaccount.google.com/apppasswords
   - App name: `Punlaan` → **Create**
   - Google shows a 16-letter password (like `abcd efgh ijkl mnop`). Copy it.
4. Open `third_party/mail/mail_config.php` and fill in:
   ```php
   define("MAIL_USERNAME", "punlaan.noreply@gmail.com");
   define("MAIL_APP_PASSWORD", "abcd efgh ijkl mnop");
   ```
5. Save and upload that file to InfinityFree (`htdocs/third_party/mail/`).
6. Try it: "Forgot password" on the login page, or place an order with an account whose
   email you can open.

Notes:
- The **sample accounts** (…@test.com, …@punlaan.com, customer@gmail.com, etc.) never get
  emails, so strangers who own those addresses aren't spammed. Test with your own email.
- Gmail allows about 500 emails a day — plenty for this project.
- If emails don't arrive: check Spam first. If nothing at all is sent, the App Password is
  wrong or 2-Step Verification is off.

---

## Other free services you could add later

| Service | What it would do | Cost |
|---|---|---|
| Cloudflare Turnstile | "I'm not a robot" check on Register / Login (stops spam accounts) | Free |
| J&T / LBC / Ninja Van rate API | Live courier prices instead of Punlaan's size + zone table | Needs a business account |
| Semaphore or iTexMo | SMS order updates ("Your order is out for delivery") | Pay per SMS |
| Lalamove / Grab Express API | Book the actual courier and track the rider | Needs a business account |
| Cloudinary | Resize/compress product photos automatically | Free tier |
| Google Analytics | See how many people visit and what they look at | Free |
