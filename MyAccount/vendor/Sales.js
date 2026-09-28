/* =========================================================
   SALES & PAYOUTS (seller)
   ../vendor_php/sales.php — earnings, sales per day, best
   sellers, payout requests. Rules (commission, return period,
   smallest payout) come from Admin → Settings.
========================================================= */

const SALES_API = '../vendor_php/sales.php';

let data = null;
let days = 30;

document.addEventListener('DOMContentLoaded', async () => {

  const user = await getCurrentUser();

  if (!user) {
    window.location.replace('../../register/Login.html');
    return;
  }

  document.getElementById('app').innerHTML = renderLayout('sales');

  if (Number(user.is_vendor) !== 1) {
    document.getElementById('pageContent').innerHTML =
      '<div class="empty-state">Only sellers have sales reports.</div>';
    return;
  }

  document.getElementById('pageContent').innerHTML = '<div class="loading">Loading your sales…</div><div id="modalRoot"></div>';
  load();
});


async function load() {
  try {
    const response = await fetch(`${SALES_API}?days=${days}`, { credentials: 'same-origin', cache: 'no-store' });
    data = await response.json();
    if (!data.success) throw new Error(data.message);
    render();
  } catch (err) {
    document.getElementById('pageContent').innerHTML =
      `<div class="empty-state">Could not load your sales. ${escapeHtml(err.message || '')}</div>`;
  }
}


