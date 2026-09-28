/* ============================================================
   Punlaan Admin — Master Catalog
   ============================================================ */
import { icon } from './admin-icons.js';

let CATALOG = [];
export async function loadCatalog() {
    // Category filter = the categories list (Categories & Taxonomy)
    try {
        const cats = await (await fetch("../FrontEnd/get_categories.php", { cache: "no-store" })).json();
        if (cats.success) CATEGORIES = ['All Categories', ...cats.categories.map((c) => c.name)];
    } catch (e) { /* keep the list below */ }

    try {
        const response = await fetch("catalog/get_master_catalog.php");

        if (!response.ok)
            throw new Error("Failed to load catalog.");

        CATALOG = await response.json();

        renderCatalog();
    }
    catch (err) {
        console.error(err);
    }
}
let CATEGORIES = ['All Categories', 'Seedlings', 'Bushes', 'Saplings', 'Indoor Plants', 'Garden Supplies'];

const state = { search: '', category: 'All Categories', statusFilter: 'All' };

function statusMeta(s) {
  return { Active: { cls: 'badge-live' }, Hidden: { cls: 'badge-flagged' }, Review: { cls: 'badge-pending' } }[s] || { cls: '' };
}

export function renderCatalog() {
  const content = document.getElementById('content');
  const active = CATALOG.filter((c) => c.status === 'Active');
  const hidden = CATALOG.filter((c) => c.status === 'Hidden');
  const review = CATALOG.filter((c) => c.status === 'Review');

  const filterMap = { All: CATALOG, Active: active, Hidden: hidden, Review: review };
  const q = state.search.toLowerCase();
  const rows = (filterMap[state.statusFilter] || CATALOG).filter((c) => {
    const catMatch = state.category === 'All Categories' || c.category === state.category;
    const searchMatch = !q || c.product.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  const STATUS_FILTERS = [
    { key: 'All', label: `All (${CATALOG.length})` },
    { key: 'Active', label: `Active (${active.length})` },
    { key: 'Hidden', label: `Hidden (${hidden.length})` },
    { key: 'Review', label: `Under Review (${review.length})` },
  ];

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">MASTER CATALOG</span></h1>
      <div class="stat-grid-3" style="margin-bottom:var(--space-5)">
        <div class="stat-card-icon">
          <div><p class="stat-card-title">Total Products</p><p class="stat-card-value">${CATALOG.length}</p><p class="stat-sub" style="font-size:12px">Across All Categories</p></div>
          <div class="stat-icon-box" style="background:var(--green-50)"><span style="color:var(--green-600)">${icon('bookOpen', 22)}</span></div>
        </div>
        <div class="stat-card-icon">
          <div><p class="stat-card-title">Active Listings</p><p class="stat-card-value">${active.length}</p><p class="stat-sub" style="font-size:12px">Visible to Buyers</p></div>
          <div class="stat-icon-box" style="background:var(--blue-50)"><span style="color:var(--blue-600)">${icon('package', 22)}</span></div>
        </div>
        <div class="stat-card-icon">
          <div><p class="stat-card-title">Under Review / Hidden</p><p class="stat-card-value">${review.length + hidden.length}</p><p class="stat-sub" style="font-size:12px">Needs Attention</p></div>
          <div class="stat-icon-box" style="background:var(--yellow-50)"><span style="color:var(--yellow-500)">${icon('alertCircle', 22)}</span></div>
        </div>
      </div>

      <div class="order-table-wrap">
        <div class="table-toolbar" style="flex-wrap:wrap;gap:var(--space-2)">
          <div class="toolbar-tabs">
            ${STATUS_FILTERS.map((f) => `<button class="toolbar-tab ${state.statusFilter === f.key ? 'active' : ''}" data-cat-filter="${f.key}">${f.label}</button>`).join('')}
          </div>
          <div style="display:flex;gap:var(--space-2);padding:var(--space-3) var(--space-4)">
            <select id="catalog-cat-select" class="form-select-sm">
              ${CATEGORIES.map((c) => `<option value="${c}" ${state.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <div class="toolbar-search" style="margin:0">
              ${icon('search')}
              <input id="catalog-search" type="text" placeholder="Search products..." value="${state.search}" />
            </div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="orders-table">
            <thead><tr>
              <th>Product</th><th>Category</th><th>Vendors</th>
              <th>Total Stock</th><th>Price</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${rows.length === 0 ? `<tr>
  <td colspan="7" class="empty-row">No products match your filters.</td></tr>` :
                rows.map((c) => {
                  const meta = statusMeta(c.status);
                  return `<tr>
                    <td>
                      <div class="product-cell">
                        <div class="product-thumb">${icon('leaf', 14)}</div>
                        <div>
                          <p style="font-weight:600;color:var(--gray-800);font-size:13px">${c.product}</p>
                          <p style="font-size:11px;color:var(--gray-400)">${c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td class="cell-muted" style="font-size:13px">${c.category}</td>
                    <td>
                      <span class="vendor-count-pill">${c.vendors} vendor${c.vendors !== 1 ? 's' : ''}</span>
                    </td>
                    <td style="color:${c.totalStock === 0 ? 'var(--red-500)' : 'var(--gray-700)'};font-weight:${c.totalStock === 0 ? 600 : 400}">
                      ${c.totalStock === 0 ? 'Out of stock' : c.totalStock.toLocaleString()}
                    </td>
                  <td class="cell-bold">
  ₱${c.avgPrice.toLocaleString()}
</td>

<td>
  <span class="listing-badge ${meta.cls}">
    ${c.status}
  </span>
</td>
                    <td>
                      <div class="action-cell">
                       <button class="action-link view" data-product-id="${c.product_id}">
    ${icon('eye', 12)} View
</button>
                        <span class="action-divider">|</span>
${c.status === 'Active'
  ? `<button class="action-link reject" data-product-id="${c.product_id}">Hide</button>`
  : `<button class="action-link approve" data-product-id="${c.product_id}">Publish</button>`}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-cat-filter]').forEach((b) => {
    b.addEventListener('click', () => { state.statusFilter = b.dataset.catFilter; renderCatalog(); });
  });
  const catSel = document.getElementById('catalog-cat-select');
  if (catSel) catSel.addEventListener('change', (e) => { state.category = e.target.value; renderCatalog(); });
  const si = document.getElementById('catalog-search');
  if (si) si.addEventListener('input', (e) => { state.search = e.target.value; renderCatalog(); const n = document.getElementById('catalog-search'); if (n) { n.focus(); n.setSelectionRange(state.search.length, state.search.length); } });
document.querySelectorAll('.action-link.reject').forEach((button) => {
    button.addEventListener('click', () => {
        const productId = button.dataset.productId;
        hideProduct(productId);
    });
});

document.querySelectorAll('.action-link.approve').forEach((button) => {
    button.addEventListener('click', () => {
        const productId = button.dataset.productId;
        publishProduct(productId);
    });
});

document.querySelectorAll('.action-link.view').forEach((button) => {
    button.addEventListener('click', () => {
        const productId = button.dataset.productId;
        viewProduct(productId);
    });
});
}
async function hideProduct(productId) {
    if (!confirm("Hide this product from the marketplace?")) {
        return;
    }

    try {
        const response = await fetch("catalog/hide_product.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `product_id=${encodeURIComponent(productId)}`
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Failed to hide product.");
        }

        await loadCatalog();

    } catch (err) {
        console.error(err);
        alert("Failed to hide product.");
    }
}
async function publishProduct(productId) {
    if (!confirm("Publish this product to the marketplace?")) {
        return;
    }

    try {
        const response = await fetch("catalog/publish_product.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `product_id=${encodeURIComponent(productId)}`
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Failed to publish product.");
        }

        await loadCatalog();

    } catch (err) {
        console.error(err);
        alert("Failed to publish product.");
    }
}
async function viewProduct(productId) {
    try {
        const response = await fetch(
            `catalog/get_product_details.php?product_id=${encodeURIComponent(productId)}`
        );

        if (!response.ok) {
            throw new Error("Failed to load product details.");
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Failed to load product.");
        }

        showProductModal(result.product);

    } catch (err) {
        console.error(err);
        alert("Failed to load product details.");
    }
}
function showProductModal(product) {

    const existingModal = document.getElementById("catalog-product-modal");

    if (existingModal) {
        existingModal.remove();
    }

const imageFile = product.product_image
    ? product.product_image.replace(/^products[\\/]/, "")
    : "no_photo.jpg";

const imagePath = `../FrontEnd/products/${imageFile}`;

    const catalogStatus = {
        1: "Hidden",
        2: "Under Review",
        3: "Active"
    }[product.catalog_status] || "Unknown";

    const modal = document.createElement("div");

    modal.id = "catalog-product-modal";

    modal.innerHTML = `
        <div class="catalog-modal-overlay">
            <div class="catalog-modal">

                <div class="catalog-modal-header">
                    <div>
                        <h2>Product Details</h2>
                        <p>CAT-${product.product_id}</p>
                    </div>

                    <button
                        type="button"
                        class="catalog-modal-close"
                        id="catalog-modal-close"
                    >
                        ×
                    </button>
                </div>

                <div class="catalog-modal-body">

                    <div class="catalog-product-top">

                        <div class="catalog-product-image">
                            <img
                                src="${imagePath}"
                                alt="${escapeHtml(product.product_name)}"
                                onerror="this.src='../FrontEnd/products/no_photo.jpg'"
                            >
                        </div>

                        <div class="catalog-product-main">

                            <h3>${escapeHtml(product.product_name)}</h3>

                            <p class="catalog-product-category">
                                ${escapeHtml(product.category)}
                            </p>

                            <div class="catalog-status-row">
                                <span class="catalog-detail-label">
                                    Catalog Status
                                </span>

                                <span class="listing-badge ${
                                    catalogStatus === "Active"
                                        ? "badge-live"
                                        : catalogStatus === "Hidden"
                                            ? "badge-flagged"
                                            : "badge-pending"
                                }">
                                    ${catalogStatus}
                                </span>
                            </div>

                        </div>

                    </div>

                    <div class="catalog-detail-grid">

                        <div class="catalog-detail-item">
                            <span>Subcategory</span>
                            <strong>
                                ${escapeHtml(product.subcategory || "None")}
                            </strong>
                        </div>

                        <div class="catalog-detail-item">
                            <span>Price</span>
                            <strong>
                                ₱${Number(product.price).toLocaleString(
                                    "en-PH",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}
                            </strong>
                        </div>

                        <div class="catalog-detail-item">
                            <span>Stock</span>
                            <strong>
                                ${Number(product.stock).toLocaleString()}
                            </strong>
                        </div>

                        <div class="catalog-detail-item">
                            <span>Location</span>
                            <strong>
                                ${escapeHtml(product.location || "Not provided")}
                            </strong>
                        </div>

                    </div>

                    <div class="catalog-detail-section">
                        <h4>Description</h4>
                        <p>
                            ${escapeHtml(
                                product.description || "No description provided."
                            )}
                        </p>
                    </div>

                    <div class="catalog-detail-section">

                        <h4>Vendor</h4>

                        <div class="catalog-vendor-box">

                            <div>
                                <span>Store</span>
                                <strong>
                                    ${escapeHtml(
                                        product.store_name || "No store name"
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Vendor</span>
                                <strong>
                                    ${escapeHtml(
                                        product.vendor_name || "Unknown vendor"
                                    )}
                                </strong>
                            </div>

                        </div>

                    </div>

                    <div class="catalog-detail-grid">

                        <div class="catalog-detail-item">
                            <span>Submitted</span>
                            <strong>
                                ${formatCatalogDate(product.submitted_at)}
                            </strong>
                        </div>

                        <div class="catalog-detail-item">
                            <span>Reviewed</span>
                            <strong>
                                ${
                                    product.reviewed_at
                                        ? formatCatalogDate(product.reviewed_at)
                                        : "Not reviewed"
                                }
                            </strong>
                        </div>

                    </div>

                    ${
                        product.rejection_reason
                            ? `
                                <div class="catalog-rejection-box">
                                    <h4>Rejection Reason</h4>
                                    <p>
                                        ${escapeHtml(product.rejection_reason)}
                                    </p>
                                </div>
                            `
                            : ""
                    }

                </div>

                <div class="catalog-modal-footer">

                    <button
                        type="button"
                        class="catalog-modal-cancel"
                        id="catalog-modal-cancel"
                    >
                        Close
                    </button>

                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document
        .getElementById("catalog-modal-close")
        .addEventListener("click", closeCatalogModal);

    document
        .getElementById("catalog-modal-cancel")
        .addEventListener("click", closeCatalogModal);

    const overlay = modal.querySelector(".catalog-modal-overlay");

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeCatalogModal();
        }
    });
}
function closeCatalogModal() {
    const modal = document.getElementById("catalog-product-modal");

    if (modal) {
        modal.remove();
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatCatalogDate(dateString) {
    if (!dateString) {
        return "Not available";
    }

    const date = new Date(dateString.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}