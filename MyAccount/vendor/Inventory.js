const STATUS_CONFIG = {
  verified: {
    label: 'Verified',
    cls: 'vinv__status--verified'
  },

  pending: {
    label: 'Pending Approval',
    cls: 'vinv__status--pending'
  },

  revision: {
    label: 'Requires Revision',
    cls: 'vinv__status--revision'
  },

  draft: {
    label: 'Not Submitted',
    cls: 'vinv__status--draft'
  },

  deleted: {
    label: 'Deleted',
    cls: 'vinv__status--deleted'
  }
};

const FILTERS = [
  { key: 'all', label: 'All Products' },
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
  { key: 'revision', label: 'Requires Revision' },
  { key: 'draft', label: 'Not Submitted' }
];


/* Categories (Admin → Categories) and the shop location used as the
   default product location (Storefront → Shop location) */
let CATEGORY_TREE = [];
let SHOP_LOCATION = '';


let allProducts = [];
let currentFilter = 'all';
let editingProduct = null;
let viewingProduct = null;


document.addEventListener('DOMContentLoaded', async () => {

  const user = await getCurrentUser();

  if (!user) {
    console.error('No logged-in user found.');

    window.location.href = '../../register/Login.html';

    return;
  }

  console.log('Logged in user:', user);
  console.log('User ID:', user.user_id);
  console.log('Is vendor:', user.is_vendor);

  document.getElementById('app').innerHTML =
    renderLayout('inventory');

  document.getElementById('pageContent').innerHTML =
    pageHtml();

  loadProducts();
  loadFormData();
  loadTasks();

});


/* Categories + shop location for the Add / Edit form */
async function loadFormData() {
  try {
    const [cats, store] = await Promise.all([
      fetch('../../FrontEnd/get_categories.php', { cache: 'no-store' }).then(r => r.json()),
      fetch('../vendor_php/storefront.php', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json())
    ]);
    CATEGORY_TREE = cats.categories || [];
    SHOP_LOCATION = (store.store && store.store.location_label) || '';
  } catch (err) {
    console.error('Could not load categories:', err);
  }
}

