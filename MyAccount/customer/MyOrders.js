const STATUS_CONFIG = {
  'to-pack': {
    label: 'To Pack',
    cls: 'status-badge--to-pack',
    dot: 'status-dot--to-pack'
  },

  packed: {
    label: 'Packed',
    cls: 'status-badge--packed',
    dot: 'status-dot--packed'
  },

  shipping: {
    label: 'Shipping',
    cls: 'status-badge--shipping',
    dot: 'status-dot--shipping'
  },

  shipped: {
    label: 'Shipped',
    cls: 'status-badge--shipped',
    dot: 'status-dot--shipped'
  },

  completed: {
    label: 'Completed',
    cls: 'status-badge--completed',
    dot: 'status-dot--completed'
  },

  cancelled: {
    label: 'Cancelled',
    cls: 'status-badge--cancelled',
    dot: 'status-dot--cancelled'
  }
};


const FILTERS = [
  {
    key: 'all',
    label: 'All Orders'
  },

  {
    key: 'to-pack',
    label: 'To Pack'
  },

  {
    key: 'packed',
    label: 'Packed'
  },

  {
    key: 'shipping',
    label: 'Shipping'
  },

  {
    key: 'shipped',
    label: 'Shipped'
  },

  {
    key: 'completed',
    label: 'Completed'
  },

  {
    key: 'cancelled',
    label: 'Cancelled'
  },

  {
    key: 'returns',
    label: 'Returns'
  }
];


let allOrders = [];

// From get_customer_orders.php (Admin → Settings)
let RETURN_DAYS = 7;
let RETURN_REASONS = [];

const RETURN_TAG = {
  requested: 'ptag--warn',
  rejected: 'ptag--bad',
  disputed: 'ptag--info',
  refunded: 'ptag--good',
  closed: '',
  cancelled: ''
};

let currentFilter = 'all';


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    const user =
      await getCurrentUser();


    /* =====================================================
       NOT LOGGED IN
    ===================================================== */

    if (!user) {

      window.location.replace(
        '../../register/Login.html'
      );

      return;

    }


    /* =====================================================
       USER IS LOGGED IN
    ===================================================== */

    document.getElementById(
      'app'
    ).innerHTML =
      renderLayout(
        'my-orders'
      );


    document.getElementById(
      'pageContent'
    ).innerHTML =
      pageHtml();


    loadOrders();

  }
);


/* =========================================================
   PAGE HTML
========================================================= */

function pageHtml() {

  return `

    <div
      class="stats"
      id="stats"
    ></div>


    <div class="toolbar">

      <div class="toolbar__title">
        My Orders
      </div>

      <div
        class="filters"
        id="filters"
      ></div>

    </div>


    <div class="sort-row">

      Sort by:

      <select
        class="sort-select"
        id="sortSelect"
        onchange="renderOrders()"
      >

        <option value="date">
          Order Date
        </option>

        <option value="total">
          Total Amount
        </option>

        <option value="status">
          Status
        </option>

      </select>

    </div>


    <div
      class="orders-list"
      id="ordersList"
    >

      <div class="loading">
        Loading your orders…
      </div>

    </div>


    <div id="modalRoot"></div>

  `;

}


/* =========================================================
   LOAD ORDERS
========================================================= */

async function loadOrders() {

  const listEl =
    document.getElementById(
      'ordersList'
    );


  listEl.innerHTML =
    '<div class="loading">Loading your orders…</div>';


  try {

    const response =
      await fetch(
        '../customer_php/get_customer_orders.php',
        {
          method: 'GET',

          credentials: 'include',

          cache: 'no-store'
        }
      );


    if (!response.ok) {

      throw new Error(
        `Server returned HTTP ${response.status}`
      );

    }


    const result =
      await response.json();


    /* =====================================================
       SESSION EXPIRED
    ===================================================== */

    if (
      result.logged_in === false
    ) {

      window.location.replace(
        '../../register/Login.html'
      );

      return;

    }


    /* =====================================================
       SERVER ERROR
    ===================================================== */

    if (!result.success) {

      throw new Error(
        result.message ||
        'Could not load orders.'
      );

    }


    allOrders =
      result.orders || [];

    RETURN_DAYS = result.return_days || 7;
    RETURN_REASONS = result.return_reasons || [];


    renderStats();

    renderFilters();

    renderOrders();


  } catch (err) {

    console.error(
      'Could not load orders:',
      err
    );


    listEl.innerHTML =
      `
        <div class="empty-state">

          Could not load orders.

          ${escapeHtml(
            err.message
          )}

        </div>
      `;

  }

}


