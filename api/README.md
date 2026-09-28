# Punlaan mobile API

The app uses the **same database and the same PHP rules as the website**.
Every route below runs one of the website's own endpoint files.

- Base URL: `<site>/api/` (emulator + XAMPP: `http://10.0.2.2/punlaan/api/`)
- Send JSON: `Content-Type: application/json`
- Signed-in routes need the header `Authorization: Bearer <token>`
- A **401** answer means the sign-in ended: go back to the Sign In screen.

## Sign in

| Route | Send | Get back |
|---|---|---|
| POST `auth/login` | email, password, device | `{token, user}`, or `{verify: true, ticket, email}` |
| POST `auth/register` | first_name, last_name, email, password | `{verify: true, ticket, email}` |
| POST `auth/verify` | ticket, code | `{token, user}` |
| POST `auth/resend` | ticket | `{message, resend_in}` |
| GET `auth/me` | – | `{user}` |
| POST `auth/logout` | – | – |
| POST `auth/forgot` | email | emails a reset link |
| POST `auth/google` | id_token (issued for the Web client ID) | `{token, user}`, and creates the account if it's new |

## Shop (no sign-in needed)

- `categories`
- `products?subcategory=All` (or `?category=…`, `?q=…`)
- `product?product_id=`
- `product/reviews?product_id=`
- `shop?vendor_id=`
- `search/suggest?q=`

## Buyer (signed in)

**Cart**
- `cart`
- `cart/add` {product_id, quantity, mode?: "buy_now"}
- `cart/update` {cart_item_id, quantity}
- `cart/remove` {cart_item_ids: []}

**Checkout**
1. `checkout/select` {cart_item_ids}
2. `checkout?address_id=`: items, and per-shop shipping
3. `checkout/place` {address_id, payment_method: cod|gcash|maya|card}

**Pay online**
- `checkout/summary?order_id=` returns `gateway`.
- `pay/start` {order_id, return_to: "app"} returns the PayMongo `checkout_url`. After paying, PayMongo opens `FrontEnd/Checkout/APP_RETURN.html`, which reopens the app via `punlaan://payment`.
- `pay/check` {order_id} returns `paid`.
- `pay/test` {order_id} works only while the PayMongo keys are not set.

**Addresses**
- `addresses` (GET lists them)
- POST {action: save | delete | set_default, …}
- Region, city and barangay lists come from https://psgc.gitlab.io/api

**Orders**
- `orders`
- `orders/update` {order_item_id, action: cancel | received, reason?}

**Account**
- `profile`, `profile/update`, `profile/password`
  - A new email in `profile/update` returns `{verify_required, ticket, email}`. The old token stops working; send the code to `auth/verify`.
- `profile/avatar` (multipart field: `avatar`)
- `saved`, `saved/status?product_id=`, `saved/toggle` {product_id}
- `notifications`, `notifications/read`, `notifications/read_all`
- `reviews`, `returns`, `chat`, `apply-seller`

## Seller (signed in, approved seller)

- `seller/products`
- `seller/products/add`, `seller/products/update`, `seller/products/delete`
- `seller/products/photos`
- `seller/orders`: each item lists its allowed `next_statuses`
- `seller/orders/update` {order_item_id, status, note?}
- `seller/store`: GET, or POST action=save
- `seller/sales`, `seller/reviews`, `seller/returns`, `seller/tasks`

There is no admin in the app: admin work stays on the website.

## Photos

The website returns relative paths:
- `products/…` lives under `<site>/FrontEnd/products/…`
- `uploads/…` lives under `<site>/uploads/…`

See `ApiConfig.media()` in the app.
