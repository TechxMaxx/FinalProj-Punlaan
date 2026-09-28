/* ============================================================
   Punlaan Admin — Order Oversight Page
   Real orders (orders/get_admin_orders.php). View only: the admin
   can open an order and see every item's status, but only the
   seller and the customer can change it.
   ============================================================ */
import { icon } from './admin-icons.js';

let ORDERS = [];

const state = {
  statusFilter: 'All',
  searchQuery: ''
};

const STATUS_FILTERS = [
  { key: 'All', label: 'All Orders', dotColor: null },
  { key: 'To Pack', label: 'To Pack', dotColor: 'var(--yellow-400)' },
  { key: 'Packed', label: 'Packed', dotColor: 'var(--green-500)' },
  { key: 'Shipping', label: 'Shipping', dotColor: 'var(--blue-400)' },
  { key: 'Shipped', label: 'Shipped', dotColor: 'var(--blue-400)' },
  { key: 'Completed', label: 'Completed', dotColor: 'var(--green-600)' },
  { key: 'Cancelled', label: 'Cancelled', dotColor: 'var(--red-500)' }
];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function peso(value) {
  return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusClass(status) {
  return {
    'To Pack': 'status-processing',
    'Packed': 'status-processing',
    'Shipping': 'status-shipped',
    'Shipped': 'status-shipped',
    'Completed': 'status-completed',
    'Cancelled': 'status-cancelled'
  }[status] || '';
}

function formatDate(value) {
  const date = new Date(String(value || '').replace(' ', 'T'));
  if (isNaN(date)) return value || 'Unknown';
  return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function showToast(message) {
  const old = document.getElementById('orders-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'orders-toast';
  el.className = 'settings-toast';
  el.style.background = 'var(--red-600)';
  el.innerHTML = `${icon('alertCircle', 14)} ${esc(message)}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

function filteredOrders() {
  const q = state.searchQuery.toLowerCase();

  return ORDERS.filter((o) => {
    const matchStatus = state.statusFilter === 'All' || o.status === state.statusFilter;
    const matchSearch =
      !q ||
      (o.id || '').toLowerCase().includes(q) ||
      (o.customer || '').toLowerCase().includes(q) ||
      (o.vendor || '').toLowerCase().includes(q) ||
      (o.products || '').toLowerCase().includes(q);

    return matchStatus && matchSearch;
  });
}

export async function loadOrders() {
  try {
    const response = await fetch('orders/get_admin_orders.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();

    if (!result.success) throw new Error(result.message || 'Failed to load orders.');

    ORDERS = result.orders || [];
  } catch (err) {
    console.error('Failed to load orders:', err);
    ORDERS = [];
  }

  renderOrders();
}

export function renderOrders() {
  const content = document.getElementById('content');
  const orders = filteredOrders();

  const toPack = ORDERS.filter((o) => o.status === 'To Pack').length;
  const inTransit = ORDERS.filter((o) => ['Packed', 'Shipping', 'Shipped'].includes(o.status)).length;
  const completedValue = ORDERS
    .filter((o) => o.status === 'Completed')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">
        Admin Side:
        <span class="accent">ORDER OVERSIGHT</span>
      </h1>

      <div class="stat-grid-3" style="margin-bottom:var(--space-5)">
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Waiting to be Packed</p>
            <p class="stat-card-value">${toPack}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">Awaiting seller action</p>
          </div>
          <div class="stat-icon-box" style="background:var(--yellow-50)">
            <span style="color:var(--yellow-500)">${icon('alertTriangle', 22)}</span>
          </div>
        </div>

        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">On the Way</p>
            <p class="stat-card-value">${inTransit}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">Packed, shipping or shipped</p>
          </div>
          <div class="stat-icon-box" style="background:var(--blue-50, var(--green-50))">
            <span style="color:var(--blue-500, var(--green-600))">${icon('package', 22)}</span>
          </div>
        </div>

        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Completed Order Value</p>
            <p class="stat-card-value" style="color:var(--green-700)">${peso(completedValue)}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">Delivered orders</p>
          </div>
          <div class="stat-icon-box" style="background:var(--green-50)">
            <span style="color:var(--green-600)">${icon('checkSquare', 22)}</span>
          </div>
        </div>
      </div>

      <div class="order-search" style="margin-bottom:var(--space-4)">
        ${icon('search')}
        <input
          type="text"
          id="order-search-input"
          placeholder="Search order number, customer, seller or product..."
          value="${esc(state.searchQuery)}"
        />
      </div>

      <div class="order-body">
        <div class="order-table-wrap">
          <div class="order-status-filters">
            ${STATUS_FILTERS.map((f) => {
              const active = state.statusFilter === f.key;
              const count = f.key === 'All' ? ORDERS.length : ORDERS.filter((o) => o.status === f.key).length;

              return `
                <button
                  class="status-filter-pill ${active ? 'active' : ''}"
                  data-status="${f.key}"
                  style="${active && f.dotColor ? `background:${f.dotColor};border-color:${f.dotColor};color:#fff` : ''}"
                >
                  ${f.dotColor ? `<span class="sfp-dot" style="background:${active ? '#fff' : f.dotColor}"></span>` : ''}
                  ${f.label} (${count})
                </button>
              `;
            }).join('')}
          </div>

          <div class="table-scroll">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Seller</th>
                  <th>Product(s)</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                ${orders.length === 0 ? `
                  <tr>
                    <td colspan="7" class="empty-row">No orders match your current filters.</td>
                  </tr>
                ` : orders.map((o) => `
                  <tr>
                    <td class="cell-medium">
                      ${esc(o.id)}
                      <p style="font-size:12px;color:var(--gray-400)">${formatDate(o.order_date)}</p>
                    </td>
                    <td style="color:var(--gray-700)">${esc(o.customer)}</td>
                    <td style="font-weight:500;color:var(--gray-800)">${esc(o.vendor)}</td>
                    <td style="color:var(--gray-700);font-size:13px">${esc(o.products)}</td>
                    <td><p class="cell-bold">${peso(o.total_amount)}</p></td>
                    <td>
                      <span class="status-pill ${statusClass(o.status)}">
                        <span class="dot"></span>
                        ${esc(o.status)}
                      </span>
                    </td>
                    <td>
                      <div class="action-cell">
                        <button class="action-link view" data-action="view" data-order-id="${o.order_id}">
                          ${icon('eye', 13)} View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="order-log-panel">
          <div class="card card-pad-sm">
            <div class="panel-header">
              ${icon('clipboardList')}
              <p class="panel-title">RECENT ORDER UPDATES</p>
            </div>

            <div class="order-log-list">
              ${ORDERS.length === 0 ? `
                <div class="order-log-item">
                  <span class="order-log-dot"></span>
                  <p class="order-log-text">No orders yet.</p>
                </div>
              ` : [...ORDERS]
                .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
                .slice(0, 6)
                .map((order) => `
                  <div class="order-log-item">
                    <span class="order-log-dot"></span>
                    <p class="order-log-text">
                      <strong>${esc(order.id)}</strong> — ${esc(order.status)}
                      ${order.status_note ? `<br><span style="color:var(--gray-500)">${esc(order.status_note)}</span>` : ''}
                      <br><span style="font-size:11px;color:var(--gray-400)">${formatDate(order.updated_at)}</span>
                    </p>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  attachOrderEvents();
}

async function viewOrderDetails(orderId) {
  const order = ORDERS.find((o) => Number(o.order_id) === Number(orderId));
  const content = document.getElementById('content');

  if (!order) {
    showToast('Order could not be found.');
    return;
  }

  content.innerHTML = `
    <div class="page-container">
      <div style="margin-bottom:20px;">
        <button id="back-to-orders" class="action-link">← Back to Orders</button>
      </div>

      <h1 class="page-title">
        Admin Side:
        <span class="accent">ORDER ${esc(order.id)}</span>
      </h1>

      <div class="card card-pad-sm" style="margin-top:20px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px 24px;">
          <p><strong>Customer:</strong><br>${esc(order.customer)}</p>
          <p><strong>Seller(s):</strong><br>${esc(order.vendor)}</p>
          <p><strong>Order status:</strong><br>
            <span class="status-pill ${statusClass(order.status)}"><span class="dot"></span>${esc(order.status)}</span>
          </p>
          <p><strong>Placed:</strong><br>${formatDate(order.order_date)}</p>
          <p><strong>Last updated:</strong><br>${formatDate(order.updated_at)}</p>
          <p><strong>Payment:</strong><br>Cash on delivery</p>
          <p style="grid-column:1/-1"><strong>Delivery address:</strong><br>${esc(order.shipping_address || 'Not provided')}</p>
        </div>
        <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid var(--gray-100)">
          <p>Subtotal: <strong>${peso(order.subtotal)}</strong></p>
          <p>Shipping: <strong>${peso(order.shipping_fee)}</strong></p>
          <p>Total: <strong style="color:var(--green-700)">${peso(order.total_amount)}</strong></p>
        </div>
      </div>

      <div class="card card-pad-sm" style="margin-top:20px;">
        <p class="card-title">Items</p>
        <p class="form-hint" style="margin:4px 0 12px">
          Sellers update each item's status; customers can cancel before packing and confirm when received.
          The order status follows its items automatically.
        </p>
        <div id="order-items">Loading items…</div>
      </div>
    </div>
  `;

  document.getElementById('back-to-orders')?.addEventListener('click', () => loadOrders());

  await loadOrderItems(order);
}

async function loadOrderItems(order) {
  const box = document.getElementById('order-items');
  if (!box) return;

  let items = [];

  try {
    const response = await fetch(`orders/get_order_items.php?order_id=${encodeURIComponent(order.order_id)}`, {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Could not load items.');
    items = result.items || [];
  } catch (error) {
    box.textContent = 'Could not load the items. Please try again.';
    return;
  }

  if (!items.length) {
    box.textContent = 'This order has no items.';
    return;
  }

  box.innerHTML = `
    <div class="table-scroll">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Seller</th>
            <th>Qty</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Last update</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td class="cell-medium">${esc(item.product_name)}</td>
              <td>${esc(item.vendor)}</td>
              <td>${item.quantity}</td>
              <td>${peso(item.total_price)}</td>
              <td>
                <span class="status-pill ${statusClass(item.status_label)}"><span class="dot"></span>${esc(item.status_label)}</span>
                ${item.status_note ? `<p style="font-size:12px;color:var(--gray-500);margin-top:4px">${esc(item.status_note)}</p>` : ''}
              </td>
              <td style="font-size:13px;color:var(--gray-500)">${formatDate(item.updated_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function attachOrderEvents() {
  const input = document.getElementById('order-search-input');

  if (input) {
    input.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderOrders();

      const newInput = document.getElementById('order-search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(state.searchQuery.length, state.searchQuery.length);
      }
    });
  }

  document.querySelectorAll('[data-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.statusFilter = btn.dataset.status;
      renderOrders();
    });
  });

  document.querySelectorAll('[data-action="view"]').forEach((button) => {
    button.addEventListener('click', () => viewOrderDetails(button.dataset.orderId));
  });
}