/* =========================================================
   STATS
========================================================= */

function renderStats() {

  const toPack =
    allOrders.filter(
      o =>
        o.status === 'to-pack'
    ).length;


  const inTransit =
    allOrders.filter(
      o =>
        o.status === 'shipping' ||
        o.status === 'shipped'
    ).length;


  const completed =
    allOrders.filter(
      o =>
        o.status === 'completed'
    ).length;


  document.getElementById(
    'stats'
  ).innerHTML = `

    <div class="stat">

      <div>

        <div class="stat__label">
          Being Prepared
        </div>

        <div class="stat__value">
          ${toPack}
        </div>

        <div class="stat__sub">

          <span class="stat__badge stat__badge--yellow">
            Seller is packing
          </span>

        </div>

      </div>


      <div class="stat__icon stat__icon--amber">

        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >

          <path d="m7.5 4.27 9 5.15"/>

          <path
            d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
          />

        </svg>

      </div>

    </div>


    <div class="stat">

      <div>

        <div class="stat__label">
          In Transit
        </div>

        <div class="stat__value">
          ${inTransit}
        </div>

        <div class="stat__sub">
          Being shipped to you
        </div>

      </div>


      <div class="stat__icon stat__icon--teal">

        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >

          <path
            d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"
          />

          <path d="M15 18H9"/>

          <path
            d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"
          />

          <circle cx="17" cy="18" r="2"/>

          <circle cx="7" cy="18" r="2"/>

        </svg>

      </div>

    </div>


    <div class="stat">

      <div>

        <div class="stat__label">
          Completed
        </div>

        <div class="stat__value">
          ${completed}
        </div>

        <div class="stat__sub">
          Delivered orders
        </div>

      </div>


      <div class="stat__icon stat__icon--green">

        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >

          <path
            d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
          />

          <polyline points="22 4 12 14.01 9 11.01"/>

        </svg>

      </div>

    </div>

  `;

}


/* =========================================================
   FILTERS
========================================================= */

function renderFilters() {

  const el =
    document.getElementById(
      'filters'
    );


  el.innerHTML =
    FILTERS.map(
      f => `

        <button
          class="filter-btn${
            f.key === currentFilter
              ? ' filter-btn--active'
              : ''
          }"
          onclick="setFilter('${f.key}')"
        >

          ${f.label}

        </button>

      `
    ).join('');

}


function setFilter(key) {

  currentFilter =
    key;


  renderFilters();

  renderOrders();

}


/* =========================================================
   RENDER ORDERS
========================================================= */

