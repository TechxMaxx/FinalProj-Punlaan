/* ============================================================
   Punlaan Admin — Returns & Payouts
   (money/returns_payouts.php)

   Disputes: a seller declined a return and the buyer asked
   Punlaan to decide → refund the buyer, or close it.
   Payouts:  sellers ask for their earnings → mark as sent
   (with the transfer reference) or decline.

   Everything else about returns is handled by the buyer and
   seller themselves.
   ============================================================ */
import { icon } from './admin-icons.js';

const state = { tab: 'disputes', returns: [], payouts: [], canPayouts: false };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function peso(value) {
  return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function when(value) {
  const d = new Date(String(value || '').replace(' ', 'T'));
  return isNaN(d) ? '' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toast(msg, isError) {
  document.getElementById('money-toast')?.remove();
  const el = document.createElement('div');
  el.id = 'money-toast';
  el.className = 'settings-toast';
  if (isError) el.style.background = 'var(--red-600)';
  el.innerHTML = `${icon(isError ? 'alertCircle' : 'checkSquare', 14)} ${esc(msg)}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3200);
}

async function post(body) {
  const response = await fetch('money/returns_payouts.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

const RETURN_BADGE = {
  disputed: 'badge-pending', requested: 'badge-pricing', rejected: 'badge-flagged',
  refunded: 'badge-live', closed: 'badge-pricing', cancelled: 'badge-pricing',
};


export async function loadMoney() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">RETURNS &amp; PAYOUTS</span></h1>
      <div class="card card-pad"><p class="card-title">Loading…</p></div>
    </div>`;

  try {
    const response = await fetch('money/returns_payouts.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    state.returns = result.returns || [];
    state.payouts = result.payouts || [];
    // Moderators: disputes only (payouts are for Super Admins)
    state.canPayouts = !!result.can_payouts;
    if (!state.canPayouts && ['payouts', 'history'].includes(state.tab)) state.tab = 'disputes';
  } catch (error) {
    content.querySelector('.card').innerHTML = '<p class="card-title">Could not load. Please refresh the page.</p>';
    return;
  }

  draw();
}


function draw() {
  const content = document.getElementById('content');
  const disputes = state.returns.filter((r) => r.status === 'disputed');
  const requested = state.payouts.filter((p) => p.status === 'requested');
  const toSend = requested.reduce((s, p) => s + p.amount, 0);

  const tabs = [
    ['disputes', `Disputes (${disputes.length})`],
    ['payouts', `Payout requests (${requested.length})`],
    ['returns', `All returns (${state.returns.length})`],
    ['history', 'Payout history'],
  ].filter(([key]) => state.canPayouts || !['payouts', 'history'].includes(key));

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">RETURNS &amp; PAYOUTS</span></h1>

      <div class="stat-grid-3" style="margin-bottom:var(--space-5)">
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Disputes to decide</p>
            <p class="stat-card-value">${disputes.length}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">Buyer and seller disagree on a return</p>
          </div>
          <div class="stat-icon-box" style="background:var(--yellow-50)"><span style="color:var(--yellow-500)">${icon('alertTriangle', 22)}</span></div>
        </div>
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Payouts to send</p>
            <p class="stat-card-value">${state.canPayouts ? requested.length : '—'}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">${state.canPayouts ? `${peso(toSend)} in total` : 'Handled by a Super Admin'}</p>
          </div>
          <div class="stat-icon-box" style="background:var(--green-50)"><span style="color:var(--green-600)">${icon('package', 22)}</span></div>
        </div>
        <div class="stat-card-icon">
          <div>
            <p class="stat-card-title">Returns handled by sellers</p>
            <p class="stat-card-value">${state.returns.filter((r) => r.status !== 'disputed').length}</p>
            <p class="stat-sub" style="font-size:12px;margin-top:2px">No admin action needed</p>
          </div>
          <div class="stat-icon-box" style="background:var(--green-50)"><span style="color:var(--green-600)">${icon('checkSquare', 22)}</span></div>
        </div>
      </div>

      <div class="card card-pad">
        <div class="listing-filter-bar" style="margin-bottom:var(--space-4)">
          ${tabs.map(([key, label]) => `
            <button class="listing-filter-btn ${state.tab === key ? 'active' : ''}" data-tab="${key}">${label}</button>`).join('')}
        </div>
        <div id="money-body">${body()}</div>
      </div>
    </div>`;

  content.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; draw(); }));
  content.querySelectorAll('[data-decide]').forEach((b) => b.addEventListener('click', () => openDecide(Number(b.dataset.decide))));
  content.querySelectorAll('[data-payout]').forEach((b) => b.addEventListener('click', () => openPayout(Number(b.dataset.payout))));
}


function returnRow(r, withAction) {
  return `
    <tr>
      <td><strong>${esc(r.order_number)}</strong><br><span class="cell-muted" style="font-size:12px">${when(r.created_at)}</span></td>
      <td>${esc(r.product_name)} × ${r.quantity}<br><span class="cell-muted" style="font-size:12px">${esc(r.reason)}</span></td>
      <td style="font-size:13px">${esc(r.customer)}</td>
      <td style="font-size:13px">${esc(r.vendor)}</td>
      <td class="cell-bold">${peso(r.refund_amount)}</td>
      <td><span class="listing-badge ${RETURN_BADGE[r.status] || ''}">${esc(r.status_label)}</span></td>
      <td>${withAction ? `<button class="action-link approve" data-decide="${r.return_id}">Decide</button>` : ''}</td>
    </tr>`;
}

function body() {
  if (state.tab === 'disputes' || state.tab === 'returns') {
    const list = state.tab === 'disputes' ? state.returns.filter((r) => r.status === 'disputed') : state.returns;
    return `
      <div class="table-scroll">
        <table class="orders-table">
          <thead><tr><th>Order</th><th>Item &amp; reason</th><th>Buyer</th><th>Seller</th><th>Refund</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${list.length ? list.map((r) => returnRow(r, r.status === 'disputed')).join('')
              : `<tr><td colspan="7" class="empty-row">${state.tab === 'disputes' ? 'No disputes — buyers and sellers are sorting returns out themselves.' : 'No returns yet.'}</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  const list = state.tab === 'payouts'
    ? state.payouts.filter((p) => p.status === 'requested')
    : state.payouts.filter((p) => p.status !== 'requested');

  return `
    <div class="table-scroll">
      <table class="orders-table">
        <thead><tr><th>Requested</th><th>Seller</th><th>Amount</th><th>Send to</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${list.length ? list.map((p) => `
            <tr>
              <td>${when(p.requested_at)}</td>
              <td style="font-size:13px">${esc(p.vendor)}</td>
              <td class="cell-bold">${peso(p.amount)}</td>
              <td style="font-size:13px">${esc(p.method_label)}<br>${esc(p.account_name)} · ${esc(p.account_number)}</td>
              <td><span class="listing-badge ${p.status === 'paid' ? 'badge-live' : p.status === 'rejected' ? 'badge-flagged' : 'badge-pending'}">
                ${p.status === 'paid' ? 'Sent' : p.status === 'rejected' ? 'Declined' : 'Waiting'}</span>
                ${p.reference ? `<br><span class="cell-muted" style="font-size:12px">Ref: ${esc(p.reference)}</span>` : ''}
                ${p.admin_note ? `<br><span class="cell-muted" style="font-size:12px">${esc(p.admin_note)}</span>` : ''}</td>
              <td>${p.status === 'requested' ? `<button class="action-link approve" data-payout="${p.payout_id}">Handle</button>` : ''}</td>
            </tr>`).join('')
            : `<tr><td colspan="6" class="empty-row">${state.tab === 'payouts' ? 'No payout requests right now.' : 'No payouts handled yet.'}</td></tr>`}
        </tbody>
      </table>
    </div>`;
}


/* ---------- dialogs (same look as the listing review) ---------- */

function modal(title, sub, inner, buttons) {
  document.getElementById('money-modal')?.remove();
  const el = document.createElement('div');
  el.id = 'money-modal';
  el.innerHTML = `
    <div class="catalog-modal-overlay">
      <div class="catalog-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="catalog-modal-header">
          <div><h2>${esc(title)}</h2><p>${sub}</p></div>
          <button type="button" class="catalog-modal-close" data-close aria-label="Close">×</button>
        </div>
        <div class="catalog-modal-body">${inner}<p id="money-error" style="color:var(--red-600);font-size:13px" hidden></p></div>
        <div class="catalog-modal-footer" style="gap:10px">
          <button type="button" class="catalog-modal-cancel" data-close>Cancel</button>
          ${buttons}
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  el.querySelector('.catalog-modal-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(); });
  return el;
}

function modalError(el, message) {
  const p = el.querySelector('#money-error');
  p.textContent = message;
  p.hidden = false;
}

function openDecide(returnId) {
  const r = state.returns.find((x) => x.return_id === returnId);
  if (!r) return;

  const el = modal('Decide the dispute', `${esc(r.order_number)} · ${esc(r.product_name)} × ${r.quantity} · ${peso(r.refund_amount)}`, `
    <div class="catalog-detail-grid">
      <div class="catalog-detail-item"><span>Buyer</span><strong>${esc(r.customer)}</strong></div>
      <div class="catalog-detail-item"><span>Seller</span><strong>${esc(r.vendor)}</strong></div>
      <div class="catalog-detail-item"><span>Paid by</span><strong>${esc(r.payment_method === 'cod' ? 'Cash on delivery' : r.payment_method.toUpperCase())}</strong></div>
      <div class="catalog-detail-item"><span>Asked on</span><strong>${when(r.created_at)}</strong></div>
    </div>
    <div class="catalog-detail-section"><h4>Buyer: ${esc(r.reason)}</h4><p style="white-space:pre-line">${esc(r.details || '')}</p>
      ${r.photo ? `<a href="../${esc(r.photo)}" target="_blank" rel="noopener"><img src="../${esc(r.photo)}" alt="Buyer's photo" style="max-width:220px;border-radius:10px;margin-top:8px"></a>` : ''}</div>
    <div class="catalog-detail-section"><h4>Seller declined because</h4><p style="white-space:pre-line">${esc(r.seller_note || '—')}</p></div>
    <div class="catalog-detail-section"><h4>Buyer's reply</h4><p style="white-space:pre-line">${esc(r.dispute_note || '—')}</p></div>
    <div class="catalog-detail-section">
      <h4>Your decision — reason (both will see it)</h4>
      <textarea id="decide-note" class="form-input" rows="3" maxlength="1000" style="width:100%;resize:vertical"
        placeholder="e.g. The photo clearly shows the plant arrived broken."></textarea>
    </div>`, `
    <button type="button" class="btn-outline-danger" id="decide-close">Close — seller keeps it</button>
    <button type="button" class="btn-primary" id="decide-refund">Refund the buyer</button>`);

  const send = async (decision, btn) => {
    btn.disabled = true;
    const result = await post({ action: 'decide', return_id: returnId, decision, note: el.querySelector('#decide-note').value });
    if (!result.success) { modalError(el, result.message); btn.disabled = false; return; }
    el.remove();
    toast(result.message);
    loadMoney();
  };

  el.querySelector('#decide-refund').addEventListener('click', (e) => send('refund', e.currentTarget));
  el.querySelector('#decide-close').addEventListener('click', (e) => send('close', e.currentTarget));
}

function openPayout(payoutId) {
  const p = state.payouts.find((x) => x.payout_id === payoutId);
  if (!p) return;

  const el = modal('Send payout', `${esc(p.vendor)} · requested ${when(p.requested_at)}`, `
    <div class="catalog-detail-grid">
      <div class="catalog-detail-item"><span>Amount</span><strong>${peso(p.amount)}</strong></div>
      <div class="catalog-detail-item"><span>Send by</span><strong>${esc(p.method_label)}</strong></div>
      <div class="catalog-detail-item"><span>Account name</span><strong>${esc(p.account_name)}</strong></div>
      <div class="catalog-detail-item"><span>Number</span><strong>${esc(p.account_number)}</strong></div>
    </div>
    <div class="catalog-detail-section">
      <h4>After sending the money, enter the reference number</h4>
      <input id="payout-ref" class="form-input" maxlength="100" style="width:100%" placeholder="e.g. GCash ref 1234 567 890123">
    </div>
    <div class="catalog-detail-section">
      <h4>Or decline — reason for the seller</h4>
      <textarea id="payout-note" class="form-input" rows="2" maxlength="1000" style="width:100%;resize:vertical"
        placeholder="e.g. The account name doesn't match the seller's name."></textarea>
    </div>`, `
    <button type="button" class="btn-outline-danger" id="payout-reject">Decline</button>
    <button type="button" class="btn-primary" id="payout-paid">Mark as sent</button>`);

  el.querySelector('#payout-paid').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    const result = await post({ action: 'payout_paid', payout_id: payoutId, reference: el.querySelector('#payout-ref').value });
    if (!result.success) { modalError(el, result.message); e.target.disabled = false; return; }
    el.remove(); toast(result.message); loadMoney();
  });

  el.querySelector('#payout-reject').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    const result = await post({ action: 'payout_reject', payout_id: payoutId, note: el.querySelector('#payout-note').value });
    if (!result.success) { modalError(el, result.message); e.target.disabled = false; return; }
    el.remove(); toast(result.message); loadMoney();
  });
}
