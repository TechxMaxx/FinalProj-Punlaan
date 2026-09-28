/* ============================================================
   Punlaan Admin — Reports (reports.php)

   Buyers report a listing or a shop from the product / shop
   page. The admin reviews each one:
     Dismiss        nothing wrong
     Mark handled   sorted out another way (e.g. messaged the seller)
     Hide listing   removed from the Marketplace (Master Catalog
                    can show it again)
     Suspend shop   the seller's account is suspended
                    (All User Accounts → Reinstate)
   ============================================================ */
import { icon } from './admin-icons.js';

const state = { tab: 'open', reports: [] };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function when(value) {
  const d = new Date(String(value || '').replace(' ', 'T'));
  return isNaN(d) ? '' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toast(msg, isError) {
  document.getElementById('reports-toast')?.remove();
  const el = document.createElement('div');
  el.id = 'reports-toast';
  el.className = 'settings-toast';
  if (isError) el.style.background = 'var(--red-600)';
  el.innerHTML = `${icon(isError ? 'alertCircle' : 'checkSquare', 14)} ${esc(msg)}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3200);
}

const STATUS_BADGE = { open: 'badge-pending', resolved: 'badge-live', dismissed: 'badge-pricing' };
const STATUS_LABEL = { open: 'Open', resolved: 'Handled', dismissed: 'Dismissed' };


export async function loadReports() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">REPORTS</span></h1>
      <div class="card card-pad"><p class="card-title">Loading…</p></div>
    </div>`;

  try {
    const response = await fetch('reports.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    state.reports = result.reports || [];
  } catch (error) {
    content.querySelector('.card').innerHTML = '<p class="card-title">Could not load. Please refresh the page.</p>';
    return;
  }

  draw();
}


function draw() {
  const content = document.getElementById('content');
  const open = state.reports.filter((r) => r.status === 'open');
  const list = state.tab === 'open' ? open : state.reports.filter((r) => r.status !== 'open');
  const shops = new Set(open.map((r) => r.vendor_id)).size;

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">REPORTS</span></h1>

      <div class="stat-grid-3" style="margin-bottom:var(--space-5)">
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Open reports</p>
            <p class="stat-card-value">${open.length}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">Waiting for a review</p>
          </div>
          <div class="stat-icon-box" style="background:var(--yellow-50)"><span style="color:var(--yellow-500)">${icon('alertCircle', 22)}</span></div>
        </div>
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Shops reported</p>
            <p class="stat-card-value">${shops}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">With at least one open report</p>
          </div>
          <div class="stat-icon-box" style="background:var(--red-50)"><span style="color:var(--red-500)">${icon('building2', 22)}</span></div>
        </div>
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Handled</p>
            <p class="stat-card-value">${state.reports.length - open.length}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">Dismissed or acted on</p>
          </div>
          <div class="stat-icon-box" style="background:var(--green-50)"><span style="color:var(--green-600)">${icon('checkSquare', 22)}</span></div>
        </div>
      </div>

      <div class="card card-pad">
        <div class="listing-filter-bar" style="margin-bottom:var(--space-4)">
          <button class="listing-filter-btn ${state.tab === 'open' ? 'active' : ''}" data-tab="open">Open (${open.length})</button>
          <button class="listing-filter-btn ${state.tab === 'done' ? 'active' : ''}" data-tab="done">Handled (${state.reports.length - open.length})</button>
        </div>
        <div class="table-scroll">
          <table class="orders-table">
            <thead><tr><th>Reported</th><th>About</th><th>Reason</th><th>By</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${list.length ? list.map(row).join('')
                : `<tr><td colspan="6" class="empty-row">${state.tab === 'open' ? 'No open reports. 🌱' : 'No handled reports yet.'}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  content.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; draw(); }));
  content.querySelectorAll('[data-review]').forEach((b) => b.addEventListener('click', () => openReview(Number(b.dataset.review))));
}

function about(r) {
  const shop = `<a href="../FrontEnd/SHOP.html?vendor_id=${r.vendor_id}" target="_blank" rel="noopener">${esc(r.shop_name)}</a>`;
  const listing = r.product_id
    ? `<a href="../FrontEnd/DETAIL.html?product_id=${r.product_id}" target="_blank" rel="noopener">${esc(r.product_name || 'Listing')}</a><br><span class="cell-muted" style="font-size:12px">Shop: ${shop}</span>`
    : `Shop: ${shop}`;
  const flags = [
    r.listing_hidden ? 'listing hidden' : '',
    r.shop_suspended ? 'shop suspended' : '',
  ].filter(Boolean).join(' · ');
  return listing + (flags ? `<br><span class="cell-muted" style="font-size:12px">(${flags})</span>` : '');
}

function row(r) {
  return `
    <tr>
      <td>${when(r.created_at)}<br><span class="cell-muted" style="font-size:12px">${r.target_type === 'product' ? 'Listing' : 'Shop'}</span></td>
      <td style="font-size:13px">${about(r)}</td>
      <td style="font-size:13px;max-width:260px">${esc(r.reason)}${r.details ? `<br><span class="cell-muted" style="font-size:12px">${esc(r.details)}</span>` : ''}</td>
      <td style="font-size:13px">${esc(r.reporter)}</td>
      <td><span class="listing-badge ${STATUS_BADGE[r.status] || ''}">${STATUS_LABEL[r.status] || esc(r.status)}</span>
        ${r.admin_note && r.status !== 'open' ? `<br><span class="cell-muted" style="font-size:12px">${esc(r.admin_note)}${r.handled_by_name ? ' — ' + esc(r.handled_by_name) : ''}</span>` : ''}</td>
      <td>${r.status === 'open' ? `<button class="action-link approve" data-review="${r.report_id}">Review</button>` : ''}</td>
    </tr>`;
}


/* ---------- review dialog (same look as Returns & Payouts) ---------- */

function openReview(reportId) {
  const r = state.reports.find((x) => x.report_id === reportId);
  if (!r) return;

  document.getElementById('report-modal')?.remove();
  const el = document.createElement('div');
  el.id = 'report-modal';
  el.innerHTML = `
    <div class="catalog-modal-overlay">
      <div class="catalog-modal" role="dialog" aria-modal="true" aria-label="Review report">
        <div class="catalog-modal-header">
          <div><h2>Review report</h2><p>${r.target_type === 'product' ? 'Listing' : 'Shop'} · reported ${when(r.created_at)} by ${esc(r.reporter)}</p></div>
          <button type="button" class="catalog-modal-close" data-close aria-label="Close">×</button>
        </div>
        <div class="catalog-modal-body">
          <div class="catalog-detail-section"><h4>About</h4><p>${about(r)}</p></div>
          <div class="catalog-detail-section"><h4>${esc(r.reason)}</h4><p style="white-space:pre-line">${esc(r.details || 'No details given.')}</p></div>
          ${r.open_about_shop > 1 ? `<div class="catalog-detail-section"><p><strong>${r.open_about_shop} open reports</strong> about this shop in total.</p></div>` : ''}
          <div class="catalog-detail-section">
            <h4>Note (what you did / why)</h4>
            <textarea id="report-note" class="form-input" rows="3" maxlength="1000" style="width:100%;resize:vertical"
              placeholder="e.g. Photos are copied from another shop — listing hidden."></textarea>
          </div>
          <p id="report-error" style="color:var(--red-600);font-size:13px" hidden></p>
        </div>
        <div class="catalog-modal-footer" style="gap:10px;flex-wrap:wrap">
          <button type="button" class="catalog-modal-cancel" data-action="dismiss">Dismiss</button>
          <button type="button" class="catalog-modal-cancel" data-action="resolve">Mark handled</button>
          ${r.product_id && !r.listing_hidden ? '<button type="button" class="btn-outline-danger" data-action="hide_product">Hide listing</button>' : ''}
          ${!r.shop_suspended ? '<button type="button" class="btn-outline-danger" data-action="suspend_shop">Suspend shop</button>' : ''}
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);

  const close = () => el.remove();
  el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  el.querySelector('.catalog-modal-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(); });

  el.querySelectorAll('[data-action]').forEach((btn) => btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    if (action === 'suspend_shop' && !confirm(`Suspend ${r.shop_name}? The shop and all its listings disappear until an admin reinstates it.`)) return;

    btn.disabled = true;
    try {
      const response = await fetch('reports.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, action, note: el.querySelector('#report-note').value }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      close();
      toast(result.message);
      loadReports();
    } catch (error) {
      const p = el.querySelector('#report-error');
      p.textContent = error.message || 'Could not save.';
      p.hidden = false;
      btn.disabled = false;
    }
  }));
}