function renderOrders() {

  const listEl =
    document.getElementById(
      'ordersList'
    );


  let filtered =
    currentFilter === 'all'
      ? [...allOrders]
      : currentFilter === 'returns'
        ? allOrders.filter(o => o.return_id)
        : allOrders.filter(
            o =>
              o.status ===
              currentFilter
          );


  const sortBy =
    document.getElementById(
      'sortSelect'
    )?.value ||
    'date';


  if (
    sortBy === 'total'
  ) {

    filtered.sort(
      (a, b) =>
        (b.total_amount || 0) -
        (a.total_amount || 0)
    );

  }


  else if (
    sortBy === 'status'
  ) {

    filtered.sort(
      (a, b) =>
        (a.status || '')
          .localeCompare(
            b.status || ''
          )
    );

  }


  if (
    filtered.length === 0
  ) {

    listEl.innerHTML =
      `
        <div class="empty-state">
          No orders in this category yet.
        </div>
      `;

    return;

  }


  listEl.innerHTML =
    filtered.map(
      order => {

        const sc =
          STATUS_CONFIG[
            order.status
          ] ||
          STATUS_CONFIG[
            'to-pack'
          ];


        const dateStr =
          formatDate(
            order.order_date
          );


        const total =
          Number(
            order.total_amount ||
            0
          );


        return `

          <div class="order-card" data-order-id="${Number(order.order_id)}" data-item-id="${Number(order.id)}"${order.return_id ? ` data-return-id="${Number(order.return_id)}"` : ''}>

            <img
              src="../../FrontEnd/${
                order.product_image ||
                ''
              }"
              alt="${escapeHtml(
                order.product_name
              )}"
              class="order-card__thumb"
              onerror="this.onerror=null; this.src='../../FrontEnd/products/no_photo.jpg'"
            />


            <div class="order-card__body">

              <div class="order-card__top">

                <span class="order-card__id">
                  ${escapeHtml(
                    order.order_number
                  )}
                </span>

                <span class="order-card__date">
                  ${dateStr}
                </span>

              </div>


              <div class="order-card__product">

                ${escapeHtml(
                  order.product_name
                )}

                ×${order.quantity}

              </div>


              <div class="order-card__vendor">

                from ${
                  escapeHtml(
                    order.vendor_name ||
                    'Plant Market'
                  )
                }

              </div>

              <div class="order-card__payment">
                ${paymentLabel(order)}
              </div>

              ${order.courier && order.status !== 'cancelled' ? `
                <div class="order-card__payment">
                  ${trackingHtml(order)}
                </div>` : ''}

              ${order.review_rating ? `
                <div class="order-card__payment">
                  Your rating: ${starsHtml(order.review_rating)}
                </div>` : ''}

              ${order.return_status ? `
                <div class="order-card__payment">
                  Return: <span class="ptag ${RETURN_TAG[order.return_status] || ''}">${escapeHtml(order.return_label)}</span>
                </div>` : ''}

            </div>


            <div class="order-card__meta">

              <div class="order-card__total">

                ₱${total.toLocaleString()}

              </div>


              <span
                class="status-badge ${sc.cls}"
              >

                <span
                  class="status-dot ${sc.dot}"
                ></span>

                ${sc.label}

              </span>

            </div>


            <div class="order-card__actions">

              ${order.can_pay ? `
                <a
                  class="order-action order-action--primary"
                  href="../../FrontEnd/Checkout/CONFIRM.html?order_id=${Number(order.order_id)}"
                >
                  Pay now
                </a>` : ''}

              ${order.can_confirm_received ? `
                <button
                  class="order-action order-action--primary"
                  onclick="customerOrderAction(this, ${Number(order.id)}, 'received')"
                >
                  Order received
                </button>` : ''}

              ${order.can_review ? `
                <button
                  class="order-action${order.review_rating ? '' : ' order-action--primary'}"
                  onclick="openReviewDialog(${Number(order.id)})"
                >
                  ${order.review_rating ? 'Edit review' : 'Rate'}
                </button>` : ''}

              <button
                class="view-btn"
                onclick="openViewModal('${order.id}')"
              >
                View
              </button>

              ${order.can_return ? `
                <button
                  class="order-action"
                  onclick="openReturnDialog(${Number(order.id)})"
                >
                  Return / Refund
                </button>` : ''}

              ${order.can_escalate ? `
                <button
                  class="order-action order-action--primary"
                  onclick="openEscalateDialog(${Number(order.id)})"
                >
                  Ask Punlaan to review
                </button>` : ''}

              ${order.can_cancel ? `
                <button
                  class="order-action order-action--danger"
                  onclick="customerOrderAction(this, ${Number(order.id)}, 'cancel')"
                >
                  Cancel
                </button>` : ''}

              <a
                class="order-action"
                href="Messages.html?vendor_id=${Number(order.vendor_id)}&product_id=${Number(order.product_id)}"
                title="Chat with the seller"
              >
                Chat
              </a>

            </div>

          </div>

        `;

      }
    ).join('');


  // Opened from a notification → scroll to that order
  highlightLinked();

}


/* =========================================================
   PAYMENT METHOD + STATUS
========================================================= */

const PAYMENT_NAMES = {
  cod: 'Cash on Delivery',
  gcash: 'GCash',
  maya: 'Maya',
  card: 'Card'
};

