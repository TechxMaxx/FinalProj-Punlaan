/* Profile.js — Customer profile: personal info, photo, address book,
 * password, and applying to sell (or managing the shop once approved).
 *
 * Tabs are linkable: Profile.html#info | #addresses | #security | #sell
 */

let profileData = null;
let currentUser = null;
let addresses = [];

const TABS = [
  { key: 'info',      label: 'Personal info' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'security',  label: 'Security' },
  { key: 'sell',      label: 'Selling' },
];

const ICONS = {
  camera: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
  user: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  store: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>',
  clock: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  bag: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
};


/* =========================================================
   START
========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  currentUser = await getCurrentUser();

  if (!currentUser) {
    window.location.replace('../../register/Login.html');
    return;
  }

  document.getElementById('app').innerHTML = renderLayout('profile');
  document.getElementById('pageContent').innerHTML = pageHtml();

  document.querySelectorAll('.pf-tab').forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab, true));
  });

  window.addEventListener('hashchange', () => showTab(currentHashTab(), false));

  showTab(currentHashTab(), false);

  await loadProfile();
  loadAddresses();
  loadStats();
});

function currentHashTab() {
  const key = window.location.hash.replace('#', '');
  return TABS.some((t) => t.key === key) ? key : 'info';
}

function showTab(key, updateHash) {

  document.querySelectorAll('.pf-tab').forEach((tab) => {
    const active = tab.dataset.tab === key;
    tab.classList.toggle('pf-tab--active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  document.querySelectorAll('.pf-panel').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== key;
  });

  if (updateHash && window.location.hash !== '#' + key) {
    history.replaceState(null, '', '#' + key);
  }
}


/* =========================================================
   PAGE SHELL
========================================================= */