function categoryOptions(selected) {
  const names = CATEGORY_TREE.map(c => c.name);
  // Keep an old / hidden category visible when editing
  if (selected && !names.includes(selected)) names.push(selected);
  return '<option value="">Choose a category…</option>' + names.map(n =>
    `<option value="${escapeHtml(n)}" ${n === selected ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('');
}

function fillSubcategories(selected) {
  const main = document.getElementById('editCategory');
  const sub = document.getElementById('editSubcategory');
  if (!main || !sub) return;

  const wanted = selected || sub.dataset.selected || '';
  const children = (CATEGORY_TREE.find(c => c.name === main.value) || {}).children || [];

  sub.innerHTML = '<option value="">None</option>' + children.map(c =>
    `<option value="${escapeHtml(c.name)}" ${c.name === wanted ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  sub.disabled = children.length === 0;
  sub.dataset.selected = '';
}


/* ============================================================
   "NEEDS YOUR ATTENTION" — real counts (vendor_php/tasks.php)
   ============================================================ */

async function loadTasks() {
  const box = document.getElementById('invTasks');
  if (!box) return;

  let t = {};
  try {
    const response = await fetch('../vendor_php/tasks.php', { credentials: 'same-origin', cache: 'no-store' });
    t = await response.json();
    if (!t.success) throw new Error(t.message);
  } catch (err) {
    box.innerHTML = '<div class="vinv__aside-item-sub">Could not load tasks.</div>';
    return;
  }

  const items = [
    { n: t.open_returns, red: true, label: 'return request(s) to answer', sub: 'Accept or decline in Order Processing.', href: 'OrderProcessing.html#returns' },
    { n: t.disputes, red: true, label: 'dispute(s) being reviewed', sub: 'Punlaan will decide — check the buyer\'s reason.', href: 'OrderProcessing.html#returns' },
    { n: t.to_pack, red: true, label: 'order(s) to pack', sub: 'Pack and mark them Packed.', href: 'OrderProcessing.html' },
    { n: t.unread_messages, red: false, label: 'unread message(s)', sub: 'Reply to your buyers.', href: '../customer/Messages.html' },
    { n: t.unanswered_reviews, red: false, label: 'review(s) without a reply', sub: 'A short thank-you builds trust.', href: 'Reviews.html' },
    { n: t.shop_location ? 0 : 1, red: true, text: 'Set your shop location', sub: 'Needed for accurate shipping fees.', href: 'Storefront.html#location' },
    { n: t.available_balance >= t.min_payout ? 1 : 0, red: false, text: formatPeso(t.available_balance) + ' ready to pay out', sub: 'Request a payout in Sales & Payouts.', href: 'Sales.html' },
  ].filter(i => i.n > 0);

  box.innerHTML = items.length ? items.map(i => `
    <a class="vinv__aside-item vinv__aside-item--link" href="${i.href}">
      <div class="vinv__aside-item-title">
        <span class="vinv__aside-dot vinv__aside-dot--${i.red ? 'red' : 'yellow'}"></span>
        ${i.text ? escapeHtml(i.text) : `${i.n} ${escapeHtml(i.label)}`}
      </div>
      <div class="vinv__aside-item-sub">${escapeHtml(i.sub)}</div>
    </a>`).join('')
    : '<div class="vinv__aside-item-sub">You\'re all caught up. 🌱</div>';
}

function renderStockAlerts() {
  const box = document.getElementById('invStock');
  if (!box) return;

  const live = allProducts.filter(p => p.status === 'verified');
  const out = live.filter(p => Number(p.stock) === 0);
  const low = live.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 5);
  const revision = allProducts.filter(p => p.status === 'revision');
  const pending = allProducts.filter(p => p.status === 'pending');

  const rows = [
    ...out.map(p => ({ red: true, title: p.name, sub: 'Out of stock — hidden from the Marketplace', id: p.id })),
    ...low.map(p => ({ red: false, title: p.name, sub: `Only ${p.stock} left`, id: p.id })),
    ...revision.map(p => ({ red: true, title: p.name, sub: 'Needs changes before it can be sold', id: p.id })),
    ...pending.map(p => ({ red: false, title: p.name, sub: 'Waiting for admin approval', id: p.id })),
  ].slice(0, 8);

  box.innerHTML = rows.length ? rows.map(r => `
    <button type="button" class="vinv__aside-item vinv__aside-item--link" onclick="openEditModal(${Number(r.id)})">
      <div class="vinv__aside-item-title">
        <span class="vinv__aside-dot vinv__aside-dot--${r.red ? 'red' : 'yellow'}"></span>
        ${escapeHtml(r.title)}
      </div>
      <div class="vinv__aside-item-sub">${escapeHtml(r.sub)}</div>
    </button>`).join('')
    : '<div class="vinv__aside-item-sub">Stock looks good.</div>';
}
/* ============================================================
   PAGE HTML
   ============================================================ */

function pageHtml() {

  return `
    <div class="vinv">

      <div class="vinv__main">

        <div class="stats" id="stats"></div>

        <div class="toolbar">

          <div class="toolbar__title">
            Inventory Management
          </div>

          <div class="filters" id="filters"></div>

         <button
  class="btn btn--primary"
  onclick="openAddModal()"
>

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h14"/>
              <path d="M12 5v14"/>
            </svg>

            Add New Product

          </button>

        </div>


        <div class="sort-row">

          Sort by:

          <select
            class="sort-select"
            id="sortSelect"
            onchange="renderTable()"
          >

            <option value="date">
              Date Added
            </option>

            <option value="name">
              Name A–Z
            </option>

            <option value="stock">
              Stock Level
            </option>

            <option value="price">
              Price
            </option>

          </select>

        </div>


        <div class="vinv__table-wrap">

          <table class="vinv__table">

            <thead>

              <tr>

                <th>Product</th>
                <th>Category</th>
                <th>Stock Level</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>

              </tr>

            </thead>

            <tbody id="tableBody">

              <tr>

                <td colspan="6" class="loading">
                  Loading products…
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>


      <aside class="vinv__aside">

        <div class="vinv__aside-section">
          <div class="vinv__aside-title">Needs your attention</div>
          <div id="invTasks"><div class="vinv__aside-item-sub">Loading…</div></div>
        </div>

        <div class="vinv__aside-section">
          <div class="vinv__aside-title">Stock &amp; listing alerts</div>
          <div id="invStock"><div class="vinv__aside-item-sub">Loading…</div></div>
        </div>

      </aside>

    </div>


    <div id="modalRoot"></div>
  `;

}


/* ============================================================
   LOAD REAL DATABASE PRODUCTS
   ============================================================ */

async function loadProducts() {

  try {

    /*
     * IMPORTANT:
     *
     * Inventory.html is assumed to be:
     *
     * Preview/Vendor/Inventory/Inventory.html
     *
     * and get_vendor_products.php is:
     *
     * Preview/get_vendor_products.php
     *
     */

    const response =
      await fetch('../get_vendor_products.php');


    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }


    const result =
      await response.json();


    if (!result.success) {
      throw new Error(
        result.message || 'Failed to load products.'
      );
    }


    console.log('Vendor:', result.vendor);

    console.log(
      'Products from database:',
      result.products
    );


    allProducts =
      result.products || [];


    renderStats();
    renderFilters();
    renderTable();
    renderStockAlerts();

    // Opened from a "Low stock" / "Sold out" notification → edit that product
    const linked = Number(new URLSearchParams(location.search).get('product'));
    if (linked && !loadProducts.openedLinked && allProducts.some(p => Number(p.id) === linked)) {
      loadProducts.openedLinked = true;
      openEditModal(linked);
    }


  } catch (err) {

    console.error(err);

    document.getElementById('tableBody').innerHTML = `

      <tr>

        <td colspan="6" class="loading">

          Could not load products.

          <br>

          ${escapeHtml(err.message)}

        </td>

      </tr>

    `;

  }

}