/* "🚚 J&T Express · JT123456 [Copy]" — entered by the seller when the parcel left */
function trackingHtml(order) {
  const number = order.tracking_number
    ? ` · <strong>${escapeHtml(order.tracking_number)}</strong>
        <button type="button" class="order-action" style="padding:2px 8px;font-size:12px;margin-left:4px"
          onclick="event.stopPropagation();copyTracking(this, '${escapeHtml(order.tracking_number)}')">Copy</button>`
    : '';
  return `🚚 ${escapeHtml(order.courier)}${number}`;
}

async function copyTracking(button, number) {
  try {
    await navigator.clipboard.writeText(number);
    button.textContent = 'Copied';
  } catch {
    window.prompt('Tracking number:', number);
  }
}

function paymentLabel(order) {
  const name = PAYMENT_NAMES[order.payment_method] || 'Cash on Delivery';

  if (order.payment_status === 'paid') {
    return `${name} · <span class="pay-state pay-state--paid">Paid</span>`;
  }
  if (order.payment_status === 'refunded') {
    return `${name} · <span class="pay-state">Refunded</span>`;
  }
  if (order.status === 'cancelled') {
    return name;
  }
  return order.payment_method === 'cod' || !order.payment_method
    ? `${name} · <span class="pay-state">Pay on delivery</span>`
    : `${name} · <span class="pay-state pay-state--due">Waiting for payment</span>`;
}


/* =========================================================
   VIEW ORDER MODAL
========================================================= */