function pageHtml() {
  return `
    <section class="pf-header" id="profileHeader">
      <div class="pf-header__banner"></div>
      <div class="pf-header__body"><div class="loading">Loading profile…</div></div>
    </section>

    <nav class="pf-tabs" role="tablist" aria-label="Profile sections">
      ${TABS.map((t) => `
        <button type="button" class="pf-tab" role="tab" data-tab="${t.key}" id="tab-${t.key}">
          ${t.label}
        </button>`).join('')}
    </nav>

    <!-- PERSONAL INFO -->
    <section class="pf-panel" data-panel="info" role="tabpanel" aria-labelledby="tab-info">
      <div class="pf-grid">
        <form class="pf-card" id="infoForm" novalidate>
          <div class="pf-card__header">
            <h2 class="pf-card__title">Personal information</h2>
            <p class="pf-card__desc">This is how sellers and delivery riders will know you.</p>
          </div>
          <div class="pf-card__body">
            <div class="pf-row">
              <label class="pf-field">
                <span class="pf-label">First name</span>
                <input class="pf-input" name="first_name" autocomplete="given-name" required maxlength="100">
              </label>
              <label class="pf-field">
                <span class="pf-label">Last name</span>
                <input class="pf-input" name="last_name" autocomplete="family-name" required maxlength="100">
              </label>
            </div>
            <div class="pf-row">
              <label class="pf-field">
                <span class="pf-label">Email</span>
                <input class="pf-input" name="email" type="email" autocomplete="email" required>
              </label>
              <label class="pf-field">
                <span class="pf-label">Mobile number</span>
                <input class="pf-input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="0917 123 4567">
              </label>
            </div>
            <label class="pf-field">
              <span class="pf-label">About me <span class="pf-optional">(optional)</span></span>
              <textarea class="pf-textarea" name="bio" maxlength="500" placeholder="Tell the community about yourself and your plants…"></textarea>
            </label>
          </div>
          <div class="pf-card__footer">
            <span class="pf-status" id="infoStatus"></span>
            <button type="submit" class="pf-btn pf-btn--primary" id="infoSave" disabled>Save changes</button>
          </div>
        </form>

        <div class="pf-card">
          <div class="pf-card__header">
            <h2 class="pf-card__title">Account overview</h2>
            <p class="pf-card__desc">A quick snapshot of your activity.</p>
          </div>
          <div class="pf-card__body">
            <div class="pf-stats" id="accountStats"><div class="loading">Loading…</div></div>
            <a class="pf-btn pf-btn--ghost pf-btn--block" href="MyOrders.html">${ICONS.bag} View my orders</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ADDRESSES -->
    <section class="pf-panel" data-panel="addresses" role="tabpanel" aria-labelledby="tab-addresses" hidden>
      <div class="pf-card">
        <div class="pf-card__header pf-card__header--row">
          <div>
            <h2 class="pf-card__title">My addresses</h2>
            <p class="pf-card__desc">Save up to 10 addresses. Your default address is pre-selected at checkout.</p>
          </div>
          <button type="button" class="pf-btn pf-btn--primary" id="addAddressBtn">${ICONS.plus} Add address</button>
        </div>
        <div class="pf-card__body">
          <div class="ab-list" id="addressList"><div class="loading">Loading addresses…</div></div>
        </div>
      </div>
    </section>

    <!-- SECURITY -->
    <section class="pf-panel" data-panel="security" role="tabpanel" aria-labelledby="tab-security" hidden>
      <div class="pf-grid">
        <form class="pf-card" id="passwordForm" novalidate>
          <div class="pf-card__header">
            <h2 class="pf-card__title">Change password</h2>
            <p class="pf-card__desc">Use at least 8 characters. You'll stay logged in on this device.</p>
          </div>
          <div class="pf-card__body">
            <label class="pf-field">
              <span class="pf-label">Current password</span>
              <input class="pf-input" name="current_password" type="password" autocomplete="current-password" required>
            </label>
            <div class="pf-row">
              <label class="pf-field">
                <span class="pf-label">New password</span>
                <input class="pf-input" name="new_password" type="password" autocomplete="new-password" minlength="8" required>
              </label>
              <label class="pf-field">
                <span class="pf-label">Confirm new password</span>
                <input class="pf-input" name="confirm_password" type="password" autocomplete="new-password" minlength="8" required>
              </label>
            </div>
            <p class="pf-hint" id="socialPasswordHint" hidden></p>
          </div>
          <div class="pf-card__footer">
            <span class="pf-status" id="passwordStatus"></span>
            <button type="submit" class="pf-btn pf-btn--primary" id="passwordSave">Update password</button>
          </div>
        </form>

        <div class="pf-card">
          <div class="pf-card__header">
            <h2 class="pf-card__title">Sign-in methods</h2>
            <p class="pf-card__desc">Ways you can log in to Punlaan.</p>
          </div>
          <div class="pf-card__body">
            <div class="pf-linked" id="linkedAccounts"></div>
            <div class="pf-logout">
              <div>
                <p class="pf-logout__title">Log out</p>
                <p class="pf-card__desc">End your session on this device.</p>
              </div>
              <button type="button" class="pf-btn pf-btn--danger" id="logoutBtn">Log out</button>
            </div>
          </div>
        </div>

        <form class="pf-card" id="deleteAccountForm" novalidate>
          <div class="pf-card__header">
            <h2 class="pf-card__title">Delete my account</h2>
            <p class="pf-card__desc">
              This can't be undone. Your name, email, phone, addresses, photo and shop are erased, and you're signed out everywhere.
              Past orders stay in the seller's records as "Deleted account".
            </p>
          </div>
          <div class="pf-card__body">
            <label class="pf-field">
              <span class="pf-label">Enter your password to confirm</span>
              <input class="pf-input" name="password" type="password" autocomplete="current-password" required>
            </label>
            <p class="pf-hint">Orders on the way, open returns or unpaid shop earnings must be finished first.</p>
          </div>
          <div class="pf-card__footer">
            <span class="pf-status" id="deleteStatus"></span>
            <button type="submit" class="pf-btn pf-btn--danger" id="deleteAccountBtn">Delete my account</button>
          </div>
        </form>
      </div>
    </section>

    <!-- SELLING -->
    <section class="pf-panel" data-panel="sell" role="tabpanel" aria-labelledby="tab-sell" hidden>
      <div id="sellPanel"><div class="loading">Loading…</div></div>
    </section>
  `;
}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {

  try {
    const response = await fetch('../customer_php/get_profile.php', { credentials: 'same-origin' });
    const result = await response.json();

    if (!result.success) throw new Error(result.message || 'Could not load profile.');

    profileData = result.profile;

    renderHeader();
    fillInfoForm();
    renderLinkedAccounts();
    renderSellPanel();

  } catch (err) {
    document.querySelector('#profileHeader .pf-header__body').innerHTML =
      `<div class="loading">Could not load your profile. ${escapeHtml(err.message)}</div>`;
  }
}

