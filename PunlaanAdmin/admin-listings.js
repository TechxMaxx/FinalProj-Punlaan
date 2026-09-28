/* ============================================================
   Punlaan Admin — Vendor Listings Approval
   ============================================================ */
import { icon } from './admin-icons.js';

let LISTINGS = [];

export async function loadListings() {
    try {
        const response = await fetch("get_vendor_listings.php");
        if (!response.ok)
            throw new Error("Failed to load listings.");
        LISTINGS = await response.json();
        renderListings();
    } catch (err) {
        console.error(err);
    }
}

const state = { filter: 'All', search: '' };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function showToast(message, isError) {
  const old = document.getElementById('listings-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'listings-toast';
  el.className = 'settings-toast';
  if (isError) el.style.background = 'var(--red-600)';
  el.innerHTML = `${icon(isError ? 'alertCircle' : 'checkSquare', 14)} ${esc(message)}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

async function decide(productId, action, reason) {
  const body = new URLSearchParams({ product_id: productId });
  if (reason) body.append('reason', reason);

  const response = await fetch(action === 'approve' ? 'approve_listing.php' : 'reject_listing.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const result = await response.json();

  if (!result.success) {
    showToast(`Failed to ${action} the listing.`, true);
    return false;
  }

  showToast(action === 'approve' ? 'Listing approved — it is now live.' : 'Listing rejected.');
  loadListings();
  return true;
}

/* ---------- Review window: photos + details + decision ---------- */
async function reviewListing(productId) {
  let listing;

  try {
    const response = await fetch(`get_listing_details.php?product_id=${encodeURIComponent(productId)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    listing = result.listing;
  } catch (error) {
    showToast(error.message || 'Could not open this listing.', true);
    return;
  }

  document.getElementById('listing-review-modal')?.remove();

  const img = (path) => `../FrontEnd/${path || 'products/no_photo.jpg'}`;
  const photos = listing.images.length ? listing.images : [''];
  const isPending = listing.status === 'Pending';
  const statusCls = statusMeta(listing.status).cls;

  const modal = document.createElement('div');
  modal.id = 'listing-review-modal';
  modal.innerHTML = `
    <div class="catalog-modal-overlay">
      <div class="catalog-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div class="catalog-modal-header">
          <div>
            <h2 id="review-title">Review Listing</h2>
            <p>Product #${listing.product_id} · Submitted ${esc(listing.submitted_at || '')}</p>
          </div>
          <button type="button" class="catalog-modal-close" data-close aria-label="Close">×</button>
        </div>

        <div class="catalog-modal-body">
          <div class="catalog-product-top">
            <div class="catalog-product-image">
              <img id="review-main-img" src="${esc(img(photos[0]))}" alt="${esc(listing.name)}"
                   onerror="this.src='../FrontEnd/products/no_photo.jpg'">
            </div>
            <div class="catalog-product-main">
              <h3>${esc(listing.name)}</h3>
              <p class="catalog-product-category">${esc(listing.category)}${listing.subcategory ? ' · ' + esc(listing.subcategory) : ''}</p>
              <div class="catalog-status-row">
                <span class="catalog-detail-label">Status</span>
                <span class="listing-badge ${statusCls}">${esc(listing.status)}</span>
              </div>
              ${photos.length > 1 ? `
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
                  ${photos.map((p, i) => `
                    <button type="button" data-photo="${esc(img(p))}"
                      style="width:52px;height:52px;padding:0;border:2px solid ${i === 0 ? 'var(--green-600)' : 'var(--gray-200)'};border-radius:8px;overflow:hidden;background:#fff;cursor:pointer">
                      <img src="${esc(img(p))}" alt="Photo ${i + 1}" style="width:100%;height:100%;object-fit:cover">
                    </button>
                  `).join('')}
                </div>
                <p style="font-size:12px;color:var(--gray-500);margin-top:6px">${photos.length} photos</p>
              ` : `<p style="font-size:12px;color:var(--gray-500);margin-top:10px">${listing.images.length ? '1 photo' : 'No photo uploaded'}</p>`}
            </div>
          </div>

          <div class="catalog-detail-grid">
            <div class="catalog-detail-item"><span>Price</span><strong>₱${Number(listing.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
            <div class="catalog-detail-item"><span>Stock</span><strong>${listing.stock}</strong></div>
            <div class="catalog-detail-item"><span>Location</span><strong>${esc(listing.location || 'Not provided')}</strong></div>
            <div class="catalog-detail-item"><span>Reviewed</span><strong>${esc(listing.reviewed_at || 'Not yet')}</strong></div>
          </div>

          <div class="catalog-detail-section">
            <h4>Description</h4>
            <p style="white-space:pre-line">${esc(listing.description || 'No description provided.')}</p>
          </div>

          <div class="catalog-detail-section">
            <h4>Seller</h4>
            <div class="catalog-vendor-box">
              <div><span>Store</span><strong>${esc(listing.store_name || 'No store name')}</strong></div>
              <div><span>Owner</span><strong>${esc(listing.vendor_name)}</strong></div>
              <div><span>Email</span><strong>${esc(listing.vendor_email)}</strong></div>
              <div><span>Seller account</span><strong>${listing.vendor_verified ? 'Verified' : 'Not verified'}${listing.vendor_active ? '' : ' · Suspended/blocked'}</strong></div>
            </div>
          </div>

          ${listing.rejection_reason ? `
            <div class="catalog-rejection-box">
              <h4>Rejection Reason</h4>
              <p>${esc(listing.rejection_reason)}</p>
            </div>
          ` : ''}

          ${isPending ? `
            <div class="catalog-detail-section">
              <h4>Reason if rejecting <span style="font-weight:400;color:var(--gray-500)">(optional — shown to the seller)</span></h4>
              <textarea id="review-reason" class="form-input" rows="3" maxlength="500"
                placeholder="e.g. Please upload a clear photo of the actual plant."
                style="width:100%;resize:vertical"></textarea>
            </div>
          ` : ''}
        </div>

        <div class="catalog-modal-footer" style="gap:10px">
          <button type="button" class="catalog-modal-cancel" data-close>Close</button>
          ${isPending ? `
            <button type="button" class="btn-outline-danger" id="review-reject">Reject</button>
            <button type="button" class="btn-primary" id="review-approve">Approve &amp; publish</button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  modal.querySelector('.catalog-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) close();
  });

  modal.querySelectorAll('[data-photo]').forEach((b) => {
    b.addEventListener('click', () => {
      modal.querySelector('#review-main-img').src = b.dataset.photo;
      modal.querySelectorAll('[data-photo]').forEach((x) => { x.style.borderColor = x === b ? 'var(--green-600)' : 'var(--gray-200)'; });
    });
  });

  modal.querySelector('#review-approve')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    if (await decide(listing.product_id, 'approve')) close();
    else e.target.disabled = false;
  });

  modal.querySelector('#review-reject')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    const reason = modal.querySelector('#review-reason')?.value.trim() || '';
    if (await decide(listing.product_id, 'reject', reason)) close();
    else e.target.disabled = false;
  });
}