function openViewModal(
  orderId
) {

  orderId =
    Number(orderId);


  const order =
    allOrders.find(
      o =>
        Number(o.id) ===
        orderId
    );


  if (!order) {

    console.error(
      'Order not found:',
      orderId
    );

    return;

  }


  const sc =
    STATUS_CONFIG[
      order.status
    ] ||
    STATUS_CONFIG[
      'to-pack'
    ];


  const total =
    Number(
      order.total_amount ||
      0
    );


  const dateStr =
    formatDate(
      order.order_date
    );


  // New orders store "Name | phone | address"; older ones only the address
  const shipParts =
    String(order.shipping_address || '').split(' | ');

  const shipTo =
    shipParts.length === 3
      ? `${escapeHtml(shipParts[0])} · ${escapeHtml(shipParts[1])}<br>${escapeHtml(shipParts[2])}`
      : escapeHtml(order.shipping_address || 'Not provided');


  document.getElementById(
    'modalRoot'
  ).innerHTML = `

    <div
      class="modal-overlay"
      onclick="if(event.target === this) closeModal()"
    >

      <div class="view-modal">

        <div class="view-modal__body">


          <div class="view-modal__header">

            <div>

              <div class="view-modal__order-id">

                ${escapeHtml(
                  order.order_number
                )}

              </div>


              <div class="view-modal__date">

                ${dateStr}

              </div>

            </div>


            <button
              class="modal__close"
              onclick="closeModal()"
            >
              ×
            </button>

          </div>


          <div class="view-modal__section">

            <div class="view-modal__section-label">
              Status
            </div>


            <span
              class="status-badge ${sc.cls}"
            >

              <span
                class="status-dot ${sc.dot}"
              ></span>

              ${sc.label}

            </span>

            ${order.status_note
              ? `<div class="view-modal__note">${escapeHtml(order.status_note)}</div>`
              : ''}

            ${order.courier && order.status !== 'cancelled'
              ? `<div class="view-modal__note">${trackingHtml(order)}</div>`
              : ''}

          </div>


          <div class="view-modal__section">

            <div class="view-modal__section-label">
              Item
            </div>


            <div class="view-modal__product-row">

              <img
                src="../../FrontEnd/${
                  order.product_image ||
                  ''
                }"
                alt="${escapeHtml(
                  order.product_name
                )}"
                class="view-modal__product-thumb"
                onerror="this.onerror=null; this.src='../../FrontEnd/products/no_photo.jpg'"
              />


              <span class="view-modal__product-name">

                ${escapeHtml(
                  order.product_name
                )}

              </span>


              <span class="view-modal__product-qty">

                ×${order.quantity}

              </span>


              <span class="view-modal__product-price">

                ₱${total.toLocaleString()}

              </span>

            </div>

          </div>


          <div class="view-modal__section">

            <div class="view-modal__section-label">
              Shipping Address
            </div>


            <div class="view-modal__info">

              ${shipTo}

            </div>

          </div>


          <div class="view-modal__section">

            <div class="view-modal__section-label">
              Order Summary
            </div>


            <div class="view-modal__summary">


              <div class="view-modal__summary-row view-modal__summary-row--total">

                <span>
                  Item total
                </span>

                <span>

                  ₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}

                </span>

              </div>

              ${order.seller_shipping_fee != null ? `
                <div class="view-modal__summary-row">
                  <span>Shipping from ${escapeHtml(order.ships_from || 'the seller')}${order.shipping_zone ? ' · ' + escapeHtml(order.shipping_zone) : order.distance_km != null ? ' · ' + Number(order.distance_km) + ' km' : ''}</span>
                  <span>${formatPeso(order.seller_shipping_fee)}</span>
                </div>
                <div class="view-modal__summary-row">
                  <span style="font-size:12px;color:#8aa596">
                    Shipping is charged once per seller in an order.
                  </span>
                </div>` : ''}


            </div>

          </div>


          ${order.review_rating ? `
            <div class="view-modal__section">
              <div class="view-modal__section-label">Your review</div>
              <div>${starsHtml(order.review_rating)}</div>
              ${order.review_comment ? `<div class="view-modal__note">${escapeHtml(order.review_comment)}</div>` : ''}
              ${order.review_reply ? `<div class="view-modal__note"><strong>Seller's reply:</strong> ${escapeHtml(order.review_reply)}</div>` : ''}
            </div>` : ''}

          ${order.return_status ? `
            <div class="view-modal__section">
              <div class="view-modal__section-label">Return / refund</div>
              <span class="ptag ${RETURN_TAG[order.return_status] || ''}">${escapeHtml(order.return_label)}</span>
              <div class="view-modal__note">Reason: ${escapeHtml(order.return_reason)}</div>
              ${order.return_seller_note ? `<div class="view-modal__note"><strong>Seller:</strong> ${escapeHtml(order.return_seller_note)}</div>` : ''}
              ${order.return_admin_note ? `<div class="view-modal__note"><strong>Punlaan:</strong> ${escapeHtml(order.return_admin_note)}</div>` : ''}
              ${['requested', 'rejected'].includes(order.return_status) ? `
                <button class="order-action" style="margin-top:8px" onclick="withdrawReturn(this, ${Number(order.return_id)})">Withdraw request</button>` : ''}
            </div>` : order.can_return ? `
            <div class="view-modal__section">
              <div class="view-modal__note">
                Something wrong with this item? You can ask for a return or refund until
                ${formatDate(order.return_deadline)}.
              </div>
            </div>` : ''}

          <div class="view-modal__actions">

            ${order.can_return ? `
              <button class="order-action" onclick="openReturnDialog(${Number(order.id)})">Return / Refund</button>` : ''}

            ${order.can_review ? `
              <button class="order-action order-action--primary" onclick="openReviewDialog(${Number(order.id)})">
                ${order.review_rating ? 'Edit review' : 'Rate this item'}
              </button>` : ''}

            ${order.can_cancel ? `
              <button
                class="order-action order-action--danger"
                onclick="customerOrderAction(this, ${Number(order.id)}, 'cancel')"
              >
                Cancel this item
              </button>` : ''}

            ${order.can_confirm_received ? `
              <button
                class="order-action order-action--primary"
                onclick="customerOrderAction(this, ${Number(order.id)}, 'received')"
              >
                I received this order
              </button>` : ''}

            <button
              class="view-modal__close-btn"
              onclick="closeModal()"
            >
              Close
            </button>

          </div>


        </div>

      </div>

    </div>

  `;

}


/* =========================================================
   CANCEL / ORDER RECEIVED
   Tap once to arm, tap again to confirm (no pop-up dialogs)
========================================================= */

