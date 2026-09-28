/* ============================================================
   Punlaan Admin — Settings Page
   Only settings that really work:
     - Account & Security: admin details + change password
       (change_admin_password.php)
     - Marketplace rules: shipping fee, commission, return period,
       smallest payout (marketplace_settings.php → settings table)
     - Platform: how the marketplace currently runs (read-only)
   ============================================================ */
import { icon } from './admin-icons.js';

const SECTIONS = [
  { key: 'account', label: 'Account & Security', iconName: 'shieldCheck' },
  { key: 'rules', label: 'Marketplace rules', iconName: 'tag' },
  { key: 'platform', label: 'Platform', iconName: 'settings' },
];

const state = { activeSection: 'account', admin: null, rules: null, services: null };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function showToast(msg, isError) {
  const old = document.getElementById('settings-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'settings-toast';
  el.className = 'settings-toast';
  if (isError) el.style.background = 'var(--red-600)';
  el.innerHTML = `${icon(isError ? 'alertCircle' : 'checkSquare', 14)} ${esc(msg)}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

/* ---------- Section renderers ---------- */
function sectionAccount() {
  const admin = state.admin;
  const name = admin ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() : '…';

  return `
    <div class="settings-section-header">
      <h2 class="settings-section-title">Account &amp; Security</h2>
      <p class="settings-section-sub">Your admin account and password.</p>
    </div>
    <div class="settings-form">
      <div class="settings-card-block">
        <p class="settings-block-title">Your Admin Account</p>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-input" type="text" value="${esc(name)}" readonly />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" value="${esc(admin ? admin.email : '…')}" readonly />
          </div>
        </div>
        <p class="form-hint" style="margin:0">To add another admin, go to User Management → All User Accounts.</p>
      </div>

      <form class="settings-card-block" id="password-form" novalidate>
        <p class="settings-block-title">Change Password</p>
        <div class="form-group">
          <label class="form-label" for="pw-current">Current Password</label>
          <input class="form-input" id="pw-current" type="password" autocomplete="current-password" required />
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label" for="pw-new">New Password</label>
            <input class="form-input" id="pw-new" type="password" placeholder="At least 8 characters" autocomplete="new-password" minlength="8" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="pw-confirm">Confirm New Password</label>
            <input class="form-input" id="pw-confirm" type="password" placeholder="Repeat new password" autocomplete="new-password" required />
          </div>
        </div>
        <button class="btn-primary" type="submit" id="pw-submit">Update Password</button>
      </form>
    </div>
  `;
}

function sectionRules() {
  const s = state.rules;
  if (!s) return '<p class="form-hint">Loading…</p>';

  const field = (key, label, hint, step = '1') => `
    <div class="form-group">
      <label class="form-label" for="rule-${key}">${label}</label>
      <input class="form-input" id="rule-${key}" data-rule="${key}" type="number" min="0" step="${step}" value="${esc(s[key])}" />
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;

  return `
    <div class="settings-section-header">
      <h2 class="settings-section-title">Marketplace rules</h2>
      <p class="settings-section-sub">Apply to new orders. Orders already placed keep their shipping fee and commission.</p>
    </div>
    <form class="settings-form" id="rules-form" novalidate>
      <div class="settings-card-block">
        <p class="settings-block-title">Shipping fee — by item size (per seller's parcel)</p>
        <p class="form-hint" style="margin:0 0 10px">The biggest item pays the "first item" fee; every other item adds its "each extra" fee.
          Extras stop growing at the cap (0 = no cap). Each subcategory's size is set in Categories &amp; Taxonomy.</p>
        <div class="ship-rules-table">
          <div></div><div class="ship-rules-head">First item (₱)</div><div class="ship-rules-head">Each extra (₱)</div><div class="ship-rules-head">Extras cap (₱)</div>
          ${['small', 'medium', 'large'].map((t) => `
            <div class="ship-rules-label">${t[0].toUpperCase() + t.slice(1)}</div>
            ${['first', 'extra', 'cap'].map((k) => `
              <input class="form-input" data-rule="ship_${t}_${k}" type="number" min="0" step="1" value="${esc(s[`ship_${t}_${k}`])}" aria-label="${t} ${k}" />`).join('')}
          `).join('')}
        </div>
      </div>
      <div class="settings-card-block">
        <p class="settings-block-title">Shipping fee — distance add-on (once per parcel)</p>
        <div class="form-row-2">
          ${field('ship_zone_city', 'Same city (₱)')}
          ${field('ship_zone_province', 'Same province (₱)', 'Metro Manila counts as one province.')}
        </div>
        <div class="form-row-2">
          ${field('ship_zone_region', 'Same region (₱)')}
          ${field('ship_zone_island', 'Same island group (₱)', 'Luzon, Visayas or Mindanao.')}
        </div>
        <div class="form-row-2">
          ${field('ship_zone_far', 'Other island group (₱)', 'e.g. Luzon → Mindanao.')}
        </div>
        <p class="form-hint" id="rule-example" style="margin:0"></p>
      </div>
      <div class="settings-card-block">
        <p class="settings-block-title">Sellers &amp; buyers</p>
        <div class="form-row-2">
          ${field('commission_percent', 'Punlaan commission (%)', 'Taken from each delivered item.', '0.5')}
          ${field('min_payout', 'Smallest payout (₱)', 'Sellers can request a payout from this amount.')}
        </div>
        <div class="form-row-2">
          ${field('return_days', 'Return period (days)', 'Buyers can ask for a return this many days after delivery. Seller earnings are released after it.')}
        </div>
      </div>
      <button class="btn-primary" type="submit" id="rules-submit">Save rules</button>
    </form>`;
}

/* Same formula as lib/shipping.php, for the live examples */
function ruleExample() {
  const get = (k) => Number(document.querySelector(`[data-rule="${k}"]`)?.value || 0);
  const extras = (tier, n) => {
    const total = n * get(`ship_${tier}_extra`);
    const cap = get(`ship_${tier}_cap`);
    return cap > 0 ? Math.min(cap, total) : total;
  };
  const fee = (tier, count, zone) => Math.ceil(get(`ship_${tier}_first`) + extras(tier, count - 1) + get(`ship_zone_${zone}`));
  const el = document.getElementById('rule-example');
  if (el) {
    el.innerHTML = `<strong>Examples:</strong> 1 seedling, same city → ₱${fee('small', 1, 'city')} ·
      5 seedlings, same province → ₱${fee('small', 5, 'province')} ·
      1 sapling, other island group → ₱${fee('large', 1, 'far')} ·
      5 saplings, same region → ₱${fee('large', 5, 'region')}`;
  }
}

async function saveRules(e) {
  e.preventDefault();
  const button = document.getElementById('rules-submit');
  const body = {};
  document.querySelectorAll('[data-rule]').forEach((input) => { body[input.dataset.rule] = input.value; });

  button.disabled = true;
  try {
    const response = await fetch('marketplace_settings.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    state.rules = { ...state.rules, ...body };
    showToast(result.message);
  } catch (error) {
    showToast(error.message || 'Could not save the rules.', true);
  } finally {
    button.disabled = false;
  }
}

function sectionPlatform() {
  const s = state.rules || {};
  const sv = state.services || {};
  const rows = [
    ['Payment methods', 'Cash on delivery, GCash, Maya, credit/debit card — ' + (
      sv.paymongo === 'live' ? 'online payments go through PayMongo (LIVE).'
      : sv.paymongo === 'test' ? 'online payments go through PayMongo (test keys — no real money).'
      : 'online payments are in test mode until PayMongo keys are added (third_party/paymongo/paymongo_config.php).')],
    ['Shipping fee', `Per seller, by item size (small ₱${s.ship_small_first ?? 25} / medium ₱${s.ship_medium_first ?? 45} / large ₱${s.ship_large_first ?? 70} for the first item, less for each extra) plus a distance add-on (₱${s.ship_zone_city ?? 0}–₱${s.ship_zone_far ?? 90}). Sellers can offer free shipping above an amount. Change it in Marketplace rules.`],
    ['Emails', sv.email === 'on' ? 'Order, return and payout emails are sent through Gmail.' : 'Off — add a Gmail App Password in third_party/mail/mail_config.php.'],
    ['Returns', `Buyers can ask for a return within ${s.return_days ?? 7} days of delivery. Sellers accept or decline; admins decide disputes (Returns & Payouts).`],
    ['Commission & payouts', `${s.commission_percent ?? 5}% commission; sellers request payouts from ₱${s.min_payout ?? 100}.`],
    ['New sellers', 'Reviewed by an admin in User Management → Verification'],
    ['New or edited listings', 'Reviewed by an admin in Product Management → Vendor Listings Approval'],
    ['Order steps', 'To Pack → Packed → Shipping → Shipped → Completed (or Cancelled)'],
    ['Customer cancellation', 'Allowed while an item is still To Pack; stock is returned'],
    ['Sign-in options', 'Email & password, Google (Facebook when its keys are added), “Keep me signed in” for 30 days'],
  ];

  return `
    <div class="settings-section-header">
      <h2 class="settings-section-title">Platform</h2>
      <p class="settings-section-sub">How Punlaan currently runs. Amounts can be changed in Marketplace rules.</p>
    </div>
    <div class="settings-form">
      <div class="settings-card-block">
        ${rows.map(([label, value]) => `
          <div class="toggle-row">
            <div>
              <p style="font-weight:600;color:var(--gray-800)">${label}</p>
              <p class="form-hint" style="margin:0">${value}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

const SECTION_RENDERERS = { account: sectionAccount, rules: sectionRules, platform: sectionPlatform };

async function loadAdmin() {
  try {
    const response = await fetch('./admin login/admin-current-user.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (result.user) state.admin = result.user;
  } catch (error) {
    console.error('Could not load admin details:', error);
  }

  if (Number(window.ADMIN_USER?.is_superadmin) !== 1) return;

  try {
    const response = await fetch('marketplace_settings.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (result.success) {
      state.rules = result.settings;
      state.services = result.services;
    }
  } catch (error) {
    console.error('Could not load marketplace rules:', error);
  }
}

async function changePassword(e) {
  e.preventDefault();

  const current = document.getElementById('pw-current');
  const next = document.getElementById('pw-new');
  const confirm = document.getElementById('pw-confirm');
  const button = document.getElementById('pw-submit');

  if (!current.value || !next.value) {
    showToast('Fill in your current and new password.', true);
    return;
  }
  if (next.value.length < 8) {
    showToast('New password must be at least 8 characters.', true);
    next.focus();
    return;
  }
  if (next.value !== confirm.value) {
    showToast('New passwords do not match.', true);
    confirm.focus();
    return;
  }

  button.disabled = true;
  button.textContent = 'Updating…';

  try {
    const response = await fetch('change_admin_password.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: current.value,
        new_password: next.value,
        confirm_password: confirm.value,
      }),
    });
    const result = await response.json();

    if (!result.success) throw new Error(result.message || 'Could not change the password.');

    current.value = '';
    next.value = '';
    confirm.value = '';
    showToast(result.message || 'Password changed.');
  } catch (error) {
    showToast(error.message || 'Could not change the password.', true);
  } finally {
    button.disabled = false;
    button.textContent = 'Update Password';
  }
}

/* Moderators only see their own account (no marketplace rules / platform) */
function visibleSections() {
  const isSuper = Number(window.ADMIN_USER?.is_superadmin) === 1;
  return isSuper ? SECTIONS : SECTIONS.filter((s) => s.key === 'account');
}

function draw() {
  const content = document.getElementById('content');
  const sections = visibleSections();
  if (!sections.some((s) => s.key === state.activeSection)) state.activeSection = 'account';

  content.innerHTML = `
    <div class="page-container">
      <h1 class="page-title">Admin Side: <span class="accent">SETTINGS</span></h1>
      <div class="settings-layout">
        <div class="settings-nav-panel">
          ${sections.map((s) => `
            <button class="settings-nav-item ${state.activeSection === s.key ? 'active' : ''}" data-settings-nav="${s.key}">
              <span class="settings-nav-icon">${icon(s.iconName, 16)}</span>
              ${s.label}
            </button>
          `).join('')}
        </div>
        <div class="settings-content-panel" id="settings-content">
          ${(SECTION_RENDERERS[state.activeSection] || sectionAccount)()}
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-settings-nav]').forEach((b) => {
    b.addEventListener('click', () => { state.activeSection = b.dataset.settingsNav; draw(); });
  });

  const form = document.getElementById('password-form');
  if (form) form.addEventListener('submit', changePassword);

  const rules = document.getElementById('rules-form');
  if (rules) {
    rules.addEventListener('submit', saveRules);
    rules.addEventListener('input', ruleExample);
    ruleExample();
  }
}

export async function renderSettings() {
  draw();
  if (!state.admin) {
    await loadAdmin();
    draw();
  }
}