function fullName(p) {
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Your name';
}

function avatarSrc(path) {
  if (!path) return '';
  return /^(https?:|data:|\/)/.test(path) ? path : '../../' + path;
}

function isSeller(p) {
  return Number(p.is_vendor) === 1 && Number(p.verification_status) === 2;
}

function sellerState(p) {
  if (isSeller(p)) return 'approved';
  if (Number(p.verification_status) === 1) return 'pending';
  if (Number(p.verification_status) === 3) return 'rejected';
  return 'none';
}

function renderHeader() {

  const p = profileData;
  const name = fullName(p);
  const photo = avatarSrc(p.profile_picture);
  const state = sellerState(p);

  const joined = p.created_at
    ? new Date(String(p.created_at).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
    : '';

  const badge = {
    approved: '<span class="pf-badge pf-badge--seller">Seller</span>',
    pending: '<span class="pf-badge pf-badge--pending">Seller application pending</span>',
    rejected: '',
    none: '',
  }[state];

  document.querySelector('#profileHeader .pf-header__body').innerHTML = `
    <div class="pf-avatar">
      ${photo
        ? `<img src="${escapeHtml(photo)}" alt="" class="pf-avatar__img">`
        : `<div class="pf-avatar__img pf-avatar__img--empty">${ICONS.user}</div>`}
      <label class="pf-avatar__edit" title="Change photo">
        ${ICONS.camera}
        <span class="sr-only">Change profile photo</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" id="avatarInput" hidden>
      </label>
    </div>
    <div class="pf-header__info">
      <h1 class="pf-header__name">${escapeHtml(name)}</h1>
      <p class="pf-header__meta">
        <span>${escapeHtml(p.email || '')}</span>
        ${joined ? `<span class="pf-dot"></span><span>Member since ${escapeHtml(joined)}</span>` : ''}
      </p>
      <div class="pf-header__badges">
        <span class="pf-badge">Customer</span>
        ${badge}
      </div>
    </div>
    <div class="pf-header__actions">
      ${state === 'approved'
        ? `<a class="pf-btn pf-btn--ghost" href="../../FrontEnd/SHOP.html?vendor_id=${Number(p.user_id)}">View my shop</a>
           <a class="pf-btn pf-btn--primary" href="../vendor/Inventory.html">Seller dashboard</a>`
        : `<a class="pf-btn pf-btn--ghost" href="../../FrontEnd/MARKETPLACE.html">Back to shopping</a>`}
    </div>
  `;

  document.getElementById('avatarInput').addEventListener('change', uploadAvatar);
}

async function uploadAvatar(e) {

  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1048576) {
    showToast('Photo is too large (max 2 MB).', true);
    return;
  }

  const form = new FormData();
  form.append('avatar', file);

  const edit = document.querySelector('.pf-avatar__edit');
  edit.classList.add('pf-avatar__edit--busy');

  try {
    const response = await fetch('../customer_php/upload_avatar.php', {
      method: 'POST', body: form, credentials: 'same-origin'
    });
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    profileData.profile_picture = result.profile_picture;
    renderHeader();
    refreshSidebarAvatar(result.profile_picture);
    showToast('Profile photo updated.');

  } catch (err) {
    showToast(err.message || 'Could not upload photo.', true);
    edit.classList.remove('pf-avatar__edit--busy');
  }
}

function refreshSidebarAvatar(path) {
  const src = avatarSrc(path);
  document.querySelectorAll('.sidebar__foot-avatar, .topbar__avatar').forEach((el) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.className = el.className.replace(/\S*--placeholder/g, '').trim();
    el.replaceWith(img);
  });
}


/* =========================================================
   PERSONAL INFO
========================================================= */

