
const STATUS_CONFIG = {
  'to-pack':   { label: 'To Pack',     cls: 'vord__status--to-pack',   dot: 'vord__status-dot--to-pack' },
  packed:      { label: 'Packed',       cls: 'vord__status--packed',    dot: 'vord__status-dot--packed' },
  shipping:   { label: 'Shipping',     cls: 'vord__status--shipping',  dot: 'vord__status-dot--shipping' },
  shipped:     { label: 'Shipped',      cls: 'vord__status--shipped',    dot: 'vord__status-dot--shipped' },
  completed:   { label: 'Completed',    cls: 'vord__status--completed',  dot: 'vord__status-dot--completed' },
  cancelled:   { label: 'Cancelled',    cls: 'vord__status--cancelled',  dot: 'vord__status-dot--cancelled' },
};

const ORDER_STATUSES = [
  { key: 'to-pack',   label: 'To Pack',   desc: 'Order received, waiting to be packed.' },
  { key: 'packed',    label: 'Packed',     desc: 'Items packed and ready for courier pickup.' },
  { key: 'shipping', label: 'Shipping',   desc: 'Courier has picked up the order.' },
  { key: 'shipped',   label: 'Shipped',    desc: 'Order is in transit to the customer.' },
  { key: 'completed', label: 'Completed', desc: 'Delivered to the customer. (Customers can also confirm this themselves.)' },
  { key: 'cancelled', label: 'Cancel order', desc: 'Cancel this item — the quantity goes back into your stock.' },
];

const FILTERS = [
  { key: 'all',       label: 'All Orders' },
  { key: 'to-pack',   label: 'To Pack' },
  { key: 'packed',    label: 'Packed' },
  { key: 'shipping',  label: 'Shipping' },
  { key: 'shipped',   label: 'Shipped' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

/* Customer "avatar": their initials (no photos of real customers are shown) */
function customerInitials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/*
  Orders saved since the address book store "Name | phone | address".
  Older orders store only the address.
*/
function parseShipping(o) {
  const parts = String(o.shipping_address || '').split(' | ');
  return parts.length === 3
    ? { name: parts[0], phone: parts[1], address: parts[2] }
    : { name: o.customer_name || '', phone: o.customer_phone || '', address: o.shipping_address || '' };
}

/* Product images are stored relative to FrontEnd/ */
function productImageSrc(path) {
  if (!path) return '';
  return /^(https?:|data:|\/|\.\.\/)/.test(path) ? path : '../../FrontEnd/' + path;
}

function mapLink(o) {
  return (o.shipping_lat != null && o.shipping_lng != null)
    ? `https://www.google.com/maps?q=${o.shipping_lat},${o.shipping_lng}`
    : '';
}

let allOrders = [];
let couriers = [];
let sellerInfo = {};
let currentFilter = 'all';
let updatingOrder = null;
let selectedStatus = null;

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    const user =
      await getCurrentUser();

    if (!user) {
      return;
    }

    if (
      Number(user.is_vendor) !== 1
    ) {
      return;
    }

    document.getElementById('app').innerHTML =
      renderLayout('order-processing');

    document.getElementById('pageContent').innerHTML =
      pageHtml();

    loadOrders();

  }
);
function pageHtml() {
  return `
    <div class="vord">
      <div class="vord__main">
        <div class="stats" id="stats"></div>
        <div class="toolbar">
          <div class="toolbar__title">Order Processing</div>
          <div class="filters" id="filters"></div>
          <button
  class="btn btn--ghost"
  onclick="exportOrders()"
>
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>

  Export
</button>
        </div>
        <div class="sort-row">
          Sort by:
          <select class="sort-select" id="sortSelect" onchange="renderTable()">
            <option value="date">Order Date</option>
            <option value="total">Total Amount</option>
            <option value="status">Status</option>
          </select>
        </div>
        <div class="vord__table-wrap">
          <table class="vord__table">
            <thead>
              <tr>
                <th>Order ID</th><th>Customer</th><th>Product</th>
                <th>Qty</th><th>Total</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr><td colspan="7" class="loading">Loading orders…</td></tr>
            </tbody>
          </table>
        </div>

        <section class="vret" id="returns">
          <div class="toolbar" style="margin-top:26px">
            <div class="toolbar__title">Returns &amp; refunds</div>
          </div>
          <div id="returnsList"><div class="loading">Loading returns…</div></div>
        </section>
      </div>
      <aside class="vord__aside">
        <div class="vord__aside-section">
          <div class="vord__aside-title">Needs your attention</div>
          <div id="asideTasks"><div class="vord__aside-item-sub">Loading…</div></div>
        </div>
        <div class="vord__aside-section">
          <div class="vord__aside-title">How orders move</div>
          <div class="vord__aside-item-sub" style="line-height:1.6">
            To Pack → Packed → Shipping → Shipped → Completed.<br>
            You can cancel until the order is shipping; cancelled items go back into your stock
            (paid items are refunded automatically).
            Customers can cancel while it's still To Pack, and confirm when they receive it.<br>
            GCash / Maya / card orders can be packed once they show <strong>Paid</strong>.
          </div>
        </div>
      </aside>
    </div>
    <div id="modalRoot"></div>
  `;
}