/* ============================================================
   STATS
   ============================================================ */

function renderStats() {

 const pendingCount =
  allProducts.filter(
    p => p.status === 'pending'
  ).length;


  const totalProducts =
    allProducts.length;


  const totalStock =
    allProducts.reduce(
      (sum, p) => sum + Number(p.stock || 0),
      0
    );


  const totalValue =
    allProducts.reduce(
      (sum, p) =>
        sum +
        (Number(p.price || 0) *
         Number(p.stock || 0)),
      0
    );


  document.getElementById('stats').innerHTML = `

    <div class="stat">

      <div>

        <div class="stat__label">
          Inventory Value
        </div>

        <div class="stat__value">
          ₱${totalValue.toLocaleString()}
        </div>

        <div class="stat__sub">
          Based on current stock
        </div>

      </div>

      <div class="stat__icon stat__icon--green">

        ₱

      </div>

    </div>


    <div class="stat">

      <div>

        <div class="stat__label">
          Total Products
        </div>

        <div class="stat__value">
          ${totalProducts}
        </div>

        <div class="stat__sub">
          Listed in inventory
        </div>

      </div>

      <div class="stat__icon stat__icon--teal">
        #
      </div>

    </div>


    <div class="stat">

      <div>

        <div class="stat__label">
          Total Stock
        </div>

        <div class="stat__value">
          ${totalStock} Items
        </div>

        <div class="stat__sub">

          ${
            pendingCount > 0
              ? `${pendingCount} pending approval`
              : 'No pending approvals'
          }

        </div>

      </div>

      <div class="stat__icon stat__icon--amber">
        ${pendingCount}
      </div>

    </div>

  `;

}


/* ============================================================
   FILTERS
   ============================================================ */

function renderFilters() {

  const el =
    document.getElementById('filters');


  el.innerHTML =
    FILTERS.map(f => `

      <button
        class="filter-btn${f.key === currentFilter ? ' filter-btn--active' : ''}"
        onclick="setFilter('${f.key}')"
      >

        ${f.label}

      </button>

    `).join('');

}


function setFilter(key) {

  currentFilter = key;

  renderFilters();

  renderTable();

}


/* ============================================================
   TABLE
   ============================================================ */

function renderTable() {

let filtered =
  currentFilter === 'all'
    ? allProducts.filter(
        p => p.status !== 'deleted'
      )
    : allProducts.filter(
        p => p.status === currentFilter
      );
  const sortBy =
    document.getElementById('sortSelect')?.value ||
    'date';


  if (sortBy === 'name') {

    filtered.sort(
      (a, b) =>
        (a.name || '').localeCompare(
          b.name || ''
        )
    );

  }


  else if (sortBy === 'stock') {

    filtered.sort(
      (a, b) =>
        Number(b.stock || 0) -
        Number(a.stock || 0)
    );

  }


  else if (sortBy === 'price') {

    filtered.sort(
      (a, b) =>
        Number(b.price || 0) -
        Number(a.price || 0)
    );

  }


  const body =
    document.getElementById('tableBody');


  if (filtered.length === 0) {

    body.innerHTML = `

      <tr>

        <td colspan="6" class="loading">

          No products in this category.

        </td>

      </tr>

    `;

    return;

  }


  body.innerHTML =
    filtered.map(p => {

      const level =
        stockLevel(
          Number(p.stock || 0),
          Number(p.max_stock || 0)
        );


    const sc =
  STATUS_CONFIG[p.status] ||
  STATUS_CONFIG.draft;


      const maxStock =
        Number(p.max_stock || 0);


      const stock =
        Number(p.stock || 0);


      const pct =
        maxStock > 0
          ? Math.round(
              (stock / maxStock) * 100
            )
          : 0;


const img =
  p.image
    ? `../../FrontEnd/${p.image}`
    : '../../FrontEnd/products/no_photo.jpg';


      const price =
        Number(p.price || 0);


      return `

        <tr>

          <td>

            <div class="vinv__product-cell">

              ${
                img
                  ? `
                    <img
                      src="${escapeHtml(img)}"
                      alt="${escapeHtml(p.name)}"
                      class="vinv__product-thumb"
                    />
                  `
                  : ''
              }


              <div>

                <div class="vinv__product-name">
                  ${escapeHtml(p.name || '')}
                </div>

                <div class="vinv__product-id">
                  Product #${escapeHtml(p.product_id || '')}
                </div>

              </div>

            </div>

          </td>


          <td>

            <span class="vinv__category">

              <span class="vinv__category-dot"></span>

              ${escapeHtml(p.category || '')}

            </span>

          </td>


          <td>

            <div class="vinv__stock">

              <span
                class="vinv__stock-label vinv__stock-label--${level}"
              >

                <span
                  class="vinv__stock-dot vinv__stock-dot--${level}"
                ></span>

                ${stock} · ${stockLabel(level)}

              </span>


              <div class="vinv__stock-bar">

                <div
                  class="vinv__stock-fill vinv__stock-fill--${level}"
                  style="width:${Math.min(pct, 100)}%"
                ></div>

              </div>

            </div>

          </td>


          <td>

            <span class="vinv__price">

              ₱${price.toLocaleString()}

            </span>

          </td>


          <td>

            <span
              class="vinv__status ${sc.cls}"
            >

              ${sc.label}

            </span>

          </td>


          <td>

            <div class="vinv__actions">

              <button
                class="vinv__action-btn vinv__action-btn--view"
                onclick="openViewModal(${p.id})"
              >
                View
              </button>

              <button
  class="vinv__action-btn vinv__action-btn--edit"
  onclick="openEditModal(${p.id})"
>
  Edit
</button>

            </div>

          </td>

        </tr>

      `;

    }).join('');

}