async function customerOrderAction(btn, orderItemId, action) {

  if (!btn.dataset.confirming) {

    btn.dataset.confirming = '1';
    btn.dataset.label = btn.textContent.trim();
    btn.textContent = action === 'cancel' ? 'Tap again to cancel' : 'Tap again to confirm';

    setTimeout(() => {
      if (btn.isConnected && btn.dataset.confirming) {
        delete btn.dataset.confirming;
        btn.textContent = btn.dataset.label;
      }
    }, 3500);

    return;
  }

  btn.disabled = true;
  btn.textContent = 'Please wait…';

  try {

    const response = await fetch('../customer_php/update_customer_order.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ order_item_id: orderItemId, action: action })
    });

    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    closeModal();

    showToast(action === 'cancel'
      ? 'Order cancelled.'
      : 'Thanks! The order is now completed.');

    loadOrders();

  } catch (err) {

    showToast(err.message || 'Could not update the order.', true);
    btn.disabled = false;
    delete btn.dataset.confirming;
    btn.textContent = btn.dataset.label;

  }
}


/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {

  document.getElementById(
    'modalRoot'
  ).innerHTML = '';

}

/* =========================================================
   RATE AN ITEM (1–5 stars + comment)
========================================================= */

function openReviewDialog(orderItemId) {

  const order = allOrders.find(o => Number(o.id) === Number(orderItemId));
  if (!order) return;

  let rating = Number(order.review_rating) || 0;

  openDialog({
    title: order.review_rating ? 'Edit your review' : 'Rate this item',
    sub: escapeHtml(order.product_name) + ' · from ' + escapeHtml(order.vendor_name || 'the seller'),
    body: `
      <label>Your rating</label>
      <div class="star-picker" id="starPicker" role="radiogroup" aria-label="Rating">
        ${[1, 2, 3, 4, 5].map(n => `
          <button type="button" data-star="${n}" role="radio" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}
      </div>
      <div class="pdialog__hint" id="starText"></div>
      <label for="reviewComment">Tell others about it (optional)</label>
      <textarea id="reviewComment" maxlength="1000" placeholder="How healthy was the plant? Was it packed well?">${escapeHtml(order.review_comment || '')}</textarea>
      <div class="pdialog__hint">Your first name and last initial are shown with your review.</div>`,
    actions: `
      <button type="button" class="btn btn--ghost" onclick="closeDialog()">Cancel</button>
      <button type="button" class="btn btn--primary" id="saveReviewBtn">Submit review</button>`
  });

  const words = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

  function paint() {
    document.querySelectorAll('#starPicker [data-star]').forEach(b => {
      const on = Number(b.dataset.star) <= rating;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(Number(b.dataset.star) === rating));
    });
    document.getElementById('starText').textContent = rating ? words[rating] : 'Tap a star';
  }

  document.querySelectorAll('#starPicker [data-star]').forEach(b => {
    b.addEventListener('click', () => { rating = Number(b.dataset.star); paint(); });
  });
  paint();

  document.getElementById('saveReviewBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!rating) return dialogError('Please choose 1 to 5 stars.');
    btn.disabled = true;
    try {
      const result = await postJson('../customer_php/reviews.php', {
        order_item_id: order.id,
        rating,
        comment: document.getElementById('reviewComment').value
      });
      if (!result.success) throw new Error(result.message);
      closeDialog();
      closeModal();
      showToast(result.message);
      loadOrders();
    } catch (err) {
      dialogError(err.message || 'Could not save your review.');
      btn.disabled = false;
    }
  });
}


/* =========================================================
   RETURN / REFUND REQUEST
========================================================= */

function openReturnDialog(orderItemId) {

  const order = allOrders.find(o => Number(o.id) === Number(orderItemId));
  if (!order) return;

  openDialog({
    title: 'Return / Refund',
    sub: escapeHtml(order.product_name) + ' × ' + order.quantity + ' · refund ' + formatPeso(order.total_amount),
    body: `
      <label for="returnReason">What went wrong?</label>
      <select id="returnReason">
        <option value="">Choose a reason…</option>
        ${RETURN_REASONS.map(r => `<option>${escapeHtml(r)}</option>`).join('')}
      </select>
      <label for="returnDetails">Describe the problem</label>
      <textarea id="returnDetails" maxlength="1000" placeholder="e.g. The leaves were crushed and the pot was broken."></textarea>
      <label for="returnPhoto">Photo (optional, helps the seller decide)</label>
      <input type="file" id="returnPhoto" accept="image/jpeg,image/png,image/webp" />
      <div class="pdialog__hint">
        The seller has to accept or decline. If they decline, you can ask Punlaan to review it.
        Returns are allowed within ${RETURN_DAYS} days after delivery (until ${formatDate(order.return_deadline)}).
      </div>`,
    actions: `
      <button type="button" class="btn btn--ghost" onclick="closeDialog()">Cancel</button>
      <button type="button" class="btn btn--primary" id="sendReturnBtn">Send request</button>`
  });

  document.getElementById('sendReturnBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const reason = document.getElementById('returnReason').value;
    const details = document.getElementById('returnDetails').value.trim();
    const photo = document.getElementById('returnPhoto').files[0];

    if (!reason) return dialogError('Please choose a reason.');
    if (details.length < 10) return dialogError('Please describe the problem (at least 10 characters).');
    if (photo && photo.size > 3 * 1048576) return dialogError('The photo is larger than 3 MB.');

    const data = new FormData();
    data.append('action', 'request');
    data.append('order_item_id', order.id);
    data.append('reason', reason);
    data.append('details', details);
    if (photo) data.append('photo', photo);

    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const response = await fetch('../customer_php/returns.php', { method: 'POST', credentials: 'same-origin', body: data });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      closeDialog();
      closeModal();
      showToast(result.message);
      loadOrders();
    } catch (err) {
      dialogError(err.message || 'Could not send the request.');
      btn.disabled = false;
      btn.textContent = 'Send request';
    }
  });
}


/* Seller declined → ask Punlaan (admin) to decide */
function openEscalateDialog(orderItemId) {

  const order = allOrders.find(o => Number(o.id) === Number(orderItemId));
  if (!order) return;

  openDialog({
    title: 'Ask Punlaan to review',
    sub: escapeHtml(order.product_name) + ' · the seller declined your return',
    body: `
      ${order.return_seller_note ? `<div class="pdialog__hint"><strong>Seller's reason:</strong> ${escapeHtml(order.return_seller_note)}</div>` : ''}
      <label for="disputeNote">Why do you disagree?</label>
      <textarea id="disputeNote" maxlength="1000" placeholder="Explain what happened. An admin will read both sides and decide."></textarea>`,
    actions: `
      <button type="button" class="btn btn--ghost" onclick="closeDialog()">Cancel</button>
      <button type="button" class="btn btn--primary" id="sendDisputeBtn">Send to Punlaan</button>`
  });

  document.getElementById('sendDisputeBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const note = document.getElementById('disputeNote').value.trim();
    if (note.length < 10) return dialogError('Please explain (at least 10 characters).');

    const data = new FormData();
    data.append('action', 'escalate');
    data.append('return_id', order.return_id);
    data.append('note', note);

    btn.disabled = true;
    try {
      const response = await fetch('../customer_php/returns.php', { method: 'POST', credentials: 'same-origin', body: data });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      closeDialog();
      closeModal();
      showToast(result.message);
      loadOrders();
    } catch (err) {
      dialogError(err.message || 'Could not send it.');
      btn.disabled = false;
    }
  });
}


/* Tap twice to withdraw (no pop-up) */
async function withdrawReturn(btn, returnId) {

  if (!btn.dataset.confirming) {
    btn.dataset.confirming = '1';
    btn.textContent = 'Tap again to withdraw';
    setTimeout(() => {
      if (btn.isConnected) { delete btn.dataset.confirming; btn.textContent = 'Withdraw request'; }
    }, 3500);
    return;
  }

  const data = new FormData();
  data.append('action', 'withdraw');
  data.append('return_id', returnId);

  btn.disabled = true;
  try {
    const response = await fetch('../customer_php/returns.php', { method: 'POST', credentials: 'same-origin', body: data });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    closeModal();
    showToast(result.message);
    loadOrders();
  } catch (err) {
    showToast(err.message || 'Could not withdraw it.', true);
    btn.disabled = false;
  }
}