function statusMeta(s) {
  return { Pending: { cls: 'badge-pending' }, Approved: { cls: 'badge-live' }, Rejected: { cls: 'badge-flagged' } }[s] || { cls: '' };
}

function avatarColor(name) {
  const c = ['#2d6a4f','#1d4ed8','#9333ea','#b45309','#0891b2'];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % c.length;
  return c[h];
}

function avatarInitials(name) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function renderListings() {
  const content = document.getElementById('content');
  const pending = LISTINGS.filter((l) => l.status === 'Pending');
  const RECENT_QUEUE = pending.slice(0, 5);
  const approved = LISTINGS.filter((l) => l.status === 'Approved');
  const rejected = LISTINGS.filter((l) => l.status === 'Rejected');
  const recentQueue = pending.slice(0, 5);

  const filterMap = { All: LISTINGS, Pending: pending, Approved: approved, Rejected: rejected };
  const q = state.search.toLowerCase();
  const rows = (filterMap[state.filter] || LISTINGS).filter(
    (l) => !q || l.product.toLowerCase().includes(q) || l.vendor.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
  );

  const FILTERS = [
    { key: 'All', label: `All (${LISTINGS.length})` },
    { key: 'Pending', label: `Pending Review (${pending.length})` },
    { key: 'Approved', label: `Approved (${approved.length})` },
    { key: 'Rejected', label: `Rejected (${rejected.length})` },
  ];

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">VENDOR LISTINGS APPROVAL</span></h1>
      <div class="stat-grid-3" style="margin-bottom:var(--space-5)">
        <div class="stat-card-icon">
          <div><p class="stat-card-title">Pending Review</p><p class="stat-card-value">${pending.length}</p><p class="stat-sub" style="font-size:12px">Awaiting Your Decision</p></div>
          <div class="stat-icon-box" style="background:var(--yellow-50)"><span style="color:var(--yellow-500)">${icon('checkSquare', 22)}</span></div>
        </div>
        <div class="stat-card-icon">
          <div><p class="stat-card-title">Approved Today</p><p class="stat-card-value">${approved.length}</p><p class="stat-sub" style="font-size:12px">Now Live on Platform</p></div>
          <div class="stat-icon-box" style="background:var(--green-50)"><span style="color:var(--green-600)">${icon('tag', 22)}</span></div>
        </div>
        <div class="stat-card-icon">
          <div><p class="stat-card-title">Rejected</p><p class="stat-card-value">${rejected.length}</p><p class="stat-sub" style="font-size:12px">Returned to Vendor</p></div>
          <div class="stat-icon-box" style="background:var(--red-50)"><span style="color:var(--red-500)">${icon('alertCircle', 22)}</span></div>
        </div>
      </div>

      <div class="order-body">
        <div class="order-table-wrap">
          <div class="table-toolbar">
            <div class="toolbar-tabs">
              ${FILTERS.map((f) => `<button class="toolbar-tab ${state.filter === f.key ? 'active' : ''}" data-listings-filter="${f.key}">${f.label}</button>`).join('')}
            </div>
            <div class="toolbar-search">
              ${icon('search')}
              <input id="listings-search" type="text" placeholder="Search products, vendors..." value="${state.search}" />
            </div>
          </div>
          <div class="table-scroll">
            <table class="orders-table">
              <thead><tr>
                <th><input type="checkbox" /></th>
                <th>Product</th><th>Vendor</th><th>Category</th>
                <th>Price</th><th>Stock</th><th>Submitted</th><th>Status</th><th>Action</th>
              </tr></thead>
              <tbody>
                ${rows.length === 0 ? `<tr><td colspan="9" class="empty-row">No listings match your filters.</td></tr>` :
                  rows.map((l) => {
                    const meta = statusMeta(l.status);
                    const bg = avatarColor(l.vendor);
                    return `<tr>
                      <td><input type="checkbox" /></td>
                      <td>
                        <div class="product-cell">
                          <div class="product-thumb">${icon('leaf', 14)}</div>
                          <div>
                            <p style="font-weight:600;color:var(--gray-800);font-size:13px">${esc(l.product)}</p>
                            ${l.note ? `<p style="font-size:11px;color:var(--orange-500);margin-top:2px">${icon('alertTriangle', 10)} ${esc(l.note)}</p>` : ''}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="user-cell">
                          <div class="user-avatar-sm" style="background:${bg}">${esc(avatarInitials(l.vendor))}</div>
                          <div>
                            <p style="font-size:13px;font-weight:600;color:var(--gray-800)">
${esc(l.vendor)}</p>
<p style="font-size:11px;color:var(--gray-500);margin-top:2px">
    ${icon('store', 10)} ${esc(l.storeName)}
</p>
<span class="type-pill ${l.vendorType === 'Company' ? 'company' : 'individual'}" style="margin-top:4px">
    ${esc(l.vendorType)}
</span>
                          </div>
                        </div>
                      </td>
                      <td class="cell-muted" style="font-size:13px">${esc(l.category)}</td>
                      <td class="cell-bold">${l.price > 0 ? `₱${l.price.toLocaleString()}` : '<span style="color:var(--red-400)">—</span>'}</td>
                      <td style="color:${l.stock === 0 ? 'var(--red-500)' : 'var(--gray-700)'};font-weight:${l.stock === 0 ? 600 : 400}">${l.stock === 0 ? 'None' : l.stock}</td>
                      <td class="cell-muted" style="font-size:13px">${l.submitted}</td>
                      <td><span class="listing-badge ${meta.cls}">${l.status}</span></td>
                      <td>
                        <div class="action-cell">
                          <button class="action-link view" data-review="${l.product_id}">${icon('eye', 12)} Review</button>
                          ${l.status === 'Pending' ? `
                            <span class="action-divider">|</span>
                            <button
class="action-link approve"
data-id="${l.product_id}">
Approve
</button>
                            <span class="action-divider">|</span>
                            <button
class="action-link reject"
data-id="${l.product_id}">
Reject
</button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>`;
                  }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="order-log-panel">
          <div class="card card-pad-sm">
            <div class="panel-header">${icon('checkSquare')}<p class="panel-title">REVIEW QUEUE</p></div>
            <div class="order-log-list">
              ${recentQueue.map((l) => `
                <div class="order-log-item">
                  <span class="order-log-dot" style="background:var(--yellow-400)"></span>
                  <div>
                    <p style="font-size:12px;font-weight:600;color:var(--gray-800)">${esc(l.product)}</p>
                    <p style="font-size:11px;color:var(--gray-400)">${esc(l.vendor)} · ${esc(l.submitted)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  // Review window
  document.querySelectorAll('[data-review]').forEach((btn) => {
    btn.addEventListener('click', () => reviewListing(btn.dataset.review));
  });

  // Quick approve / reject from the table
  document.querySelectorAll('.approve[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => { btn.disabled = true; decide(btn.dataset.id, 'approve'); });
  });
  document.querySelectorAll('.reject[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => { btn.disabled = true; decide(btn.dataset.id, 'reject'); });
  });
  document.querySelectorAll('[data-listings-filter]').forEach((b) => {
    b.addEventListener('click', () => { state.filter = b.dataset.listingsFilter; renderListings(); });
  });
  const si = document.getElementById('listings-search');
  if (si) si.addEventListener('input', (e) => { state.search = e.target.value; renderListings(); const n = document.getElementById('listings-search'); if (n) { n.focus(); n.setSelectionRange(state.search.length, state.search.length); } });
}