/* ============================================================
   STOCK
   ============================================================ */

function stockLevel(stock, max) {

  if (!max || max === 0) {
    return 'low';
  }


  const pct =
    stock / max;


  if (pct >= 0.5) {
    return 'high';
  }


  if (pct >= 0.2) {
    return 'medium';
  }


  return 'low';

}


function stockLabel(level) {

  if (level === 'high') {
    return 'In Stock';
  }

  if (level === 'medium') {
    return 'Low Stock';
  }

  return 'Critical';

}


/* ============================================================
   VIEW MODAL
   ============================================================ */

function openViewModal(productId) {

  const p =
    allProducts.find(
      x => Number(x.id) === Number(productId)
    );


  if (!p) {
    return;
  }


  viewingProduct = p;


  const level =
    stockLevel(
      Number(p.stock || 0),
      Number(p.max_stock || 0)
    );


  const sc =
    STATUS_CONFIG[p.status] ||
    STATUS_CONFIG.draft;


  const price =
    Number(p.price || 0);


const img =
  p.image
    ? `../../FrontEnd/${p.image}`
    : '../../FrontEnd/products/no_photo.jpg';


  document.getElementById(
    'modalRoot'
  ).innerHTML = `

    <div
      class="modal-overlay"
      onclick="if(event.target===this)closeModal()"
    >

      <div class="vinv__view-modal">

        ${
          img
            ? `
              <img
                src="${escapeHtml(img)}"
                alt="${escapeHtml(p.name)}"
                class="vinv__view-banner"
onerror="this.src='../placeholder.jpg'"
              />
            `
            : ''
        }


        <div class="vinv__view-body">

          <div class="vinv__view-header-row">

            <div>

              <div class="vinv__view-name">

                ${escapeHtml(p.name || '')}

              </div>


              <div class="vinv__view-id">

                Product #${escapeHtml(p.product_id || '')}

                ·

                ${escapeHtml(p.category || '')}

              </div>

            </div>


            <button
              class="modal__close"
              onclick="closeModal()"
            >
              ×
            </button>

          </div>


          <div class="vinv__view-meta">

            <div class="vinv__view-meta-item">

              <div class="vinv__view-meta-label">
                Price
              </div>

              <div class="vinv__view-meta-value">
                ₱${price.toLocaleString()}
              </div>

            </div>


            <div class="vinv__view-meta-item">

              <div class="vinv__view-meta-label">
                Stock
              </div>

              <div class="vinv__view-meta-value">

                ${Number(p.stock || 0)} units

              </div>

            </div>


            <div class="vinv__view-meta-item">

              <div class="vinv__view-meta-label">
                Status
              </div>

              <div>

                <span
                  class="vinv__status ${sc.cls}"
                >

                  ${sc.label}

                </span>

              </div>

            </div>

          </div>


          <div class="vinv__view-desc-label">
            Description
          </div>


          <p class="vinv__view-desc">

            ${escapeHtml(
              p.description ||
              'No description.'
            )}

          </p>


          <div
            class="modal__footer"
            style="padding-left:0;padding-right:0;padding-bottom:0;"
          >

            <button
              class="modal__btn modal__btn--cancel"
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


/* ============================================================
   CLOSE MODAL
   ============================================================ */

function closeModal() {

  document.getElementById('modalRoot').innerHTML = '';

  // Free the photo previews
  if (photoState) {
    photoState.added.forEach(p => URL.revokeObjectURL(p.url));
    photoState = null;
  }

  editingProduct = null;
  viewingProduct = null;

}


/* ============================================================
   HTML ESCAPING
   ============================================================ */

function escapeHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


/* ============================================================
   ADD PRODUCT MODAL
   ============================================================ */

function openAddModal() {

  editingProduct = null;

  // Runs right after the modal HTML below is inserted
  setTimeout(() => initPhotoManager(null), 0);
  setTimeout(() => fillSubcategories(''), 0);

  document.getElementById('modalRoot').innerHTML = `

    <div
      class="modal-overlay"
      onclick="if(event.target===this)closeModal()"
    >

      <div class="modal">

        <div class="modal__header">

          <div>

            <div class="modal__title">
              Add New Product
            </div>

            <div class="modal__subtitle">
              New listings require admin review before appearing in the marketplace.
            </div>

          </div>

          <button
            class="modal__close"
            onclick="closeModal()"
          >
            ×
          </button>

        </div>


        <div class="modal__body">

          <div
            style="
              padding:12px 14px;
              margin-bottom:18px;
              border:1px solid #f5d88a;
              background:#fff8df;
              border-radius:10px;
              color:#6d5300;
              font-size:12.5px;
              line-height:1.5;
            "
          >
            <strong>⚠ New product requires admin review.</strong><br>
            This listing will start as
            <strong>Pending Approval</strong> and will not be active
            in the marketplace until an administrator approves it.
          </div>


          <div class="vinv__modal-section">

            <div class="vinv__modal-section-label">
              Product Information
            </div>


            <div class="vinv__modal-row">

              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Product Name
                </label>

                <input
                  class="vinv__modal-input"
                  id="editName"
                  maxlength="150"
                  placeholder="Product name"
                />

              </div>


              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Category
                </label>

                <select
                  class="vinv__modal-select"
                  id="editCategory"
                  onchange="fillSubcategories('')"
                >
                  ${categoryOptions('')}
                </select>

              </div>

            </div>


            <div
              class="vinv__modal-row"
              style="margin-top:14px;"
            >

              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Subcategory
                </label>

                <select
                  class="vinv__modal-select"
                  id="editSubcategory"
                ></select>

              </div>


              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Location
                </label>

                <input
                  class="vinv__modal-input"
                  id="editLocation"
                  maxlength="255"
                  placeholder="City, Province"
                  value="${escapeHtml(SHOP_LOCATION)}"
                />
                <div class="vinv__field-hint">
                  ${SHOP_LOCATION
                    ? 'Your shop location — change it if this plant ships from somewhere else. City only, not your street.'
                    : 'City only (e.g. Quezon City), not your street. Tip: set your shop location in <a href="Storefront.html#location">Storefront</a> to fill this in automatically.'}
                </div>

              </div>

            </div>


            <div
              class="vinv__modal-row vinv__modal-row--full"
              style="margin-top:14px;"
            >

              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Description
                </label>

                <textarea
                  class="vinv__modal-textarea"
                  id="editDescription"
                  placeholder="Describe your product..."
                ></textarea>

              </div>

            </div>

          </div>


          <div class="vinv__modal-section">

            <div class="vinv__modal-section-label">
              Pricing & Inventory
            </div>


            <div class="vinv__modal-row">

              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Price (₱)
                </label>

                <input
                  class="vinv__modal-input"
                  type="number"
                  min="0"
                  step="0.01"
                  id="editPrice"
                  value="0"
                />

              </div>


              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Stock Quantity
                </label>

                <div class="vinv__stock-adjuster">

                  <button
                    class="vinv__stock-btn"
                    onclick="adjustStock(-1)"
                  >
                    −
                  </button>

                  <input
                    class="vinv__stock-value"
                    type="number"
                    min="0"
                    id="editStock"
                    value="0"
                  />

                  <button
                    class="vinv__stock-btn"
                    onclick="adjustStock(1)"
                  >
                    +
                  </button>

                </div>

              </div>

            </div>

          </div>


          <div class="vinv__modal-section">
            <div class="vinv__modal-section-label">Photos</div>
            <div id="photoManager"></div>
          </div>

        </div>


  <div class="modal__footer">

  <button
    class="modal__btn modal__btn--cancel"
    onclick="closeModal()"
  >
    Cancel
  </button>

  <button
    class="modal__btn modal__btn--save"
    onclick="saveProduct()"
  >
    Save & Submit for Review
  </button>

</div>

      </div>

    </div>
  `;
}


/* ============================================================
   EDIT PRODUCT MODAL
   ============================================================ */

function openEditModal(productId) {

  const product =
    allProducts.find(
      p => Number(p.id) === Number(productId)
    );

  if (!product) {
    showToast('Product not found.', true);
    return;
  }

  editingProduct = {
    ...product
  };

  // Runs right after the modal HTML below is inserted
  setTimeout(() => initPhotoManager(Number(product.id)), 0);
  setTimeout(() => fillSubcategories(product.subcategory || ''), 0);

  document.getElementById('modalRoot').innerHTML = `

    <div
      class="modal-overlay"
      onclick="if(event.target===this)closeModal()"
    >

      <div class="modal">

        <div class="modal__header">

          <div>

            <div class="modal__title">
              Edit Product
            </div>

            <div class="modal__subtitle">
              Product #${escapeHtml(product.product_id)}
            </div>

          </div>

          <button
            class="modal__close"
            onclick="closeModal()"
          >
            ×
          </button>

        </div>


        <div class="modal__body">

          <div
            style="
              padding:12px 14px;
              margin-bottom:18px;
              border:1px solid #f5d88a;
              background:#fff8df;
              border-radius:10px;
              color:#6d5300;
              font-size:12.5px;
              line-height:1.5;
            "
          >
            <strong>⚠ Changes require admin review.</strong><br>
            Saving changes will move this listing back to
            <strong>Review</strong>. Your vendor verification will remain
            approved, but the listing will not be active in the marketplace
            again until an administrator reviews the changes.
          </div>


          <div class="vinv__modal-section">

            <div class="vinv__modal-section-label">
              Product Information
            </div>


            <div class="vinv__modal-row">

              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Product Name
                </label>

                <input
                  class="vinv__modal-input"
                  id="editName"
                  value="${escapeHtml(product.name || '')}"
                  maxlength="150"
                />

              </div>


              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Category
                </label>

                <select
                  class="vinv__modal-select"
                  id="editCategory"
                  onchange="fillSubcategories('')"
                >
                  ${categoryOptions(product.category)}
                </select>

              </div>

            </div>


            <div
              class="vinv__modal-row"
              style="margin-top:14px;"
            >

              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Subcategory
                </label>

                <select
                  class="vinv__modal-select"
                  id="editSubcategory"
                  data-selected="${escapeHtml(product.subcategory || '')}"
                ></select>

              </div>


              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Location
                </label>

                <input
                  class="vinv__modal-input"
                  id="editLocation"
                  value="${escapeHtml(product.location || '')}"
                  maxlength="255"
                  placeholder="City, Province"
                />

              </div>

            </div>


            <div
              class="vinv__modal-row vinv__modal-row--full"
              style="margin-top:14px;"
            >

              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Description
                </label>

                <textarea
                  class="vinv__modal-textarea"
                  id="editDescription"
                >${escapeHtml(product.description || '')}</textarea>

              </div>

            </div>

          </div>


          <div class="vinv__modal-section">

            <div class="vinv__modal-section-label">
              Pricing & Inventory
            </div>


            <div class="vinv__modal-row">

              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Price (₱)
                </label>

                <input
                  class="vinv__modal-input"
                  type="number"
                  min="0"
                  step="0.01"
                  id="editPrice"
                  value="${Number(product.price || 0)}"
                />

              </div>


              <div class="vinv__modal-field">

                <label class="vinv__modal-label">
                  Stock Quantity
                </label>

                <div class="vinv__stock-adjuster">

                  <button
                    class="vinv__stock-btn"
                    onclick="adjustStock(-1)"
                  >
                    −
                  </button>

                  <input
                    class="vinv__stock-value"
                    type="number"
                    min="0"
                    id="editStock"
                    value="${Number(product.stock || 0)}"
                  />

                  <button
                    class="vinv__stock-btn"
                    onclick="adjustStock(1)"
                  >
                    +
                  </button>

                </div>

              </div>

            </div>

          </div>


          <div class="vinv__modal-section">
            <div class="vinv__modal-section-label">Photos</div>
            <div id="photoManager"></div>
          </div>


          <div
            style="
              font-size:11.5px;
              color:#8aa596;
              line-height:1.5;
              margin-top:4px;
            "
          >
            Product ID, vendor ownership, verification status, review dates,
            and rejection information are controlled by the system/admin.
            Saving changes automatically sends this listing back to Review.
          </div>

        </div>


      <div class="modal__footer">

  <button
    class="modal__btn modal__btn--cancel"
    onclick="closeModal()"
  >
    Cancel
  </button>

  <button
    class="modal__btn modal__btn--delete"
    onclick="deleteProduct()"
  >
    Delete Product
  </button>

  <button
    class="modal__btn modal__btn--save"
    onclick="saveProduct()"
  >
    Save & Submit for Review
  </button>

</div>

      </div>

    </div>
  `;
}


/* ============================================================
   PRODUCT PHOTOS
   Up to 5 photos; the first is the cover. Changes are kept here
   and sent together when the product is saved.
   ============================================================ */

const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 3;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

let photoState = null;

async function initPhotoManager(productId) {

  photoState = {
    productId: productId,
    existing: [],          // [{image_id, path}] already saved
    removed: new Set(),    // image_ids to delete on save
    added: [],             // [{file, url}] new, not uploaded yet
    cover: null,           // 'e:<image_id>' or 'n:<index>'
    loading: Boolean(productId)
  };

  renderPhotoManager();

  if (!productId) return;

  try {
    const response = await fetch('../product_photos.php?product_id=' + productId, { credentials: 'same-origin' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);

    photoState.existing = result.photos || [];
    photoState.cover = photoState.existing.length ? 'e:' + photoState.existing[0].image_id : null;

  } catch (err) {
    showToast('Could not load photos: ' + err.message, true);
  }

  photoState.loading = false;
  renderPhotoManager();
}

function visiblePhotos() {
  if (!photoState) return [];
  return [
    ...photoState.existing
      .filter(p => !photoState.removed.has(p.image_id))
      .map(p => ({ key: 'e:' + p.image_id, src: '../../FrontEnd/' + p.path })),
    ...photoState.added
      .map((p, i) => ({ key: 'n:' + i, src: p.url, isNew: true }))
  ];
}

function renderPhotoManager() {

  const box = document.getElementById('photoManager');
  if (!box || !photoState) return;

  if (photoState.loading) {
    box.innerHTML = '<div class="vinv__photos-hint">Loading photos…</div>';
    return;
  }

  const photos = visiblePhotos();

  // Keep a valid cover (first photo if the chosen one was removed)
  if (!photos.some(p => p.key === photoState.cover)) {
    photoState.cover = photos.length ? photos[0].key : null;
  }

  const ordered = photos.slice().sort((a, b) => (b.key === photoState.cover) - (a.key === photoState.cover));

  box.innerHTML = `
    <div class="vinv__photos">
      ${ordered.map(p => `
        <div class="vinv__photo${p.key === photoState.cover ? ' vinv__photo--cover' : ''}">
          <img src="${escapeHtml(p.src)}" alt="" onerror="this.style.opacity=0.3" />
          ${p.key === photoState.cover
            ? '<span class="vinv__photo-badge">Cover</span>'
            : `<button type="button" class="vinv__photo-cover-btn" onclick="setCoverPhoto('${p.key}')">Make cover</button>`}
          ${p.isNew ? '<span class="vinv__photo-new">New</span>' : ''}
          <button type="button" class="vinv__photo-remove" aria-label="Remove photo" onclick="removePhoto('${p.key}')">×</button>
        </div>
      `).join('')}

      ${photos.length < MAX_PHOTOS ? `
        <label class="vinv__photo-add">
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onchange="addPhotos(this.files); this.value='';" />
          <span class="vinv__photo-add-plus">+</span>
          <span>Add photo</span>
        </label>` : ''}
    </div>
    <div class="vinv__photos-hint">
      ${photos.length}/${MAX_PHOTOS} photos · JPG, PNG or WEBP up to ${MAX_PHOTO_MB} MB.
      The cover is shown in the Marketplace. Clear, well-lit photos sell better.
    </div>
  `;
}

function addPhotos(fileList) {

  const files = Array.from(fileList || []);
  const room = MAX_PHOTOS - visiblePhotos().length;

  if (files.length > room) {
    showToast(`You can add ${room} more photo${room === 1 ? '' : 's'} (max ${MAX_PHOTOS}).`, true);
  }

  files.slice(0, Math.max(room, 0)).forEach(file => {
    if (!PHOTO_TYPES.includes(file.type)) {
      showToast(`${file.name}: use JPG, PNG or WEBP.`, true);
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1048576) {
      showToast(`${file.name} is larger than ${MAX_PHOTO_MB} MB.`, true);
      return;
    }
    photoState.added.push({ file, url: URL.createObjectURL(file) });
  });

  renderPhotoManager();
}

function removePhoto(key) {

  if (key.startsWith('e:')) {
    photoState.removed.add(Number(key.slice(2)));
  } else {
    const index = Number(key.slice(2));
    URL.revokeObjectURL(photoState.added[index].url);
    photoState.added.splice(index, 1);

    // New-photo keys shift after removal
    if (photoState.cover && photoState.cover.startsWith('n:')) {
      const c = Number(photoState.cover.slice(2));
      if (c === index) photoState.cover = null;
      else if (c > index) photoState.cover = 'n:' + (c - 1);
    }
  }

  renderPhotoManager();
}

function setCoverPhoto(key) {
  photoState.cover = key;
  renderPhotoManager();
}

function photoChangesPending() {
  if (!photoState) return false;
  const firstExisting = photoState.existing[0];
  return photoState.added.length > 0 ||
    photoState.removed.size > 0 ||
    (firstExisting ? photoState.cover !== 'e:' + firstExisting.image_id : false);
}

/* Upload new photos / deletions / cover choice for a saved product */
async function savePhotos(productId) {

  if (!photoChangesPending()) return;

  const form = new FormData();
  form.append('product_id', productId);
  form.append('cover', photoState.cover || '');
  photoState.removed.forEach(id => form.append('remove_ids[]', id));
  photoState.added.forEach(p => form.append('images[]', p.file, p.file.name));

  const response = await fetch('../product_photos.php', {
    method: 'POST',
    body: form,
    credentials: 'same-origin'
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Could not save photos.');
  }
}


/* ============================================================
   STOCK ADJUSTER
   ============================================================ */

function adjustStock(delta) {

  const el =
    document.getElementById('editStock');

  if (!el) {
    return;
  }

  el.value = Math.max(
    0,
    (Number(el.value) || 0) + delta
  );

}


/* ============================================================
   SAVE PRODUCT — ADD OR EDIT
   ============================================================ */

async function saveProduct() {

  const productName =
    document.getElementById('editName')
      ?.value
      .trim() || '';


  const category =
    document.getElementById('editCategory')
      ?.value || '';


  const subcategory =
    document.getElementById('editSubcategory')
      ?.value || '';


  const description =
    document.getElementById('editDescription')
      ?.value
      .trim() || '';


  const location =
    document.getElementById('editLocation')
      ?.value
      .trim() || '';


  const price =
    Number(
      document.getElementById('editPrice')
        ?.value
    );


  const stock =
    Number(
      document.getElementById('editStock')
        ?.value
    );


  /* ----------------------------------------------------------
     Validation
  ---------------------------------------------------------- */

  if (!productName) {

    showToast(
      'Product name is required.',
      true
    );

    return;
  }


  if (!category) {

    showToast(
      'Please choose a category.',
      true
    );

    return;
  }


  if (!Number.isFinite(price) || price < 0) {

    showToast(
      'Please enter a valid price.',
      true
    );

    return;
  }


  if (!Number.isInteger(stock) || stock < 0) {

    showToast(
      'Please enter a valid stock quantity.',
      true
    );

    return;
  }


  /* ----------------------------------------------------------
     Determine ADD vs EDIT
  ---------------------------------------------------------- */

  const isEditing =
    Boolean(editingProduct);


  // Buyers need to see the plant: at least one photo is required
  if (visiblePhotos().length === 0) {

    showToast(
      'Please add at least one photo of the product.',
      true
    );

    return;
  }


  const confirmed =
    window.confirm(
      isEditing
        ? 'Saving these changes will move this listing back to Review. Continue?'
        : 'This new product will be submitted for admin review and will not appear as active until approved. Continue?'
    );


  if (!confirmed) {
    return;
  }


  /* ----------------------------------------------------------
     Select API
  ---------------------------------------------------------- */

  const endpoint =
    isEditing
      ? '../update_vendor_product.php'
      : '../add_vendor_product.php';


  const payload = {

    product_name:
      productName,

    category:
      category,

    subcategory:
      subcategory,

    description:
      description,

    location:
      location,

    price:
      price,

    stock:
      stock

  };


  if (isEditing) {

    payload.product_id =
      editingProduct.id;

  }


  /* ----------------------------------------------------------
     Send request
  ---------------------------------------------------------- */

  try {

    const response =
      await fetch(
        endpoint,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(payload)

        }
      );


    if (!response.ok) {

      throw new Error(
        `Server returned ${response.status}`
      );

    }


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message ||
        'Could not save product.'
      );

    }


    // Product saved → now its photos (needs the product ID)
    const savedId =
      isEditing
        ? Number(editingProduct.id)
        : Number(result.product_id);

    let photoError = null;

    try {
      await savePhotos(savedId);
    } catch (err) {
      photoError = err;
    }


    closeModal();


    if (photoError) {

      showToast(
        'Product saved, but the photos could not be uploaded: ' +
        photoError.message +
        ' Open the product and try again.',
        true
      );

    } else {

      showToast(
        isEditing
          ? 'Changes submitted for admin review.'
          : 'Product submitted for admin review.'
      );

    }


    await loadProducts();


  } catch (err) {

    console.error(err);

    showToast(
      'Could not save product: ' +
      err.message,
      true
    );

  }

}
/* ============================================================
   SOFT DELETE PRODUCT
   ============================================================ */

async function deleteProduct() {

  if (!editingProduct) {
    return;
  }

  const confirmed =
    window.confirm(
      `Are you sure you want to delete "${editingProduct.name}"?\n\n` +
      'This product will be removed from your inventory but will remain in the database.'
    );

  if (!confirmed) {
    return;
  }

  try {

    const response =
      await fetch(
        '../delete_vendor_product.php',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              product_id:
                editingProduct.id
            })
        }
      );

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }

    const result =
      await response.json();

    if (!result.success) {
      throw new Error(
        result.message ||
        'Could not delete product.'
      );
    }

    closeModal();

    showToast(
      'Product deleted successfully.'
    );

    await loadProducts();

  } catch (err) {

    console.error(err);

    showToast(
      'Could not delete product: ' +
      err.message,
      true
    );

  }

}