/* ---------- Load orders ---------- */
async function loadOrders() {

  try {

    const response =
      await fetch(
        '../vendor_php/get_vendor_orders.php',
        {
          credentials: 'same-origin'
        }
      );

    const result =
      await response.json();

    if (!result.success) {

      throw new Error(
        result.message ||
        'Could not load orders.'
      );

    }

    allOrders =
      result.orders || [];

    couriers = result.couriers || [];
    sellerInfo = result.seller || {};

    renderStats();

    renderFilters();

    renderTable();

    renderAside();

    loadReturns();

  } catch (err) {

    document.getElementById(
      'tableBody'
    ).innerHTML =
      `<tr>
        <td colspan="7" class="loading">
          Could not load orders.
          ${escapeHtml(err.message)}
        </td>
      </tr>`;

  }

}
/* ---------- "Needs your attention" (real counts) ---------- */
function renderAside() {
  const count = (s) => allOrders.filter(o => o.status === s).length;

  const openReturns = allOrders.filter(o => o.return_status === 'requested').length;

  const tasks = [
    { n: openReturns,       urgent: true,  label: 'return request(s)',  sub: 'Accept (refund) or decline below.',          filter: 'returns' },
    { n: count('to-pack'),  urgent: true,  label: 'to pack',            sub: 'Pack these and mark them Packed.',          filter: 'to-pack' },
    { n: count('packed'),   urgent: false, label: 'waiting for courier', sub: 'Mark Shipping once the courier picks up.', filter: 'packed' },
    { n: count('shipped'),  urgent: false, label: 'on the way',          sub: 'Mark Completed when delivered.',           filter: 'shipped' },
  ].filter(t => t.n > 0);

  document.getElementById('asideTasks').innerHTML = tasks.length
    ? tasks.map(t => `
        <button type="button" class="vord__aside-item vord__aside-item--link" onclick="setFilter('${t.filter}')">
          <div class="vord__aside-item-title">
            <span class="vord__aside-dot vord__aside-dot--${t.urgent ? 'red' : 'yellow'}"></span>
            ${t.n} order${t.n === 1 ? '' : 's'} ${t.label}
          </div>
          <div class="vord__aside-item-sub">${t.sub}</div>
        </button>`).join('')
    : '<div class="vord__aside-item-sub">You\'re all caught up. 🌱</div>';
}

/* ---------- Stats ---------- */
function renderStats() {
  const toPack = allOrders.filter(o => o.status === 'to-pack').length;
  const inTransit = allOrders.filter(o => o.status === 'shipping' || o.status === 'shipped').length;
  const completed = allOrders.filter(o => o.status === 'completed').length;

  document.getElementById('stats').innerHTML = `
    <div class="stat">
      <div>
        <div class="stat__label">Orders To Pack</div>
        <div class="stat__value">${toPack}</div>
        <div class="stat__sub"><span class="stat__badge stat__badge--yellow">Action needed</span></div>
      </div>
      <div class="stat__icon stat__icon--amber">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
      </div>
    </div>
    <div class="stat">
      <div>
        <div class="stat__label">In Transit</div>
        <div class="stat__value">${inTransit}</div>
        <div class="stat__sub">Being shipped</div>
      </div>
      <div class="stat__icon stat__icon--teal">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
      </div>
    </div>
    <div class="stat">
      <div>
        <div class="stat__label">Completed</div>
        <div class="stat__value">${completed}</div>
        <div class="stat__sub">Delivered orders</div>
      </div>
      <div class="stat__icon stat__icon--green">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
    </div>
  `;
}