function fillInfoForm() {

  const form = document.getElementById('infoForm');
  const p = profileData;

  form.first_name.value = p.first_name || '';
  form.last_name.value = p.last_name || '';
  form.email.value = p.email || '';
  form.phone.value = p.phone ? AddressBook.formatPhone(p.phone) : '';
  form.bio.value = p.bio || '';

  const saveBtn = document.getElementById('infoSave');
  const status = document.getElementById('infoStatus');
  const snapshot = () => new URLSearchParams(new FormData(form)).toString();
  let saved = snapshot();

  // Save is only enabled when something changed
  form.oninput = () => {
    const dirty = snapshot() !== saved;
    saveBtn.disabled = !dirty;
    status.textContent = dirty ? 'Unsaved changes' : '';
    status.className = 'pf-status' + (dirty ? ' pf-status--dirty' : '');
  };

  form.onsubmit = async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    if (!data.first_name.trim() || !data.last_name.trim()) {
      return setStatus(status, 'Enter your first and last name.', true);
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      const response = await fetch('../customer_php/update_profile.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message);

      // New email → type the 6-digit code sent to it, then come back here
      if (result.verify_required) {
        showToast(result.message);
        setTimeout(() => {
          window.location.href = '../../register/VerifyEmail.html?next=' +
            encodeURIComponent(location.pathname);
        }, 1200);
        return;
      }

      Object.assign(profileData, data);
      saved = snapshot();
      renderHeader();
      setStatus(status, 'Saved', false, true);
      showToast('Profile saved.');

      document.querySelectorAll('.sidebar__foot-name').forEach((el) => {
        el.textContent = fullName(profileData);
      });

    } catch (err) {
      setStatus(status, err.message || 'Could not save.', true);
      saveBtn.disabled = false;
    } finally {
      saveBtn.textContent = 'Save changes';
    }
  };
}

function setStatus(el, text, isError, isSuccess) {
  el.innerHTML = (isSuccess ? ICONS.check + ' ' : '') + escapeHtml(text);
  el.className = 'pf-status' + (isError ? ' pf-status--error' : '') + (isSuccess ? ' pf-status--ok' : '');
}


/* =========================================================
   STATS
========================================================= */

async function loadStats() {

  const box = document.getElementById('accountStats');

  try {
    const response = await fetch('../customer_php/get_profile_stats.php', { credentials: 'same-origin' });
    const result = await response.json();

    if (!result.success) throw new Error();

    const s = result.stats;

    box.innerHTML = [
      ['Total orders', s.total_orders],
      ['Completed orders', s.completed_orders],
      ['Items in cart', s.cart_items],
      ['Saved addresses', addresses.length],
    ].map(([label, value]) => `
      <div class="pf-stat">
        <span class="pf-stat__label">${label}</span>
        <span class="pf-stat__value" ${label === 'Saved addresses' ? 'id="statAddresses"' : ''}>${Number(value) || 0}</span>
      </div>`).join('');

  } catch (err) {
    box.innerHTML = '<p class="pf-card__desc">Could not load stats.</p>';
  }
}


/* =========================================================
   ADDRESS BOOK
========================================================= */

async function loadAddresses() {

  document.getElementById('addAddressBtn').onclick = async () => {
    const result = await AddressBook.openForm(defaultsForNewAddress());
    if (result) { addresses = result.addresses; renderAddresses(); showToast('Address saved.'); }
  };

  try {
    addresses = await AddressBook.load();
    renderAddresses();
  } catch (err) {
    document.getElementById('addressList').innerHTML =
      `<p class="ab-muted">Could not load addresses. ${escapeHtml(err.message)}</p>`;
  }
}

// New addresses start with the user's own name and number filled in
function defaultsForNewAddress() {
  return profileData
    ? { recipient_name: fullName(profileData), phone: profileData.phone || '', is_default: false }
    : null;
}

function renderAddresses() {

  const list = document.getElementById('addressList');
  const stat = document.getElementById('statAddresses');
  if (stat) stat.textContent = addresses.length;

  if (!addresses.length) {
    list.innerHTML = `
      <div class="pf-empty">
        <p class="pf-empty__title">No saved addresses yet</p>
        <p class="pf-card__desc">Add a delivery address so checkout is faster.</p>
      </div>`;
    return;
  }

  list.innerHTML = addresses.map((a) => `
    <div class="ab-card">
      ${AddressBook.cardHtml(a, {
        actions: `
          <div class="ab-card__actions">
            <button type="button" class="ab-link" data-edit="${a.address_id}">Edit</button>
            ${a.is_default ? '' : `<button type="button" class="ab-link" data-default="${a.address_id}">Set as default</button>`}
            <button type="button" class="ab-link ab-link--danger" data-delete="${a.address_id}">Delete</button>
          </div>`
      })}
    </div>`).join('');

  const find = (id) => addresses.find((a) => a.address_id === Number(id));

  list.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.onclick = async () => {
      const result = await AddressBook.openForm(find(btn.dataset.edit));
      if (result) { addresses = result.addresses; renderAddresses(); showToast('Address updated.'); }
    };
  });

  list.querySelectorAll('[data-default]').forEach((btn) => {
    btn.onclick = () => runAddressAction(btn, () => AddressBook.setDefault(Number(btn.dataset.default)), 'Default address updated.');
  });

  list.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.onclick = () => {
      // Two-step confirm inside the button instead of a popup
      if (btn.dataset.confirming) {
        runAddressAction(btn, () => AddressBook.remove(Number(btn.dataset.delete)), 'Address deleted.');
      } else {
        btn.dataset.confirming = '1';
        btn.textContent = 'Tap again to delete';
        setTimeout(() => {
          if (btn.isConnected) { delete btn.dataset.confirming; btn.textContent = 'Delete'; }
        }, 3000);
      }
    };
  });
}