function render() {
  const e = data.earnings;
  const r = data.report;
  const rules = data.rules;
  const canPayout = e.balance >= rules.min_payout;

  document.getElementById('pageContent').innerHTML = `
    <div class="vsales">

      <div class="vsales__balances">
        <div class="vsales__balance vsales__balance--main">
          <div class="vsales__label">Available to pay out</div>
          <div class="vsales__amount">${formatPeso(e.balance)}</div>
          <button class="btn btn--primary" id="payoutBtn" ${canPayout ? '' : 'disabled'}>Request payout</button>
          <div class="vsales__small">
            ${canPayout ? 'Sent to your GCash, Maya or bank account.' : `The smallest payout is ${formatPeso(rules.min_payout)}.`}
          </div>
        </div>
        <div class="vsales__balance">
          <div class="vsales__label">On hold</div>
          <div class="vsales__amount">${formatPeso(e.on_hold)}</div>
          <div class="vsales__small">Delivered less than ${rules.return_days} days ago, or has an open return.</div>
        </div>
        <div class="vsales__balance">
          <div class="vsales__label">Requested</div>
          <div class="vsales__amount">${formatPeso(e.requested)}</div>
          <div class="vsales__small">Waiting to be sent by Punlaan.</div>
        </div>
        <div class="vsales__balance">
          <div class="vsales__label">Paid out</div>
          <div class="vsales__amount">${formatPeso(e.paid_out)}</div>
          <div class="vsales__small">Total received so far.</div>
        </div>
      </div>

      <div class="vsales__card">
        <div class="vsales__card-head">
          <h2>Sales report</h2>
          <div class="filters">
            ${[7, 30, 90, 365].map(d => `
              <button class="filter-btn${d === days ? ' filter-btn--active' : ''}" onclick="setDays(${d})">
                ${d === 365 ? '12 months' : 'Last ' + d + ' days'}
              </button>`).join('')}
          </div>
        </div>

        <div class="vsales__kpis">
          <div><span>${formatPeso(r.total)}</span>Delivered sales</div>
          <div><span>${r.orders}</span>Orders placed</div>
          <div><span>${r.items}</span>Items ordered</div>
          <div><span>${r.cancelled}</span>Cancelled</div>
          <div><span>${r.review_count ? r.rating.toFixed(1) + ' ★' : '—'}</span>${r.review_count} review${r.review_count === 1 ? '' : 's'}</div>
        </div>

        <div class="vsales__chart" id="salesChart"></div>
      </div>

      <div class="vsales__grid">
        <div class="vsales__card">
          <div class="vsales__card-head"><h2>Best sellers</h2></div>
          ${r.top_products.length ? `
            <table class="vsales__table">
              <thead><tr><th>Product</th><th>Sold</th><th>Sales</th></tr></thead>
              <tbody>
                ${r.top_products.map(p => `
                  <tr>
                    <td>
                      <div class="vsales__product">
                        <img src="${escapeHtml(productSrc(p.image))}" alt="" onerror="this.style.visibility='hidden'">
                        <span>${escapeHtml(p.name)}</span>
                      </div>
                    </td>
                    <td>${p.qty}</td>
                    <td>${formatPeso(p.amount)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>` : '<div class="empty-state">No delivered sales in this period yet.</div>'}
        </div>

        <div class="vsales__card">
          <div class="vsales__card-head"><h2>How your earnings add up</h2></div>
          <div class="vsales__rows">
            <div><span>Delivered item sales</span><span>${formatPeso(e.gross)}</span></div>
            <div><span>Punlaan commission (${rules.commission_percent}%)</span><span>− ${formatPeso(e.commission)}</span></div>
            <div><span>Shipping fees paid by buyers</span><span>+ ${formatPeso(e.shipping)}</span></div>
            <div class="vsales__rows-total"><span>Total earned</span><span>${formatPeso(e.net)}</span></div>
            <div class="vsales__muted"><span>Refunded returns (not counted)</span><span>${formatPeso(e.refunds)}</span></div>
          </div>
          <p class="vsales__note">
            All time. Buyers pay Punlaan (cash to the rider, or GCash / Maya / card); Punlaan keeps the
            commission and sends you the rest when you request a payout.
          </p>
        </div>
      </div>

      <div class="vsales__card">
        <div class="vsales__card-head"><h2>Payouts</h2></div>
        ${data.payouts.length ? `
          <div class="vsales__table-wrap">
            <table class="vsales__table">
              <thead><tr><th>Requested</th><th>Amount</th><th>To</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>
                ${data.payouts.map(p => `
                  <tr>
                    <td>${formatDate(p.requested_at)}</td>
                    <td>${formatPeso(p.amount)}</td>
                    <td>${escapeHtml(p.method_label)} · ${escapeHtml(p.account_number)}</td>
                    <td><span class="ptag ${p.status === 'paid' ? 'ptag--good' : p.status === 'rejected' ? 'ptag--bad' : 'ptag--warn'}">${escapeHtml(p.status === 'requested' ? 'Waiting' : p.status === 'paid' ? 'Sent' : 'Declined')}</span>
                      ${p.admin_note ? `<div class="vsales__small">${escapeHtml(p.admin_note)}</div>` : ''}</td>
                    <td>${escapeHtml(p.reference || '—')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<div class="empty-state">No payouts yet.</div>'}
      </div>

    </div>
    <div id="modalRoot"></div>
  `;

  drawChart(r.series);
  document.getElementById('payoutBtn').addEventListener('click', openPayoutDialog);
}

function setDays(d) {
  days = d;
  load();
}

function productSrc(path) {
  if (!path) return '../../FrontEnd/products/no_photo.jpg';
  return /^(https?:|\/|\.\.\/)/.test(path) ? path : '../../FrontEnd/' + path;
}


/* ---------- bar chart (plain SVG, no library) ---------- */

function drawChart(series) {
  const box = document.getElementById('salesChart');

  // 12 months → one bar per month
  let bars = series;
  if (series.length > 90) {
    const months = {};
    series.forEach(s => {
      const key = s.day.slice(0, 7);
      months[key] = (months[key] || 0) + s.amount;
    });
    bars = Object.entries(months).map(([day, amount]) => ({ day: day + '-01', amount, month: true }));
  }

  const max = Math.max(...bars.map(b => b.amount), 1);
  const w = 760, h = 220, pad = 34;
  const bw = (w - pad) / bars.length;

  const label = (b) => {
    const d = new Date(b.day + 'T00:00:00');
    return b.month
      ? d.toLocaleDateString('en-PH', { month: 'short' })
      : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const every = Math.ceil(bars.length / 10);

  box.innerHTML = `
    <svg viewBox="0 0 ${w} ${h + 26}" role="img" aria-label="Delivered sales per ${bars[0] && bars[0].month ? 'month' : 'day'}">
      <line x1="${pad}" y1="${h}" x2="${w}" y2="${h}" stroke="#e3ebe5"/>
      <text x="0" y="12" font-size="11" fill="#8aa596">${formatPeso(max).replace('.00', '')}</text>
      <text x="0" y="${h}" font-size="11" fill="#8aa596">₱0</text>
      ${bars.map((b, i) => {
        const bh = Math.round((b.amount / max) * (h - 20));
        const x = pad + i * bw + bw * 0.15;
        return `
          <rect x="${x.toFixed(1)}" y="${h - bh}" width="${(bw * 0.7).toFixed(1)}" height="${Math.max(bh, b.amount ? 2 : 0)}" rx="3" fill="#52b788">
            <title>${label(b)}: ${formatPeso(b.amount)}</title>
          </rect>
          ${i % every === 0 ? `<text x="${(x + bw * 0.35).toFixed(1)}" y="${h + 18}" font-size="10.5" fill="#8aa596" text-anchor="middle">${label(b)}</text>` : ''}`;
      }).join('')}
    </svg>
    ${bars.every(b => !b.amount) ? '<div class="vsales__chart-empty">No delivered sales in this period yet.</div>' : ''}`;
}


/* ---------- payout request ---------- */

function openPayoutDialog() {
  const e = data.earnings;

  openDialog({
    title: 'Request a payout',
    sub: 'Available: ' + formatPeso(e.balance),
    body: `
      <label for="payAmount">Amount (₱)</label>
      <input type="number" id="payAmount" min="${data.rules.min_payout}" max="${e.balance}" step="0.01" value="${e.balance.toFixed(2)}" />
      <label for="payMethod">Send to</label>
      <select id="payMethod">
        ${Object.entries(data.methods).map(([k, v]) => `<option value="${k}">${escapeHtml(v)}</option>`).join('')}
      </select>
      <label for="payName">Account name</label>
      <input type="text" id="payName" maxlength="150" placeholder="Name on the GCash / Maya / bank account" />
      <label for="payNumber">Mobile or account number</label>
      <input type="text" id="payNumber" maxlength="30" inputmode="numeric" placeholder="e.g. 09171234567" />
      <div class="pdialog__hint">Punlaan sends payouts within 1–3 business days and notifies you with the reference number.</div>`,
    actions: `
      <button type="button" class="btn btn--ghost" onclick="closeDialog()">Cancel</button>
      <button type="button" class="btn btn--primary" id="sendPayoutBtn">Request payout</button>`
  });

  document.getElementById('sendPayoutBtn').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    try {
      const result = await postJson(SALES_API, {
        action: 'payout',
        amount: Number(document.getElementById('payAmount').value),
        method: document.getElementById('payMethod').value,
        account_name: document.getElementById('payName').value,
        account_number: document.getElementById('payNumber').value
      });
      if (!result.success) throw new Error(result.message);
      closeDialog();
      showToast(result.message);
      load();
    } catch (err) {
      dialogError(err.message || 'Could not request the payout.');
      btn.disabled = false;
    }
  });
}