/* ---------- Filters ---------- */
function renderFilters() {
  const el = document.getElementById('filters');
  el.innerHTML = FILTERS.map(f =>
    `<button class="filter-btn${f.key === currentFilter ? ' filter-btn--active' : ''}" onclick="setFilter('${f.key}')">${f.label}</button>`
  ).join('');
}

function setFilter(key) {
  if (key === 'returns') {
    document.getElementById('returns')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  currentFilter = key;
  renderFilters();
  renderTable();
}

/* ---------- Table ---------- */
function renderTable() {
  let filtered = currentFilter === 'all' ? allOrders : allOrders.filter(o => o.status === currentFilter);
  const sortBy = document.getElementById('sortSelect')?.value || 'date';

  if (sortBy === 'total') filtered.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
  else if (sortBy === 'status') filtered.sort((a, b) => (a.status || '').localeCompare(b.status || ''));

  const body = document.getElementById('tableBody');

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="loading">No orders in this category.</td></tr>`;
    return;
  }

  body.innerHTML = filtered.map(o => {
    const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG['to-pack'];
    const total = Number(o.total_amount || 0);
    const ship = parseShipping(o);
    const canUpdate = (o.next_statuses || []).length > 0;

    return `
      <tr data-order-id="${Number(o.order_id)}" data-item-id="${Number(o.id)}">
        <td>
          <div class="vord__order-id">${escapeHtml(o.order_number)}</div>
          <div class="vord__order-date">${formatDate(o.order_date)}</div>
          <div class="vord__order-date" title="How the customer pays">${paymentText(o)}</div>
          ${o.awaiting_payment && o.status === 'to-pack' ? '<span class="ptag ptag--warn">Waiting for payment</span>' : ''}
          ${o.return_status ? `<span class="ptag ${o.return_status === 'requested' ? 'ptag--warn' : o.return_status === 'refunded' ? 'ptag--good' : 'ptag--info'}">Return: ${escapeHtml(o.return_status)}</span>` : ''}
        </td>
        <td>
          <div class="vord__customer">
            <span class="vord__customer-avatar vord__customer-avatar--initials" aria-hidden="true">${escapeHtml(customerInitials(o.customer_name))}</span>
            <div>
              <div class="vord__customer-name">${escapeHtml(o.customer_name || '')}</div>
              <div class="vord__customer-loc">${escapeHtml(ship.address)}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="vord__product">
            ${o.product_image ? `<img src="${escapeHtml(productImageSrc(o.product_image))}" alt="" class="vord__product-thumb" onerror="this.remove()" />` : ''}
            <span class="vord__product-name">${escapeHtml(o.product_name || '')}</span>
          </div>
        </td>
        <td><span class="vord__qty">${o.quantity || 1}</span></td>
        <td><span class="vord__total">₱${total.toLocaleString()}</span></td>
        <td>
          <span class="vord__status ${sc.cls}">
            <span class="vord__status-dot ${sc.dot}"></span>
            ${sc.label}
          </span>
        </td>
        <td>
          ${o.courier ? `<div class="vord__order-date" style="margin-bottom:6px">${escapeHtml(trackingLine(o))}</div>` : ''}
          <div class="vord__actions">
            <button class="vord__action-btn vord__action-btn--view" onclick="openViewModal('${o.id}')">View</button>
            ${o.status !== 'cancelled' ? `<button class="vord__action-btn vord__action-btn--view" onclick="printPackingSlip(${Number(o.order_id)})" title="Print a packing slip to put in the parcel">Print</button>` : ''}
            ${canUpdate
              ? `<button class="vord__action-btn vord__action-btn--update" onclick="openUpdateModal('${o.id}')">Update</button>`
              : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Opened from a notification → scroll to that order
  highlightLinked();
}

/* ---------- Update Modal ---------- */
function openUpdateModal(orderId) {
  orderId = Number(orderId);

  const o = allOrders.find(x => Number(x.id) === orderId);

  if (!o) {
    console.error("Order not found:", orderId, allOrders);
    showToast("Order not found.", true);
    return;
  }

  updatingOrder = { ...o };

  // Only the next allowed steps can be picked; the first one is pre-selected
  const next = o.next_statuses || [];
  if (!next.length) {
    showToast('This order is ' + (STATUS_CONFIG[o.status] || {}).label + ' and can no longer be changed.', true);
    return;
  }
  selectedStatus = next[0];

  document.getElementById('modalRoot').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal__header">
          <div>
            <div class="modal__title">Update Order Status</div>
            <div class="modal__subtitle">${escapeHtml(o.order_number)} — ${escapeHtml(o.customer_name || '')}</div>
          </div>
          <button class="modal__close" onclick="closeModal()">×</button>
        </div>
        <div class="modal__body">
          <div style="margin-bottom:16px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#74a98c;margin-bottom:8px;">Current Status</div>
            <span class="vord__status ${(STATUS_CONFIG[o.status] || STATUS_CONFIG['to-pack']).cls}">
              <span class="vord__status-dot ${(STATUS_CONFIG[o.status] || STATUS_CONFIG['to-pack']).dot}"></span>
              ${(STATUS_CONFIG[o.status] || STATUS_CONFIG['to-pack']).label}
            </span>
          </div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#74a98c;margin-bottom:12px;">Set New Status</div>
          <div class="vord__status-options" id="statusOptions"></div>
          <div id="trackingFields" style="margin-top:16px;" hidden>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#74a98c;margin-bottom:8px;">Courier &amp; tracking number</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <select id="trackCourier" class="sort-select" style="flex:1;min-width:150px">
                <option value="">Choose courier…</option>
                ${couriers.map(c => `<option value="${escapeHtml(c)}"${c === o.courier ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
              <input id="trackNumber" class="sort-select" style="flex:2;min-width:170px" maxlength="40"
                placeholder="Tracking number" value="${escapeHtml(o.tracking_number || '')}" autocomplete="off">
            </div>
            <div id="trackHint" style="font-size:12px;color:#8aa596;margin-top:6px"></div>
          </div>
          <div style="margin-top:16px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#74a98c;margin-bottom:8px;">Note (optional)</div>
            <textarea class="vord__note-textarea" id="statusNote" placeholder="Add a note about this status change…"></textarea>
          </div>
        </div>
        <div class="modal__footer">
          <button class="modal__btn modal__btn--cancel" onclick="closeModal()">Cancel</button>
          <button class="modal__btn modal__btn--save" onclick="saveStatus()">Save Changes</button>
        </div>
      </div>
    </div>
  `;
  renderStatusOptions();
}

function renderStatusOptions() {
  const next = (updatingOrder && updatingOrder.next_statuses) || [];
  document.getElementById('statusOptions').innerHTML = ORDER_STATUSES.filter(s => next.includes(s.key)).map(s => `
    <button class="vord__status-option${s.key === selectedStatus ? ' vord__status-option--selected' : ''}" onclick="selectStatus('${s.key}')">
      <span class="vord__status-option-radio"><span class="vord__status-option-radio-inner"></span></span>
      <span class="vord__status-option-body">
        <span class="vord__status-option-label">${s.label}</span>
        <span class="vord__status-option-desc">${s.desc}</span>
      </span>
    </button>
  `).join('');

  // Courier + tracking number: when the parcel leaves (required for Shipped)
  const box = document.getElementById('trackingFields');
  if (box) {
    box.hidden = !['shipping', 'shipped'].includes(selectedStatus);
    document.getElementById('trackHint').textContent = selectedStatus === 'shipped'
      ? 'Required. The buyer sees it in My Orders to track the parcel.'
      : 'Optional now — you can also add it when you mark it Shipped.';
    syncTrackNumber();
  }
}

/* "Own delivery" has no tracking number */
function syncTrackNumber() {
  const courier = document.getElementById('trackCourier');
  const number = document.getElementById('trackNumber');
  if (!courier || !number) return;
  const own = courier.value === 'Own delivery';
  number.disabled = own;
  if (own) number.value = '';
  courier.onchange = syncTrackNumber;
}

function trackingLine(o) {
  if (!o.courier) return '';
  return o.tracking_number ? `${o.courier} · ${o.tracking_number}` : o.courier;
}

function selectStatus(key) {
  selectedStatus = key;
  renderStatusOptions();
}

async function saveStatus() {

  if (!updatingOrder) {
    return;
  }

  try {

    const note =
      document.getElementById(
        'statusNote'
      )?.value.trim() || '';

    const courier = document.getElementById('trackCourier')?.value || '';
    const trackingNumber = document.getElementById('trackNumber')?.value.trim() || '';
    const sendsTracking = ['shipping', 'shipped'].includes(selectedStatus);

    if (selectedStatus === 'shipped' && (!courier || (courier !== 'Own delivery' && !trackingNumber))) {
      showToast('Choose the courier and enter the tracking number first.', true);
      return;
    }

    const response =
      await fetch(
        '../vendor_php/update_vendor_order_status.php',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          credentials:
            'same-origin',

          body: JSON.stringify({
            order_item_id:
              updatingOrder.id,

            status:
              selectedStatus,
            note:
              note,
            courier: sendsTracking ? courier : '',
            tracking_number: sendsTracking ? trackingNumber : ''
          })
        }
      );
    const result =
      await response.json();
    if (!result.success) {

      throw new Error(
        result.message ||
        'Could not update order.'
      );
    }
    closeModal();

    showToast(
      result.message || 'Order status updated!'
    );

    loadOrders();

  } catch (err) {

    showToast(
      'Could not update: ' +
      err.message,
      true
    );

  }

}

/* ---------- View Modal ---------- */
function openViewModal(orderId) {
  orderId = Number(orderId);

  const o = allOrders.find(x => Number(x.id) === orderId);

  if (!o) {
    console.error("Order not found:", orderId, allOrders);
    showToast("Order not found.", true);
    return;
  }
  const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG['to-pack'];
  const total = Number(o.total_amount || 0);
  const ship = parseShipping(o);
  const map = mapLink(o);
  const canUpdate = (o.next_statuses || []).length > 0;

  document.getElementById('modalRoot').innerHTML = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="vord__view-modal">
        <div class="vord__view-body">
          <div class="vord__view-header-row">
            <div>
              <div class="vord__view-order-id">${escapeHtml(o.order_number)}</div>
              <div class="vord__view-date">${formatDate(o.order_date)}</div>
            </div>
            <button class="modal__close" onclick="closeModal()">×</button>
          </div>
          <div class="vord__view-section">
            <div class="vord__view-section-label">Status</div>
            <span class="vord__status ${sc.cls}"><span class="vord__status-dot ${sc.dot}"></span>${sc.label}</span>
            ${o.status_note ? `<div class="vord__view-note">${escapeHtml(o.status_note)}</div>` : ''}
            ${o.courier ? `<div class="vord__view-note"><strong>Courier:</strong> ${escapeHtml(trackingLine(o))}</div>` : ''}
          </div>
          <div class="vord__view-section">
            <div class="vord__view-section-label">Deliver to</div>
            <div class="vord__view-customer-row">
              <span class="vord__view-customer-avatar vord__customer-avatar--initials" aria-hidden="true">${escapeHtml(customerInitials(ship.name || o.customer_name))}</span>
              <div>
                <div class="vord__view-customer-name">${escapeHtml(ship.name || o.customer_name || '')}</div>
                ${ship.phone ? `<div class="vord__view-customer-loc"><a href="tel:${escapeHtml(ship.phone)}" class="vord__link">${escapeHtml(ship.phone)}</a></div>` : ''}
                <div class="vord__view-customer-loc">${escapeHtml(ship.address)}</div>
                ${map ? `<a href="${map}" target="_blank" rel="noopener" class="vord__link vord__map-link">📍 Open pinned location in Google Maps</a>` : ''}
              </div>
            </div>
          </div>
          <div class="vord__view-section">
            <div class="vord__view-section-label">Item</div>
            <div class="vord__view-item">
              ${o.product_image ? `<img src="${escapeHtml(productImageSrc(o.product_image))}" alt="" class="vord__view-item-thumb" onerror="this.remove()" />` : ''}
              <span class="vord__view-item-name">${escapeHtml(o.product_name || '')}</span>
              <span class="vord__view-item-qty">×${o.quantity || 1}</span>
              <span class="vord__view-item-price">₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div class="vord__view-section">
            <div class="vord__view-section-label">Your earnings for this item</div>
            <div class="vord__view-summary">
              <div class="vord__view-summary-row"><span>${o.quantity || 1} × ₱${Number(o.unit_price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span><span>₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
              <div class="vord__view-summary-row vord__view-summary-row--total"><span>Total</span><span>₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></div>
              ${o.seller_shipping_fee != null ? `
                <div class="vord__view-summary-row"><span>Shipping paid by the buyer (whole order${o.shipping_zone ? ', ' + escapeHtml(o.shipping_zone) : o.distance_km != null ? ', ' + Number(o.distance_km) + ' km' : ''})</span><span>${formatPeso(o.seller_shipping_fee)}</span></div>` : ''}
              <div class="vord__view-summary-row"><span style="font-size:12px;color:#8aa596">Punlaan's commission is deducted in Sales &amp; Payouts.</span></div>
            </div>
          </div>
          <div class="modal__footer" style="padding-left:0;padding-right:0;padding-bottom:0;">
            <a class="modal__btn modal__btn--cancel" href="../customer/Messages.html?customer_id=${Number(o.customer_id)}">Chat with buyer</a>
            ${o.status !== 'cancelled' ? `<button class="modal__btn modal__btn--cancel" onclick="printPackingSlip(${Number(o.order_id)})">Print packing slip</button>` : ''}
            <button class="modal__btn modal__btn--cancel" onclick="closeModal()">Close</button>
            ${canUpdate ? `<button class="modal__btn modal__btn--save" onclick="closeModal();openUpdateModal('${o.id}')">Update Status</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modalRoot').innerHTML = '';
  updatingOrder = null;
  selectedStatus = null;
}
function exportOrders() {

  let filtered =
    currentFilter === 'all'
      ? [...allOrders]
      : allOrders.filter(
          o => o.status === currentFilter
        );

  if (filtered.length === 0) {
    showToast(
      'There are no orders to export.',
      true
    );
    return;
  }

  const headers = [
    'Order ID',
    'Order Date',
    'Customer',
    'Shipping Address',
    'Product',
    'Quantity',
    'Total',
    'Status'
  ];

  const rows = filtered.map(o => [
    o.order_number,
    o.order_date,
    o.customer_name || '',
    o.shipping_address || '',
    o.product_name || '',
    o.quantity || 0,
    Number(o.total_amount || 0).toFixed(2),
    o.status || ''
  ]);

  const csv = [
    headers,
    ...rows
  ]
    .map(row =>
      row.map(value =>
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    )
    .join('\n');

  const blob =
    new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;'
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href = url;

  link.download =
    `plant-market-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  showToast(
    'Orders exported successfully!'
  );
}

/* ---------- Packing slip (one per order: all of this seller's items) ---------- */
function printPackingSlip(orderId) {
  const items = allOrders.filter(o => Number(o.order_id) === Number(orderId) && o.status !== 'cancelled');
  if (!items.length) {
    showToast('Nothing to pack in this order.', true);
    return;
  }

  const first = items[0];
  const ship = parseShipping(first);
  const itemsTotal = items.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const shippingFee = Number(first.seller_shipping_fee || 0);
  const cod = first.payment_method === 'cod' && first.payment_status !== 'paid';
  const from = [sellerInfo.shop_city, sellerInfo.shop_province].filter(Boolean).join(', ');
  const e = escapeHtml;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    showToast('Allow pop-ups for this site to print the packing slip.', true);
    return;
  }

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Packing slip ${e(first.order_number)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 20px; margin: 0; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 10px; }
  .order { font-size: 22px; font-weight: 700; letter-spacing: .5px; }
  .boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 16px 0; }
  .box { border: 1.5px solid #111; border-radius: 6px; padding: 10px 12px; font-size: 14px; line-height: 1.45; }
  .box h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px; color: #555; }
  .to { font-size: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #ccc; }
  th { font-size: 11px; text-transform: uppercase; color: #555; }
  td.n, th.n { text-align: right; }
  .cod { margin-top: 16px; border: 3px solid #111; padding: 10px 14px; font-size: 18px; font-weight: 700; display: flex; justify-content: space-between; }
  .paid { margin-top: 16px; font-size: 15px; font-weight: 700; }
  .check { width: 16px; height: 16px; border: 1.5px solid #111; display: inline-block; }
  .foot { margin-top: 26px; font-size: 12px; color: #555; }
  @media print { body { margin: 10mm; } .noprint { display: none; } }
</style></head><body>
  <div class="top">
    <div><h1>🌿 Punlaan — Packing slip</h1><div style="font-size:13px;color:#555;margin-top:4px">Ordered ${e(formatDate(first.order_date))}</div></div>
    <div class="order">${e(first.order_number)}</div>
  </div>
  <div class="boxes">
    <div class="box to"><h2>Deliver to</h2>
      <strong>${e(ship.name || first.customer_name || '')}</strong><br>
      ${ship.phone ? e(ship.phone) + '<br>' : ''}${e(ship.address)}
    </div>
    <div class="box"><h2>From</h2>
      <strong>${e(sellerInfo.name || '')}</strong><br>
      ${sellerInfo.phone ? e(sellerInfo.phone) + '<br>' : ''}${e(from)}
      ${first.courier ? `<h2 style="margin-top:10px">Courier</h2>${e(trackingLine(first))}` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th style="width:28px"></th><th>Item</th><th class="n">Qty</th><th class="n">Amount</th></tr></thead>
    <tbody>
      ${items.map(o => `<tr><td><span class="check"></span></td><td>${e(o.product_name)}</td><td class="n">${Number(o.quantity)}</td><td class="n">${e(formatPeso(o.total_amount))}</td></tr>`).join('')}
      <tr><td></td><td>Shipping</td><td></td><td class="n">${e(formatPeso(shippingFee))}</td></tr>
    </tbody>
  </table>
  ${cod
    ? `<div class="cod"><span>CASH ON DELIVERY — collect</span><span>${e(formatPeso(itemsTotal + shippingFee))}</span></div>`
    : `<div class="paid">PAID ONLINE — do not collect cash.</div>`}
  <div class="foot">Handle with care — live plants. Questions? Message the seller on Punlaan.</div>
  <p class="noprint" style="margin-top:20px"><button onclick="window.print()">Print</button></p>
  <script>window.onload = () => window.print();<\/script>
</body></html>`);
  win.document.close();
}

/* How the customer pays (cash to collect on delivery, or already paid online) */
function paymentText(o) {
  const names = { cod: 'Cash on Delivery', gcash: 'GCash', maya: 'Maya', card: 'Card' };
  const name = names[o.payment_method] || 'Cash on Delivery';
  if (o.payment_status === 'paid') return escapeHtml(name) + ' · Paid';
  if (o.payment_status === 'refunded') return escapeHtml(name) + ' · Refunded';
  return o.payment_method === 'cod' || !o.payment_method
    ? escapeHtml(name) + ' · Collect on delivery'
    : escapeHtml(name) + ' · Not paid yet';
}

/* =========================================================
   RETURNS & REFUNDS (buyer asked within the return period)
   Accept → the buyer is refunded · Decline → the buyer may
   ask Punlaan to decide (dispute)
========================================================= */

let allReturns = [];

const RETURN_TAGS = {
  requested: 'ptag--warn',
  rejected: 'ptag--bad',
  disputed: 'ptag--info',
  refunded: 'ptag--good',
  closed: '',
  cancelled: ''
};

async function loadReturns() {
  const box = document.getElementById('returnsList');
  if (!box) return;

  try {
    const response = await fetch('../vendor_php/returns.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    allReturns = result.returns || [];
  } catch (err) {
    box.innerHTML = `<div class="empty-state">Could not load returns. ${escapeHtml(err.message)}</div>`;
    return;
  }

  if (!allReturns.length) {
    box.innerHTML = '<div class="empty-state">No return requests. 🌱</div>';
  } else {
    box.innerHTML = allReturns.map(r => `
      <div class="vret__card${r.status === 'requested' ? ' vret__card--open' : ''}" data-return-id="${Number(r.return_id)}">
        ${r.product_image ? `<img class="vret__thumb" src="${escapeHtml(productImageSrc(r.product_image))}" alt="" onerror="this.remove()">` : ''}
        <div class="vret__body">
          <div class="vret__top">
            <strong>${escapeHtml(r.product_name)} × ${r.quantity}</strong>
            <span class="ptag ${RETURN_TAGS[r.status] || ''}">${escapeHtml(r.status_label)}</span>
          </div>
          <div class="vret__meta">${escapeHtml(r.order_number)} · ${escapeHtml(r.customer_name)} · ${formatDate(r.created_at)} · refund ${formatPeso(r.refund_amount)}</div>
          <div class="vret__reason"><strong>${escapeHtml(r.reason)}</strong> — ${escapeHtml(r.details || '')}</div>
          ${r.photo ? `<a class="vret__photo" href="../../${escapeHtml(r.photo)}" target="_blank" rel="noopener"><img src="../../${escapeHtml(r.photo)}" alt="Buyer's photo"></a>` : ''}
          ${r.seller_note ? `<div class="vret__note"><strong>Your answer:</strong> ${escapeHtml(r.seller_note)}</div>` : ''}
          ${r.dispute_note ? `<div class="vret__note"><strong>Buyer's dispute:</strong> ${escapeHtml(r.dispute_note)}</div>` : ''}
          ${r.admin_note ? `<div class="vret__note"><strong>Punlaan:</strong> ${escapeHtml(r.admin_note)}</div>` : ''}
          ${r.status === 'requested' ? `
            <div class="vret__actions">
              <button class="btn btn--primary" onclick="acceptReturn(${r.return_id})">Accept &amp; refund</button>
              <button class="btn btn--ghost" onclick="declineReturn(${r.return_id})">Decline</button>
            </div>` : ''}
        </div>
      </div>`).join('');
  }

  if (new URLSearchParams(location.search).get('return')) {
    highlightLinked();
  } else if (location.hash === '#returns') {
    document.getElementById('returns').scrollIntoView();
  }
}

function acceptReturn(returnId) {
  const r = allReturns.find(x => x.return_id === returnId);
  if (!r) return;

  openDialog({
    title: 'Accept the return?',
    sub: escapeHtml(r.product_name) + ' · ' + escapeHtml(r.order_number),
    body: `
      <p style="margin:0;font-size:14px;line-height:1.5">
        The buyer gets <strong>${formatPeso(r.refund_amount)}</strong> back and this item won't count toward your earnings.
        Paid online → refunded through PayMongo. Cash on delivery → Punlaan returns the cash.
      </p>
      <label for="returnNote">Message to the buyer (optional)</label>
      <textarea id="returnNote" maxlength="1000" placeholder="e.g. Sorry about that! No need to send the plant back."></textarea>`,
    actions: `
      <button type="button" class="btn btn--ghost" onclick="closeDialog()">Cancel</button>
      <button type="button" class="btn btn--primary" id="confirmReturnBtn">Accept &amp; refund</button>`
  });

  document.getElementById('confirmReturnBtn').addEventListener('click', (e) => answerReturn(e.currentTarget, returnId, 'accept'));
}

function declineReturn(returnId) {
  const r = allReturns.find(x => x.return_id === returnId);
  if (!r) return;

  openDialog({
    title: 'Decline the return',
    sub: escapeHtml(r.product_name) + ' · ' + escapeHtml(r.order_number),
    body: `
      <label for="returnNote">Tell the buyer why</label>
      <textarea id="returnNote" maxlength="1000" placeholder="e.g. The photo shows the plant was healthy when delivered."></textarea>
      <div class="pdialog__hint">The buyer can ask Punlaan to review your answer. An admin then decides.</div>`,
    actions: `
      <button type="button" class="btn btn--ghost" onclick="closeDialog()">Cancel</button>
      <button type="button" class="btn btn--primary" id="confirmReturnBtn">Decline</button>`
  });

  document.getElementById('confirmReturnBtn').addEventListener('click', (e) => answerReturn(e.currentTarget, returnId, 'reject'));
}

async function answerReturn(btn, returnId, action) {
  const note = document.getElementById('returnNote').value.trim();
  if (action === 'reject' && note.length < 10) return dialogError('Please explain (at least 10 characters).');

  btn.disabled = true;
  try {
    const result = await postJson('../vendor_php/returns.php', { action, return_id: returnId, note });
    if (!result.success) throw new Error(result.message);
    closeDialog();
    showToast(result.message);
    loadOrders();
  } catch (err) {
    dialogError(err.message || 'Could not save your answer.');
    btn.disabled = false;
  }
}
