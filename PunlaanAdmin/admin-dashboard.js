/* ============================================================
   Punlaan Admin — Dashboard Page
   All numbers come from get_dashboard.php (real database data).
   ============================================================ */
import { icon } from './admin-icons.js';

const CATEGORY_COLORS = ['#2d6a4f', '#52b788', '#95d5b2', '#40916c', '#b7e4c7', '#a3b18a'];

const ACTIVITY_STYLES = {
  order: 'background:var(--blue-100);color:var(--blue-700)',
  user: 'background:var(--green-100);color:var(--green-700)',
  product: 'background:var(--yellow-100);color:var(--yellow-700)',
};

let dashboard = null;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function peso(value) {
  return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// seconds = how long ago, worked out by the server (same clock for everyone)
function timeAgo(seconds) {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '';
  const mins = Math.floor(Number(seconds) / 60);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function statCard(title, value, badge, sub) {
  return `
    <div class="stat-card">
      <p class="stat-card-title">${title}</p>
      <div class="stat-card-value-row">
        <span class="stat-card-value">${value}</span>
        ${badge ? `<span class="stat-badge" style="background:var(--green-100);color:var(--green-700)">${badge}</span>` : ''}
        ${sub ? `<span class="stat-sub">${sub}</span>` : ''}
      </div>
    </div>
  `;
}

export async function renderDashboard() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">MAIN DASHBOARD</span></h1>
      <div class="card card-pad"><p class="card-title">Loading dashboard…</p></div>
    </div>
  `;

  try {
    const response = await fetch('get_dashboard.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Could not load the dashboard.');
    dashboard = result;
  } catch (error) {
    console.error('Dashboard failed:', error);
    content.innerHTML = `
      <div class="page-container">
        <h1 class="page-title">Admin Side: <span class="accent">MAIN DASHBOARD</span></h1>
        <div class="card card-pad"><p class="card-title">Could not load the dashboard. Please refresh the page.</p></div>
      </div>
    `;
    return;
  }

  const { stats, top_vendors: topVendors, alerts, activity, categories } = dashboard;

  const alertRows = [
    { count: alerts.pending_sellers, label: 'seller application(s) waiting for review', link: '#/users/verification', color: 'var(--orange-500)', bg: 'var(--orange-50)' },
    { count: alerts.pending_listings, label: 'product listing(s) waiting for approval', link: '#/products/listings', color: 'var(--orange-500)', bg: 'var(--orange-50)' },
    { count: alerts.late_orders, label: 'order(s) not packed after 2+ days', link: '#/orders', color: 'var(--red-500)', bg: 'var(--red-50)' },
    { count: alerts.low_stock, label: 'approved product(s) low on stock (5 or fewer)', link: '#/products/catalog', color: 'var(--yellow-600)', bg: 'var(--yellow-50)' },
    { count: alerts.out_of_stock, label: 'approved product(s) out of stock', link: '#/products/catalog', color: 'var(--yellow-600)', bg: 'var(--yellow-50)' },
  ].filter((a) => a.count > 0);

  const totalCategory = categories.reduce((sum, c) => sum + c.count, 0);

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">MAIN DASHBOARD</span></h1>

      <div class="stat-grid-2">
        ${statCard('Marketplace Sales (Last 30 Days)', peso(stats.sales_30d), `${stats.orders_30d} order(s)`)}
        ${statCard('Open Orders', stats.orders_open, null, `${stats.orders_completed} completed so far`)}
        ${statCard('Active Sellers', stats.active_vendors, stats.new_vendors_30d ? `+${stats.new_vendors_30d} this month` : null)}
        ${statCard('Live Product Listings', stats.live_listings, null, 'Visible in the Marketplace')}
        ${statCard('Total Users', stats.total_users, stats.new_users_30d ? `+${stats.new_users_30d} this month` : null, 'Customers & sellers')}
        ${statCard('Waiting for Review', alerts.pending_sellers + alerts.pending_listings, null, `${alerts.pending_sellers} seller(s), ${alerts.pending_listings} listing(s)`)}
      </div>

      <div class="charts-row">
        <div class="card card-pad">
          <p class="card-title">Sales Performance <span class="sub">(Last 30 Days, cancelled items excluded)</span></p>
          <div class="chart-legend">
            <span><span class="legend-box" style="background:var(--green-200)"></span> Daily sales (₱)</span>
          </div>
          <div class="chart-area" id="sales-chart"></div>
        </div>
        <div class="right-col">
          <div class="card card-pad-sm flex-1">
            <p class="card-title">Top Sellers by Sales <span class="sub">(Last 30 Days)</span></p>
            <div class="vendor-list">
              ${topVendors.length ? topVendors.map((v, i) => `
                <div class="vendor-row">
                  <div class="vendor-avatar" style="background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}">${icon('leaf')}</div>
                  <div style="flex:1;min-width:0">
                    <p class="vendor-name">${esc(v.name)}</p>
                    <p class="vendor-sub">${v.items_sold} item(s) sold</p>
                  </div>
                  <div style="text-align:right">
                    <p class="vendor-amount">${peso(v.sales)}</p>
                  </div>
                </div>
              `).join('') : '<p class="vendor-sub">No sales in the last 30 days yet.</p>'}
            </div>
          </div>
          <div class="card card-pad-sm">
            <p class="card-title">Needs Your Attention</p>
            <div class="alert-list">
              ${alertRows.length ? alertRows.map((a) => `
                <a class="alert-row" href="${a.link}" style="background:${a.bg};text-decoration:none;color:inherit">
                  ${icon('alertCircle')}
                  <p class="alert-text">
                    <span style="font-weight:700;color:${a.color}">${a.count}</span>
                    ${a.label}
                  </p>
                </a>
              `).join('') : `
                <div class="alert-row" style="background:var(--green-50)">
                  ${icon('checkSquare')}
                  <p class="alert-text">All caught up — nothing needs review.</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>

      <div class="bottom-row">
        <div class="card card-pad">
          <p class="card-title">Live Products by Category</p>
          <div class="donut-wrap" style="margin-top:var(--space-3)">
            <svg width="160" height="160" viewBox="0 0 160 160" id="donut-chart"></svg>
            <div class="donut-legend">
              ${categories.length ? categories.map((c, i) => `
                <div class="donut-legend-item">
                  <span class="donut-legend-dot" style="background:${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"></span>
                  ${esc(c.name)} — ${c.count} (${Math.round((c.count / totalCategory) * 100)}%)
                </div>
              `).join('') : '<p class="vendor-sub">No live products yet.</p>'}
            </div>
          </div>
        </div>
        <div class="card card-pad">
          <p class="card-title">Recent Platform Activity</p>
          <div class="activity-list">
            ${activity.length ? activity.map((item) => `
              <div class="activity-row">
                <span class="activity-tag" style="${ACTIVITY_STYLES[item.type] || ''}">${esc(item.type)}</span>
                <p class="activity-label">${esc(item.label)}</p>
                <span class="activity-time" title="${esc(item.at)}">${timeAgo(item.ago)}</span>
              </div>
            `).join('') : '<p class="vendor-sub">No activity yet.</p>'}
          </div>
        </div>
      </div>
    </div>
  `;

  drawSalesChart();
  drawDonutChart();
}

export function redrawCharts() {
  drawSalesChart();
}

function drawSalesChart() {
  const container = document.getElementById('sales-chart');
  if (!container || !dashboard) return;

  const data = dashboard.sales_daily;
  const width = container.clientWidth || 600;
  const height = 220;
  const pad = { top: 10, right: 10, bottom: 25, left: 52 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxVal = Math.max(100, ...data.map((d) => d.sales));
  const xFor = (i) => pad.left + (i / (data.length - 1)) * w;
  const yFor = (v) => pad.top + h - (v / maxVal) * h;
  const points = data.map((d, i) => `${xFor(i)},${yFor(d.sales)}`);
  const line = `M ${points.join(' L ')}`;
  const area = `${line} L ${xFor(data.length - 1)},${pad.top + h} L ${xFor(0)},${pad.top + h} Z`;

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = pad.top + (h / 4) * i;
    return `<line x1="${pad.left}" y1="${y}" x2="${pad.left + w}" y2="${y}" stroke="#f0f0f0" stroke-dasharray="3 3"/>`;
  });

  const xLabels = data.map((d, i) => {
    if (i % 5 !== 0 && i !== data.length - 1) return '';
    const label = new Date(d.day + 'T00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    const anchor = i === data.length - 1 ? 'end' : 'middle';
    return `<text x="${xFor(i)}" y="${height - 8}" font-size="10" fill="#9ca3af" text-anchor="${anchor}">${label}</text>`;
  });

  const yLabels = Array.from({ length: 5 }, (_, i) => {
    const val = maxVal - (maxVal / 4) * i;
    const y = pad.top + (h / 4) * i;
    const text = val >= 1000 ? `₱${(val / 1000).toFixed(1)}k` : `₱${Math.round(val)}`;
    return `<text x="${pad.left - 6}" y="${y + 3}" font-size="10" fill="#9ca3af" text-anchor="end">${text}</text>`;
  });

  // Dots with a tooltip on days that had sales
  const dots = data.map((d, i) => d.sales > 0
    ? `<circle cx="${xFor(i)}" cy="${yFor(d.sales)}" r="3.5" fill="#2d6a4f"><title>${d.day}: ₱${d.sales.toLocaleString('en-PH')} (${d.orders} order(s))</title></circle>`
    : '');

  container.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stop-color="#b7e4c7" stop-opacity="0.8"/>
          <stop offset="95%" stop-color="#b7e4c7" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      ${gridLines.join('')}${yLabels.join('')}
      <path d="${area}" fill="url(#salesGrad)"/>
      <path d="${line}" fill="none" stroke="#52b788" stroke-width="2"/>
      ${dots.join('')}
      ${xLabels.join('')}
    </svg>
  `;
}

function drawDonutChart() {
  const svg = document.getElementById('donut-chart');
  if (!svg || !dashboard) return;

  const categories = dashboard.categories;
  const total = categories.reduce((s, c) => s + c.count, 0);

  if (!total) {
    svg.innerHTML = '<circle cx="80" cy="80" r="56" fill="none" stroke="#eee" stroke-width="28"/>';
    return;
  }

  // One category = full ring (an arc can't draw a full circle)
  if (categories.length === 1) {
    svg.innerHTML = `<circle cx="80" cy="80" r="56" fill="none" stroke="${CATEGORY_COLORS[0]}" stroke-width="28"/>`;
    return;
  }

  const cx = 80, cy = 80, rO = 70, rI = 42;
  let start = -Math.PI / 2;

  svg.innerHTML = categories.map((cat, i) => {
    const angle = (cat.count / total) * Math.PI * 2;
    const end = start + angle;
    const x1 = cx + rO * Math.cos(start), y1 = cy + rO * Math.sin(start);
    const x2 = cx + rO * Math.cos(end), y2 = cy + rO * Math.sin(end);
    const x3 = cx + rI * Math.cos(end), y3 = cy + rI * Math.sin(end);
    const x4 = cx + rI * Math.cos(start), y4 = cy + rI * Math.sin(start);
    const la = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${rO} ${rO} 0 ${la} 1 ${x2} ${y2} L ${x3} ${y3} A ${rI} ${rI} 0 ${la} 0 ${x4} ${y4} Z`;
    start = end + 0.035;
    return `<path d="${d}" fill="${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}"><title>${esc(cat.name)}: ${cat.count}</title></path>`;
  }).join('');
}
