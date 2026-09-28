/* ============================================================
   Punlaan Admin — Categories & Taxonomy Page
   Real categories and products (get_category_overview.php).
   "Manage categories" (right panel) adds, renames, hides and
   deletes categories (save_category.php). The Marketplace
   sidebar and the sellers' product form use the same list.
   Products are approved in "Vendor Listings Approval" and
   shown/hidden in "Master Catalog".
   ============================================================ */
import { icon } from './admin-icons.js';

const STATES = ['All', 'Live', 'Pending', 'Out of Stock', 'Hidden', 'Rejected'];

const STATE_BADGE = {
  'Live': 'badge-live',
  'Pending': 'badge-pending',
  'Out of Stock': 'badge-pricing',
  'Hidden': 'badge-pricing',
  'Rejected': 'badge-flagged',
};

const state = {
  loaded: false,
  categories: [],
  tree: [],
  editing: null,        // {mode: 'add' | 'rename', id, parentId}
  products: [],
  activeCategory: 'All',
  stateFilter: 'All',
  searchQuery: '',
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function peso(value) {
  return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function inCategory() {
  return state.activeCategory === 'All'
    ? state.products
    : state.products.filter((p) => p.category === state.activeCategory);
}

function visibleProducts() {
  const q = state.searchQuery.toLowerCase();
  return inCategory().filter((p) =>
    (state.stateFilter === 'All' || p.state === state.stateFilter) &&
    (!q || p.name.toLowerCase().includes(q) || p.vendor.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q))
  );
}

export async function renderCategories() {
  const content = document.getElementById('content');

  // Fresh data every time the page is opened
  state.loaded = false;

  if (!state.loaded) {
    content.innerHTML = `
      <div class="page-container">
        <h1 class="page-title">Admin Side: <span class="accent">CATEGORIES &amp; TAXONOMY</span></h1>
        <div class="card card-pad"><p class="card-title">Loading categories…</p></div>
      </div>
    `;

    try {
      const response = await fetch('get_category_overview.php', { credentials: 'same-origin', cache: 'no-store' });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      state.categories = result.categories || [];
      state.tree = result.tree || [];
      state.products = result.products || [];
      state.loaded = true;
    } catch (error) {
      content.innerHTML = `
        <div class="page-container">
          <h1 class="page-title">Admin Side: <span class="accent">CATEGORIES &amp; TAXONOMY</span></h1>
          <div class="card card-pad"><p class="card-title">Could not load categories. Please refresh the page.</p></div>
        </div>
      `;
      return;
    }
  }

  draw();
}

function draw() {
  const content = document.getElementById('content');
  const scoped = inCategory();
  const products = visibleProducts();

  const live = state.products.filter((p) => p.state === 'Live').length;
  const pending = state.products.filter((p) => p.state === 'Pending').length;
  const usedCategories = state.categories.filter((c) => state.products.some((p) => p.category === c && p.state === 'Live')).length;

  // Subcategory breakdown for the selected category
  const subCounts = {};
  scoped.forEach((p) => {
    const key = p.subcategory || 'No subcategory';
    subCounts[key] = subCounts[key] || { total: 0, live: 0 };
    subCounts[key].total += 1;
    if (p.state === 'Live') subCounts[key].live += 1;
  });

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">CATEGORIES &amp; TAXONOMY</span></h1>

      <div class="stat-grid-3" style="margin-bottom:var(--space-5)">
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Categories in Use</p>
            <p class="stat-card-value">${usedCategories} / ${state.categories.length}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">With at least one live product</p>
          </div>
          <div class="stat-icon-box" style="background:var(--green-50)">
            <span style="color:var(--green-600)">${icon('tag', 22)}</span>
          </div>
        </div>
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Live Products</p>
            <p class="stat-card-value">${live}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">Visible in the Marketplace</p>
          </div>
          <div class="stat-icon-box" style="background:var(--green-50)">
            <span style="color:var(--green-600)">${icon('package', 22)}</span>
          </div>
        </div>
        <a class="stat-card-icon" href="#/products/listings" style="text-decoration:none;color:inherit">
          <div>
            <p class="stat-card-title">Waiting for Approval</p>
            <p class="stat-card-value">${pending}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">Review in Vendor Listings Approval →</p>
          </div>
          <div class="stat-icon-box" style="background:var(--yellow-50)">
            <span style="color:var(--yellow-500)">${icon('checkSquare', 22)}</span>
          </div>
        </a>
      </div>

      <div class="order-body">
        <div class="order-table-wrap">

          <div class="category-tabs-row">
            ${['All', ...state.categories].map((cat) => {
              const count = cat === 'All' ? state.products.length : state.products.filter((p) => p.category === cat).length;
              return `
                <button class="category-tab ${state.activeCategory === cat ? 'active' : ''}" data-cat="${esc(cat)}">
                  <span style="color:var(--green-500)">${icon('leaf', 13)}</span>
                  ${esc(cat === 'All' ? 'All Categories' : cat)} (${count})
                </button>
              `;
            }).join('')}
          </div>

          <div class="listing-filter-bar">
            ${STATES.map((s) => {
              const count = s === 'All' ? scoped.length : scoped.filter((p) => p.state === s).length;
              return `
                <button class="listing-filter-btn ${state.stateFilter === s ? 'active' : ''}" data-filter="${esc(s)}">
                  ${s === 'All' ? 'All Products' : s} (${count})
                </button>
              `;
            }).join('')}
          </div>

          <div class="order-search" style="margin:var(--space-3) 0">
            ${icon('search')}
            <input type="text" id="category-search" placeholder="Search product, seller or subcategory..." value="${esc(state.searchQuery)}" />
          </div>

          <div class="table-scroll">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Seller</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${products.length === 0 ? `
                  <tr><td colspan="7" class="empty-row">No products match your current filters.</td></tr>
                ` : products.map((p) => `
                  <tr>
                    <td>
                      <div class="product-cell">
                        <div class="product-thumb">${icon('leaf', 14)}</div>
                        <span style="font-weight:500;color:var(--gray-800)">${esc(p.name)}</span>
                      </div>
                    </td>
                    <td class="cell-muted">
                      ${esc(p.category)}
                      ${p.subcategory ? `<br><span style="font-size:12px">${esc(p.subcategory)}</span>` : ''}
                    </td>
                    <td style="font-size:13px">${esc(p.vendor)}</td>
                    <td class="cell-bold">${peso(p.price)}</td>
                    <td style="color:${p.stock === 0 ? 'var(--red-500)' : 'var(--gray-700)'};font-weight:${p.stock === 0 ? '600' : '400'}">
                      ${p.stock === 0 ? 'Out of Stock' : p.stock}
                    </td>
                    <td><span class="listing-badge ${STATE_BADGE[p.state] || ''}">${esc(p.state)}</span></td>
                    <td>
                      <div class="action-cell">
                        ${p.state === 'Pending'
                          ? `<a class="action-link approve" href="#/products/listings">Review</a>`
                          : p.state === 'Live'
                            ? `<a class="action-link view" href="../FrontEnd/DETAIL.html?product_id=${p.product_id}" target="_blank" rel="noopener">${icon('eye', 12)} View in shop</a>`
                            : `<a class="action-link view" href="#/products/catalog">Master Catalog</a>`}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="order-log-panel">
          ${manageHtml()}

          <div class="card card-pad-sm" style="margin-top:var(--space-4)">
            <div class="panel-header">
              ${icon('tag')}
              <p class="panel-title">${esc(state.activeCategory === 'All' ? 'ALL SUBCATEGORIES' : state.activeCategory.toUpperCase())}</p>
            </div>
            <div class="order-log-list">
              ${Object.keys(subCounts).length === 0 ? `
                <div class="order-log-item">
                  <span class="order-log-dot"></span>
                  <p class="order-log-text">No products in this category yet.</p>
                </div>
              ` : Object.entries(subCounts)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([name, c]) => `
                  <div class="order-log-item">
                    <span class="order-log-dot" style="background:var(--green-500)"></span>
                    <p class="order-log-text">
                      <span style="font-weight:600;color:var(--gray-800)">${esc(name)}</span><br>
                      ${c.live} live · ${c.total} total
                    </p>
                  </div>
                `).join('')}
            </div>
            <p class="form-hint" style="margin-top:12px">
              Sellers pick a category and subcategory when they add a product.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  attachCategoryEvents();
}

/* ---------- Manage categories (right panel) ---------- */

function countFor(cat, isMain) {
  return state.products.filter((p) => (isMain ? p.category : p.subcategory) === cat.name).length;
}

function editorRow(placeholder, value) {
  return `
    <div class="cat-edit">
      <input class="form-input" id="cat-edit-input" maxlength="100" placeholder="${esc(placeholder)}" value="${esc(value || '')}" />
      <button class="btn-primary" data-cat-save type="button">Save</button>
      <button class="btn-ghost" data-cat-cancel type="button">Cancel</button>
    </div>`;
}

function catRow(cat, isMain, parentId) {
  const e = state.editing;
  if (e && e.mode === 'rename' && e.id === cat.id) return editorRow('New name', cat.name);

  const n = countFor(cat, isMain);

  // Shipping size (lib/shipping.php) — subcategories can follow their main category
  const sizes = [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']];
  const mainTier = isMain ? null : (state.tree.find((m) => m.id === parentId)?.size_tier || 'medium');
  const sizeSelect = `
    <select class="cat-size" data-cat-size="${cat.id}" title="Shipping size" aria-label="Shipping size for ${esc(cat.name)}">
      ${isMain ? '' : `<option value="" ${cat.size_tier ? '' : 'selected'}>Same (${esc(mainTier)})</option>`}
      ${sizes.map(([v, label]) => `<option value="${v}" ${cat.size_tier === v || (isMain && !cat.size_tier && v === 'medium') ? 'selected' : ''}>${label}</option>`).join('')}
    </select>`;

  return `
    <div class="cat-row ${isMain ? 'cat-row--main' : ''} ${cat.is_active ? '' : 'cat-row--hidden'}">
      <span class="cat-row__name">${esc(cat.name)}${cat.is_active ? '' : ' <em>(hidden)</em>'}</span>
      ${sizeSelect}
      <span class="cat-row__count" title="Products">${n}</span>
      <span class="cat-row__actions">
        <button type="button" data-cat-rename="${cat.id}">Rename</button>
        <button type="button" data-cat-toggle="${cat.id}">${cat.is_active ? 'Hide' : 'Show'}</button>
        <button type="button" data-cat-delete="${cat.id}" class="danger">Delete</button>
      </span>
    </div>`;
}

function manageHtml() {
  const e = state.editing;

  return `
    <div class="card card-pad-sm">
      <div class="panel-header">
        ${icon('settings')}
        <p class="panel-title">MANAGE CATEGORIES</p>
      </div>
      <div class="cat-tree">
        ${state.tree.map((main) => `
          ${catRow(main, true, null)}
          <div class="cat-children">
            ${main.children.map((child) => catRow(child, false, main.id)).join('')}
            ${e && e.mode === 'add' && e.parentId === main.id
              ? editorRow('New subcategory')
              : `<button type="button" class="cat-add" data-cat-add="${main.id}">+ Add subcategory</button>`}
          </div>`).join('')}
        ${e && e.mode === 'add' && e.parentId === null
          ? editorRow('New main category')
          : '<button type="button" class="cat-add cat-add--main" data-cat-add="main">+ Add main category</button>'}
      </div>
      <p class="form-hint" style="margin-top:10px">
        Main categories appear in the Marketplace sidebar. Hidden categories keep their products on sale,
        but sellers can't pick them. A category can only be deleted when no product uses it.
        The size (Small / Medium / Large) sets the shipping fee — amounts are in Settings → Marketplace rules.
      </p>
    </div>`;
}

async function saveCategory(body) {
  try {
    const response = await fetch('save_category.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    catToast(result.message || (result.success ? 'Saved.' : 'Could not save.'), !result.success);
    if (result.success) {
      state.editing = null;
      renderCategories();
    }
  } catch (error) {
    catToast('Could not save. Please try again.', true);
  }
}

function catToast(message, isError) {
  document.getElementById('cat-toast')?.remove();
  const el = document.createElement('div');
  el.id = 'cat-toast';
  el.className = 'settings-toast';
  if (isError) el.style.background = 'var(--red-600)';
  el.innerHTML = `${icon(isError ? 'alertCircle' : 'checkSquare', 14)} ${esc(message)}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}

function attachManageEvents() {
  document.querySelectorAll('[data-cat-add]').forEach((b) => b.addEventListener('click', () => {
    state.editing = { mode: 'add', parentId: b.dataset.catAdd === 'main' ? null : Number(b.dataset.catAdd) };
    draw();
    document.getElementById('cat-edit-input')?.focus();
  }));

  document.querySelectorAll('[data-cat-rename]').forEach((b) => b.addEventListener('click', () => {
    state.editing = { mode: 'rename', id: Number(b.dataset.catRename) };
    draw();
    document.getElementById('cat-edit-input')?.select();
  }));

  document.querySelectorAll('[data-cat-size]').forEach((s) => s.addEventListener('change', () => {
    saveCategory({ action: 'size', id: Number(s.dataset.catSize), size: s.value });
  }));

  document.querySelectorAll('[data-cat-toggle]').forEach((b) => b.addEventListener('click', () => {
    saveCategory({ action: 'toggle', id: Number(b.dataset.catToggle) });
  }));

  // Tap twice to delete (no pop-up)
  document.querySelectorAll('[data-cat-delete]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.armed !== '1') {
      b.dataset.armed = '1';
      b.textContent = 'Sure?';
      setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Delete'; } }, 3500);
      return;
    }
    saveCategory({ action: 'delete', id: Number(b.dataset.catDelete) });
  }));

  document.querySelector('[data-cat-cancel]')?.addEventListener('click', () => { state.editing = null; draw(); });

  const input = document.getElementById('cat-edit-input');
  const submit = () => {
    const e = state.editing;
    if (!e) return;
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    saveCategory(e.mode === 'add'
      ? { action: 'add', name, parent_id: e.parentId }
      : { action: 'rename', id: e.id, name });
  };
  document.querySelector('[data-cat-save]')?.addEventListener('click', submit);
  input?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') submit();
    if (ev.key === 'Escape') { state.editing = null; draw(); }
  });
}

function attachCategoryEvents() {
  attachManageEvents();

  document.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      state.stateFilter = 'All';
      draw();
    });
  });

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.stateFilter = btn.dataset.filter;
      draw();
    });
  });

  const search = document.getElementById('category-search');
  if (search) {
    search.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      draw();
      const again = document.getElementById('category-search');
      again.focus();
      again.setSelectionRange(state.searchQuery.length, state.searchQuery.length);
    });
  }
}