async function runAddressAction(btn, action, message) {
  btn.disabled = true;
  try {
    addresses = await action();
    renderAddresses();
    showToast(message);
  } catch (err) {
    showToast(err.message, true);
    btn.disabled = false;
  }
}


/* =========================================================
   SECURITY
========================================================= */

function renderLinkedAccounts() {

  const p = profileData;
  const google = Number(p.google_linked) === 1;
  const facebook = Number(p.facebook_linked) === 1;

  const row = (name, linked) => `
    <div class="pf-linked__row">
      <span>${name}</span>
      <span class="pf-badge ${linked ? 'pf-badge--seller' : ''}">${linked ? 'Connected' : 'Not connected'}</span>
    </div>`;

  document.getElementById('linkedAccounts').innerHTML =
    row('Email & password', true) + row('Google', google) + row('Facebook', facebook);

  if (google || facebook) {
    const hint = document.getElementById('socialPasswordHint');
    hint.innerHTML = 'Signed up with Google or Facebook? You don\'t have a password yet — ' +
      '<a href="../../register/ForgotPassword.html" style="color:#2d6a4f;font-weight:600">set one with Forgot password</a>.';
    hint.hidden = false;
  }

  const form = document.getElementById('passwordForm');
  const status = document.getElementById('passwordStatus');
  const btn = document.getElementById('passwordSave');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    if (data.new_password.length < 8) return setStatus(status, 'New password must be at least 8 characters.', true);
    if (data.new_password !== data.confirm_password) return setStatus(status, 'New passwords do not match.', true);

    btn.disabled = true;
    btn.textContent = 'Updating…';

    try {
      const response = await fetch('../customer_php/change_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message);

      form.reset();
      setStatus(status, 'Password changed', false, true);
      showToast('Password changed.');

    } catch (err) {
      setStatus(status, err.message || 'Could not change password.', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update password';
    }
  };

  const logoutBtn = document.getElementById('logoutBtn');

  logoutBtn.onclick = async () => {

    // Two-step confirm inside the button instead of a popup
    if (!logoutBtn.dataset.confirming) {
      logoutBtn.dataset.confirming = '1';
      logoutBtn.textContent = 'Tap again to log out';
      setTimeout(() => {
        delete logoutBtn.dataset.confirming;
        logoutBtn.textContent = 'Log out';
      }, 3000);
      return;
    }

    logoutBtn.disabled = true;
    logoutBtn.textContent = 'Logging out…';

    try {
      const response = await fetch('../../register/logout.php', { method: 'POST', credentials: 'same-origin' });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      CURRENT_USER = null;
      window.location.href = '../../register/Login.html';
    } catch (err) {
      showToast('Logout failed: ' + (err.message || 'try again.'), true);
      logoutBtn.disabled = false;
      logoutBtn.textContent = 'Log out';
    }
  };

  // Delete my account (password + a final confirm)
  const deleteForm = document.getElementById('deleteAccountForm');
  const deleteStatus = document.getElementById('deleteStatus');
  const deleteBtn = document.getElementById('deleteAccountBtn');

  deleteForm.onsubmit = async (e) => {
    e.preventDefault();

    const password = deleteForm.password.value;
    if (!password) return setStatus(deleteStatus, 'Enter your password.', true);
    if (!confirm('Delete your Punlaan account for good? This can\'t be undone.')) return;

    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting…';

    try {
      const response = await fetch('../customer_php/delete_account.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      CURRENT_USER = null;
      alert('Your account was deleted. Thank you for being part of Punlaan.');
      window.location.href = '../../FrontEnd/HOME.html';
    } catch (err) {
      setStatus(deleteStatus, err.message || 'Could not delete your account.', true);
      deleteBtn.disabled = false;
      deleteBtn.textContent = 'Delete my account';
    }
  };
}


/* =========================================================
   SELLING
========================================================= */

function renderSellPanel() {

  const p = profileData;
  const panel = document.getElementById('sellPanel');
  const state = sellerState(p);

  /* ---------- Approved seller: shop details ---------- */

  if (state === 'approved') {
    panel.innerHTML = `
      <div class="pf-grid">
        <form class="pf-card" id="shopForm" novalidate>
          <div class="pf-card__header">
            <h2 class="pf-card__title">Shop details</h2>
            <p class="pf-card__desc">Shown to customers on your shop page.</p>
          </div>
          <div class="pf-card__body">
            <label class="pf-field">
              <span class="pf-label">Shop name</span>
              <input class="pf-input" name="store_name" maxlength="100" required value="${escapeHtml(p.store_name || '')}">
            </label>
            <label class="pf-field">
              <span class="pf-label">Shop description</span>
              <textarea class="pf-textarea" name="store_description" maxlength="1000">${escapeHtml(p.store_description || '')}</textarea>
            </label>
          </div>
          <div class="pf-card__footer">
            <span class="pf-status" id="shopStatus"></span>
            <button type="submit" class="pf-btn pf-btn--primary">Save shop details</button>
          </div>
        </form>
        <div class="pf-card pf-card--accent">
          <div class="pf-card__body pf-seller-links">
            <span class="pf-seller-icon">${ICONS.store}</span>
            <h2 class="pf-card__title">You're a Punlaan seller</h2>
            <p class="pf-card__desc">Manage your products and orders from the seller dashboard.</p>
            <a class="pf-btn pf-btn--primary pf-btn--block" href="../vendor/Inventory.html">Seller dashboard ${ICONS.arrow}</a>
            <a class="pf-btn pf-btn--ghost pf-btn--block" href="../vendor/OrderProcessing.html">Orders to process</a>
            <a class="pf-btn pf-btn--ghost pf-btn--block" href="../../FrontEnd/SHOP.html?vendor_id=${Number(p.user_id)}">View my shop</a>
          </div>
        </div>
      </div>`;

    const form = document.getElementById('shopForm');
    const status = document.getElementById('shopStatus');

    form.onsubmit = async (e) => {
      e.preventDefault();
      const info = document.getElementById('infoForm');
      const payload = Object.assign(Object.fromEntries(new FormData(info)), Object.fromEntries(new FormData(form)));

      try {
        const response = await fetch('../customer_php/update_profile.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        Object.assign(profileData, payload);
        setStatus(status, 'Saved', false, true);
        showToast('Shop details saved.');
      } catch (err) {
        setStatus(status, err.message || 'Could not save.', true);
      }
    };
    return;
  }

  /* ---------- Application under review ---------- */

  if (state === 'pending') {
    const since = p.applied_at
      ? new Date(String(p.applied_at).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';

    panel.innerHTML = `
      <div class="pf-card pf-card--accent">
        <div class="pf-card__body pf-sell-status">
          <span class="pf-seller-icon pf-seller-icon--pending">${ICONS.clock}</span>
          <div>
            <h2 class="pf-card__title">Your seller application is under review</h2>
            <p class="pf-card__desc">
              ${p.store_name ? `Shop name: <strong>${escapeHtml(p.store_name)}</strong>. ` : ''}
              ${since ? `Submitted ${escapeHtml(since)}. ` : ''}
              An admin usually reviews applications within 1–3 business days.
              You can keep shopping in the meantime.
            </p>
            ${Number(p.document_count) === 0 ? `
              <p class="pf-hint">You applied during sign-up without an ID. Uploading one below helps us approve you faster.</p>` : ''}
          </div>
        </div>
      </div>
      ${Number(p.document_count) === 0 ? applicationFormHtml(p, true) : ''}`;

    if (Number(p.document_count) === 0) bindApplicationForm();
    return;
  }

  /* ---------- Not a seller yet (or rejected): application form ---------- */

  panel.innerHTML = `
    ${state === 'rejected' ? `
      <div class="pf-notice pf-notice--error">
        Your previous seller application wasn't approved. Check that your ID is clear and readable, then apply again.
      </div>` : `
      <div class="pf-sell-hero">
        <div>
          <h2 class="pf-sell-hero__title">Sell your plants on Punlaan</h2>
          <p class="pf-sell-hero__text">Open a free shop, reach plant lovers across the Philippines, and manage orders in one place.</p>
          <ul class="pf-sell-hero__steps">
            <li><span>1</span> Fill in your shop details and upload a valid ID</li>
            <li><span>2</span> We review your application (1–3 business days)</li>
            <li><span>3</span> Start listing plants from your seller dashboard</li>
          </ul>
        </div>
        <span class="pf-sell-hero__icon">${ICONS.store}</span>
      </div>`}
    ${applicationFormHtml(p, false)}`;

  bindApplicationForm();
}

function applicationFormHtml(p, uploadOnly) {
  return `
    <form class="pf-card" id="applyForm" novalidate>
      <div class="pf-card__header">
        <h2 class="pf-card__title">${uploadOnly ? 'Complete your application' : 'Seller application'}</h2>
        <p class="pf-card__desc">All fields are required unless marked optional.</p>
      </div>
      <div class="pf-card__body">
        <div class="pf-row">
          <label class="pf-field">
            <span class="pf-label">Shop name</span>
            <input class="pf-input" name="store_name" maxlength="100" required
                   value="${escapeHtml(p.store_name || '')}" placeholder="Maria's Green Haven">
          </label>
          <label class="pf-field">
            <span class="pf-label">Mobile number</span>
            <input class="pf-input" name="phone" type="tel" inputmode="tel" required
                   value="${escapeHtml(p.phone ? AddressBook.formatPhone(p.phone) : '')}" placeholder="0917 123 4567">
          </label>
        </div>
        <label class="pf-field">
          <span class="pf-label">What will you sell?</span>
          <textarea class="pf-textarea" name="store_description" minlength="20" maxlength="1000" required
                    placeholder="e.g. Vegetable seedlings and fruit tree saplings grown in our backyard nursery in Laguna.">${escapeHtml(p.store_description || '')}</textarea>
        </label>
        <div class="pf-row">
          <label class="pf-field pf-file">
            <span class="pf-label">Valid government ID</span>
            <input type="file" name="government_id" accept="image/jpeg,image/png,image/webp,application/pdf" required>
            <span class="pf-hint">Driver's license, passport, UMID, PhilSys ID… JPG, PNG or PDF, max 5 MB.</span>
          </label>
          <label class="pf-field pf-file">
            <span class="pf-label">Business permit <span class="pf-optional">(optional)</span></span>
            <input type="file" name="business_permit" accept="image/jpeg,image/png,image/webp,application/pdf">
            <span class="pf-hint">DTI, Mayor's permit, or BIR registration if you have one.</span>
          </label>
        </div>
        <label class="pf-check">
          <input type="checkbox" name="agree" value="1" required>
          <span>I confirm the details are true and agree to sell only legal plants and garden products.</span>
        </label>
      </div>
      <div class="pf-card__footer">
        <span class="pf-status" id="applyStatus"></span>
        <button type="submit" class="pf-btn pf-btn--primary" id="applySubmit">Submit application</button>
      </div>
    </form>`;
}

function bindApplicationForm() {

  const form = document.getElementById('applyForm');
  const status = document.getElementById('applyStatus');
  const btn = document.getElementById('applySubmit');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const id = form.government_id.files[0];

    if (!data.get('store_name').trim()) return setStatus(status, 'Enter a shop name.', true);
    if (data.get('store_description').trim().length < 20) return setStatus(status, 'Describe what you will sell (at least 20 characters).', true);
    if (!id) return setStatus(status, 'Upload a valid government ID.', true);
    if (id.size > 5 * 1048576) return setStatus(status, 'The ID file is too large (max 5 MB).', true);
    if (!form.agree.checked) return setStatus(status, 'Please confirm the declaration.', true);

    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
      const response = await fetch('../customer_php/apply_vendor.php', {
        method: 'POST', body: data, credentials: 'same-origin'
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message);

      showToast(result.message);
      await loadProfile();

    } catch (err) {
      setStatus(status, err.message || 'Could not submit.', true);
      btn.disabled = false;
      btn.textContent = 'Submit application';
    }
  };
}
