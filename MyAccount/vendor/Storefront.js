/* =========================================================
   STOREFRONT (seller)
   What customers see on the public shop page (FrontEnd/SHOP.html):
   store name, about, logo (= profile photo), cover photo and links.
   Saved in the database by ../vendor_php/storefront.php.
========================================================= */

const API = '../vendor_php/storefront.php';
const MAX_LINKS = 6;

let store = null;
let links = [];

// Shop location being edited: {region_code, region, province_code, province, city_code, city, lat, lng}
let loc = null;

document.addEventListener('DOMContentLoaded', async () => {

  // Load the logged-in user first so the sidebar shows the Vendor menu
  const user = await getCurrentUser();

  if (!user) {
    window.location.replace('../../register/Login.html');
    return;
  }

  document.getElementById('app').innerHTML = renderLayout('storefront');

  if (Number(user.is_vendor) !== 1) {
    document.getElementById('pageContent').innerHTML = `
      <div class="empty-state">
        Only sellers have a storefront. You can apply in
        <a href="../customer/Profile.html#sell">Profile → Selling</a>.
      </div>`;
    return;
  }

  document.getElementById('pageContent').innerHTML =
    '<div class="loading">Loading your storefront…</div>';

  loadStore();
});


/* ---------- helpers ---------- */

function asset(path) {
  if (!path) return '';
  return /^https?:\/\//i.test(path) ? path : '../../' + path;
}

function shopUrl() {
  return '../../FrontEnd/SHOP.html?vendor_id=' + encodeURIComponent(store.vendor_id);
}

async function postForm(data) {
  const response = await fetch(API, { method: 'POST', credentials: 'same-origin', body: data });
  return response.json();
}


/* ---------- load ---------- */

async function loadStore() {
  try {
    const response = await fetch(API, { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Could not load your storefront.');

    store = result.store;
    links = store.links.length ? [...store.links] : [''];
    loc = { ...store.location };

    document.getElementById('pageContent').innerHTML = pageHtml();
    attachEvents();
    renderLinks();
    updatePreview();

    if (location.hash === '#location') {
      document.getElementById('location')?.scrollIntoView();
    }
  } catch (error) {
    document.getElementById('pageContent').innerHTML =
      `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}


/* ---------- page ---------- */

function pageHtml() {
  const logo = asset(store.profile_picture);
  const banner = asset(store.store_banner);

  return `
    <div class="vstorefront">
      <div class="vstorefront__header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div>
          <h1 class="vstorefront__title">Storefront</h1>
          <p class="vstorefront__subtitle">This is how customers see your shop on Punlaan.</p>
        </div>
        <a class="btn btn--primary" href="${shopUrl()}" target="_blank" rel="noopener"
           ${store.approved ? '' : 'aria-disabled="true" style="pointer-events:none;opacity:.5"'}>
          <i class="fa-solid fa-arrow-up-right-from-square"></i>&nbsp; View live store
        </a>
      </div>

      ${store.approved ? '' : `
        <div class="empty-state" style="margin-bottom:16px;text-align:left">
          Your seller application is still under review. You can set up your storefront now —
          it becomes visible to customers once you're approved.
        </div>`}

      <div class="vstorefront__card">
        <div class="vstorefront__card-header">
          <h2 class="vstorefront__card-title">Store identity</h2>
          <p class="vstorefront__card-desc">Your shop logo is your profile photo. The cover photo appears at the top of your shop page.</p>
        </div>
        <div class="vstorefront__card-body">
          <div class="vstorefront__media-row">
            <div class="vstorefront__logo-box">
              <label class="vstorefront__logo-circle" id="logoCircle" title="Change shop logo">
                ${logo ? `<img src="${escapeHtml(logo)}" alt="Shop logo">` : '<div class="vstorefront__logo-placeholder"><span>Logo</span></div>'}
                <input type="file" accept="image/jpeg,image/png,image/webp" id="logoInput" style="display:none" />
              </label>
              <button type="button" class="btn btn--ghost" onclick="document.getElementById('logoInput').click()">Change logo</button>
            </div>
            <div class="vstorefront__banner-box" style="flex:1;min-width:0">
              <label class="vstorefront__banner-rect" id="bannerRect" title="Change cover photo">
                ${banner ? `<img src="${escapeHtml(banner)}" alt="Cover photo">` : '<div class="vstorefront__banner-placeholder"><span>Upload a cover photo (wide image, e.g. 1200×400)</span></div>'}
                <input type="file" accept="image/jpeg,image/png,image/webp" id="bannerInput" style="display:none" />
              </label>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
                <span class="vstorefront__upload-text">JPG, PNG or WEBP, up to 3 MB.</span>
                ${banner ? '<button type="button" class="btn btn--ghost" id="removeBanner">Remove cover</button>' : ''}
              </div>
            </div>
          </div>

          <form id="storeForm" novalidate>
            <div class="vstorefront__row" style="margin-top:22px;">
              <div class="vstorefront__field" style="flex:none;width:100%;">
                <label class="vstorefront__label" for="storeName">Store name <span class="vstorefront__label-req">*</span></label>
                <input class="vstorefront__input" id="storeName" maxlength="100" required
                       value="${escapeHtml(store.store_name)}" placeholder="e.g. Maria's Green Haven" />
                <span class="vstorefront__char-count" id="storeNameCount"></span>
              </div>
            </div>

            <div class="vstorefront__row" style="margin-top:14px;">
              <div class="vstorefront__field" style="flex:none;width:100%;">
                <label class="vstorefront__label" for="description">About your store</label>
                <textarea class="vstorefront__textarea" id="description" maxlength="1000"
                          placeholder="Tell customers about your nursery, what you grow, and how you care for your plants…">${escapeHtml(store.store_description)}</textarea>
                <div style="display:flex;justify-content:space-between;">
                  <span class="vstorefront__hint">Shown on your shop page.</span>
                  <span class="vstorefront__char-count" id="descriptionCount"></span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div class="vstorefront__card" id="location">
        <div class="vstorefront__card-header">
          <h2 class="vstorefront__card-title">Shop location</h2>
          <p class="vstorefront__card-desc">
            Where your plants ship from. Buyers only see your city (e.g. “Quezon City” or “Imus, Cavite”),
            never your street or barangay. Shipping fees depend on the item sizes and how far the buyer is from here.
          </p>
        </div>
        <div class="vstorefront__card-body">
          ${!store.location.saved && store.location.city ? `
            <p class="vstorefront__hint vstorefront__hint--note">
              Filled in from your address — press <strong>Save storefront</strong> to use it, or pick another city.
            </p>` : ''}
          ${!store.location.saved && !store.location.city ? `
            <p class="vstorefront__hint vstorefront__hint--warn">
              Not set yet — shipping fees for your products are only estimates until you choose your city.
            </p>` : ''}
          <div class="vstorefront__loc-grid">
            <div class="vstorefront__field">
              <label class="vstorefront__label" for="locRegion">Region</label>
              <select class="vstorefront__input" id="locRegion"><option value="">Loading…</option></select>
            </div>
            <div class="vstorefront__field" id="locProvinceWrap">
              <label class="vstorefront__label" for="locProvince">Province</label>
              <select class="vstorefront__input" id="locProvince" disabled><option value="">Choose a region first</option></select>
            </div>
            <div class="vstorefront__field">
              <label class="vstorefront__label" for="locCity">City / Municipality</label>
              <select class="vstorefront__input" id="locCity" disabled><option value="">—</option></select>
            </div>
          </div>
          <p class="vstorefront__loc-status" id="locStatus"></p>
        </div>
      </div>

      <div class="vstorefront__card" id="freeShipping">
        <div class="vstorefront__card-header">
          <h2 class="vstorefront__card-title">Free shipping offer</h2>
          <p class="vstorefront__card-desc">
            Optional. When a buyer's items from your shop reach this amount, their shipping is free —
            you cover the courier cost. Buyers see "Add ₱… more for free shipping" at checkout,
            so they often buy more from you.
          </p>
        </div>
        <div class="vstorefront__card-body">
          <div class="vstorefront__field" style="max-width:260px">
            <label class="vstorefront__label" for="freeShipMin">Free shipping on orders from (₱)</label>
            <input class="vstorefront__input" id="freeShipMin" type="number" min="0" step="1" inputmode="numeric"
                   placeholder="e.g. 500 — leave blank for no offer" value="${store.free_ship_min != null ? escapeHtml(String(Math.round(store.free_ship_min))) : ''}" />
          </div>
          <p class="vstorefront__hint" style="margin-top:8px">Leave it blank to turn the offer off.</p>
        </div>
      </div>

      <div class="vstorefront__card">
        <div class="vstorefront__card-header">
          <h2 class="vstorefront__card-title">Social media &amp; website</h2>
          <p class="vstorefront__card-desc">Paste a link — Facebook, Instagram, TikTok, Shopee, your website… The right logo appears automatically.</p>
        </div>
        <div class="vstorefront__card-body">
          <div id="linkRows"></div>
          <button type="button" class="btn btn--ghost" id="addLink"><i class="fa-solid fa-plus"></i>&nbsp; Add a link</button>
          <p class="vstorefront__hint" style="margin-top:8px">Up to ${MAX_LINKS} links.</p>
        </div>
      </div>

      <div class="vstorefront__card">
        <div class="vstorefront__card-header">
          <h2 class="vstorefront__card-title">Preview</h2>
          <p class="vstorefront__card-desc">
            ${store.products_live} of ${store.products_total} product(s) are live in the Marketplace.
          </p>
        </div>
        <div class="vstorefront__card-body">
          <div class="vstorefront__preview" id="preview"></div>
        </div>
      </div>

      <div class="vstorefront__footer" style="display:flex;justify-content:flex-end;gap:10px">
        <a class="btn btn--ghost" href="${shopUrl()}" target="_blank" rel="noopener"
           ${store.approved ? '' : 'style="display:none"'}>View live store</a>
        <button type="button" class="btn btn--primary" id="saveStore">Save storefront</button>
      </div>
    </div>
  `;
}


/* ---------- links ---------- */

function renderLinks() {
  const box = document.getElementById('linkRows');

  box.innerHTML = links.map((link, i) => {
    const info = window.punlaanLinkInfo(link);
    return `
      <div class="vstorefront__social-row">
        <span class="vstorefront__social-icon" style="background:${info ? info.color : '#c4dfc9'}" title="${info ? escapeHtml(info.label) : 'Link'}">
          <i class="${info ? info.icon : 'fa-solid fa-link'}"></i>
        </span>
        <input class="vstorefront__social-input" data-link="${i}" type="url" inputmode="url"
               value="${escapeHtml(link)}" placeholder="https://facebook.com/yourshop" aria-label="Link ${i + 1}" />
        <button type="button" class="btn btn--ghost" data-remove-link="${i}" aria-label="Remove link ${i + 1}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  }).join('') || '<p class="vstorefront__hint">No links yet.</p>';

  box.querySelectorAll('[data-link]').forEach((input) => {
    input.addEventListener('input', () => {
      links[Number(input.dataset.link)] = input.value;
      // Update only the icon so typing isn't interrupted
      const info = window.punlaanLinkInfo(input.value);
      const icon = input.previousElementSibling;
      icon.style.background = info ? info.color : '#c4dfc9';
      icon.title = info ? info.label : 'Link';
      icon.innerHTML = `<i class="${info ? info.icon : 'fa-solid fa-link'}"></i>`;
      updatePreview();
    });
  });

  box.querySelectorAll('[data-remove-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      links.splice(Number(btn.dataset.removeLink), 1);
      renderLinks();
      updatePreview();
    });
  });

  document.getElementById('addLink').disabled = links.length >= MAX_LINKS;
}


/* ---------- preview ---------- */

function updatePreview() {
  const name = document.getElementById('storeName').value.trim() || 'Your store name';
  const about = document.getElementById('description').value.trim();
  const logo = asset(store.profile_picture);
  const banner = asset(store.store_banner);

  document.getElementById('storeNameCount').textContent = `${document.getElementById('storeName').value.length}/100`;
  document.getElementById('descriptionCount').textContent = `${document.getElementById('description').value.length}/1000`;

  const icons = links
    .map((l) => window.punlaanLinkInfo(l))
    .filter(Boolean)
    .map((info) => `<span title="${escapeHtml(info.label)}" style="display:inline-flex;width:32px;height:32px;border-radius:50%;background:${info.color};color:#fff;align-items:center;justify-content:center"><i class="${info.icon}"></i></span>`)
    .join('');

  document.getElementById('preview').innerHTML = `
    <div class="vstorefront__preview-banner" style="background:${banner ? '#e8f0e4' : 'linear-gradient(135deg,#1b4332,#52b788)'}">
      ${banner ? `<img src="${escapeHtml(banner)}" alt="">` : ''}
    </div>
    <div class="vstorefront__preview-body">
      <div class="vstorefront__preview-logo">
        ${logo ? `<img src="${escapeHtml(logo)}" alt="">` : '<span class="vstorefront__preview-logo-placeholder"><i class="fa-solid fa-store"></i></span>'}
      </div>
      <div class="vstorefront__preview-name">${escapeHtml(name)}</div>
      ${store.approved ? '<div class="vstorefront__preview-badges"><span class="vstorefront__preview-badge vstorefront__preview-badge--verified">Verified seller</span></div>' : ''}
      <p class="vstorefront__preview-desc" style="white-space:pre-line">${escapeHtml(about || 'Tell customers about your store.')}</p>
      ${icons ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${icons}</div>` : ''}
    </div>
  `;
}


/* ---------- events ---------- */

function attachEvents() {

  initLocation();

  document.getElementById('storeName').addEventListener('input', updatePreview);
  document.getElementById('description').addEventListener('input', updatePreview);

  document.getElementById('addLink').addEventListener('click', () => {
    if (links.length >= MAX_LINKS) return;
    links.push('');
    renderLinks();
    document.querySelector(`[data-link="${links.length - 1}"]`)?.focus();
  });

  document.getElementById('saveStore').addEventListener('click', saveStore);
  document.getElementById('storeForm').addEventListener('submit', (e) => { e.preventDefault(); saveStore(); });

  // Logo = profile photo
  document.getElementById('logoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('avatar', file);
    try {
      const response = await fetch('../customer_php/upload_avatar.php', { method: 'POST', credentials: 'same-origin', body: data });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      store.profile_picture = result.profile_picture;
      showToast('Shop logo updated.');
      refreshMedia();
    } catch (error) {
      showToast(error.message || 'Could not upload the logo.', true);
    }
  });

  document.getElementById('bannerInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('action', 'banner');
    data.append('banner', file);
    try {
      const result = await postForm(data);
      if (!result.success) throw new Error(result.message);
      store.store_banner = result.store_banner;
      showToast('Cover photo updated.');
      refreshMedia();
    } catch (error) {
      showToast(error.message || 'Could not upload the cover photo.', true);
    }
  });

  document.getElementById('removeBanner')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    // Ask for a second click instead of a browser pop-up
    if (btn.dataset.confirm !== '1') {
      btn.dataset.confirm = '1';
      btn.textContent = 'Click again to remove';
      setTimeout(() => { if (btn.isConnected) { btn.dataset.confirm = ''; btn.textContent = 'Remove cover'; } }, 4000);
      return;
    }
    const data = new FormData();
    data.append('action', 'remove_banner');
    const result = await postForm(data);
    if (result.success) {
      store.store_banner = null;
      showToast('Cover photo removed.');
      refreshMedia();
    } else {
      showToast(result.message || 'Could not remove the cover photo.', true);
    }
  });
}

// Re-draw the page after a photo change, keeping what was typed
function refreshMedia() {
  const name = document.getElementById('storeName').value;
  const about = document.getElementById('description').value;
  document.getElementById('pageContent').innerHTML = pageHtml();
  document.getElementById('storeName').value = name;
  document.getElementById('description').value = about;
  attachEvents();
  renderLinks();
  updatePreview();
}


/* ---------- save ---------- */

async function saveStore() {
  const btn = document.getElementById('saveStore');
  const name = document.getElementById('storeName').value.trim();

  if (!name) {
    showToast('Enter your store name.', true);
    document.getElementById('storeName').focus();
    return;
  }

  const bad = links.find((l) => l.trim() && !window.punlaanLinkInfo(l));
  if (bad) {
    showToast('This doesn\'t look like a web link: ' + bad, true);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving…';

  const data = new FormData();
  data.append('action', 'save');
  data.append('store_name', name);
  data.append('store_description', document.getElementById('description').value.trim());
  data.append('links', JSON.stringify(links.map((l) => l.trim()).filter(Boolean)));
  data.append('free_ship_min', document.getElementById('freeShipMin')?.value.trim() || '');

  // Shop location (find the city on the map first if needed)
  if (loc && loc.city_code) {
    if (loc.lat == null) await geocodeCity();
    data.append('location', JSON.stringify(loc));
  }

  try {
    const result = await postForm(data);
    if (!result.success) throw new Error(result.message);
    const wasSaved = store.location.saved;
    store = result.store;
    links = store.links.length ? [...store.links] : [''];
    loc = { ...store.location };
    if (!wasSaved && store.location.saved) {
      // Remove the "filled in from your address" note
      refreshMedia();
    } else {
      renderLinks();
      updatePreview();
      showLocationStatus();
    }
    showToast('Storefront saved. Customers see the changes right away.');
  } catch (error) {
    showToast(error.message || 'Could not save your storefront.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save storefront';
  }
}


/* =========================================================
   SHOP LOCATION — Region → Province → City (PSGC lists),
   then the city's map point from OpenStreetMap (Nominatim)
   so shipping can be worked out by distance.
========================================================= */

function locLabel() {
  if (!loc || !loc.city) return '';
  const city = String(loc.city).replace(/^City of\s+/i, '');
  let second = loc.province || loc.region || '';
  if (!loc.province && /NCR|National Capital/i.test(second)) second = '';   // Metro Manila: city only
  else if (!loc.province) second = second.replace(/^.*[–-]\s*/, '');
  return city + (second ? ', ' + second : '');
}

function fillSelect(select, items, selectedCode, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>` + items.map(i =>
    `<option value="${escapeHtml(i.code)}" ${i.code === selectedCode ? 'selected' : ''}>${escapeHtml(i.name)}</option>`).join('');
  select.disabled = items.length === 0;
}

function selectedName(select) {
  const opt = select.options[select.selectedIndex];
  return opt && opt.value ? opt.textContent : null;
}

async function initLocation() {
  const region = document.getElementById('locRegion');
  const province = document.getElementById('locProvince');
  const city = document.getElementById('locCity');
  if (!region || !window.PSGC) return;

  try {
    fillSelect(region, await PSGC.regions(), loc.region_code, 'Choose a region');

    if (loc.region_code) {
      const ncr = PSGC.isNCR(loc.region_code);
      document.getElementById('locProvinceWrap').hidden = ncr;
      if (!ncr) fillSelect(province, await PSGC.provinces(loc.region_code), loc.province_code, 'Choose a province');
      if (ncr || loc.province_code) fillSelect(city, await PSGC.cities(loc.region_code, loc.province_code), loc.city_code, 'Choose a city');
    }
  } catch (err) {
    document.getElementById('locStatus').textContent = 'Could not load the address lists. Check your internet and refresh.';
    return;
  }

  region.addEventListener('change', async () => {
    const ncr = PSGC.isNCR(region.value);
    loc = { region_code: region.value || null, region: selectedName(region), province_code: null, province: null, city_code: null, city: null, lat: null, lng: null };
    document.getElementById('locProvinceWrap').hidden = ncr;
    fillSelect(province, [], null, 'Choose a region first');
    fillSelect(city, [], null, '—');
    if (!region.value) return showLocationStatus();
    if (ncr) fillSelect(city, await PSGC.cities(region.value, null), null, 'Choose a city');
    else fillSelect(province, await PSGC.provinces(region.value), null, 'Choose a province');
    showLocationStatus();
  });

  province.addEventListener('change', async () => {
    Object.assign(loc, { province_code: province.value || null, province: selectedName(province), city_code: null, city: null, lat: null, lng: null });
    fillSelect(city, province.value ? await PSGC.cities(loc.region_code, province.value) : [], null, 'Choose a city');
    showLocationStatus();
  });

  city.addEventListener('change', async () => {
    Object.assign(loc, { city_code: city.value || null, city: selectedName(city), lat: null, lng: null });
    showLocationStatus();
    if (loc.city_code) {
      await geocodeCity();
      showLocationStatus();
    }
  });

  showLocationStatus();
}

/* The city's map point (only the city — not the seller's street) */
async function geocodeCity() {
  if (!loc || !loc.city) return;
  const city = String(loc.city).replace(/^City of\s+/i, '');
  const area = loc.province || (PSGC.isNCR(loc.region_code) ? 'Metro Manila' : String(loc.region || '').replace(/^.*[–-]\s*/, ''));
  const q = `${city}, ${area}, Philippines`;

  try {
    const response = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=' + encodeURIComponent(q), {
      headers: { 'Accept-Language': 'en' }
    });
    const found = (await response.json())[0];
    if (found) {
      loc.lat = Number(found.lat);
      loc.lng = Number(found.lon);
    }
  } catch (err) { /* shipping falls back to an estimate */ }
}

function showLocationStatus() {
  const el = document.getElementById('locStatus');
  if (!el) return;

  if (!loc || !loc.city_code) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <i class="fa-solid fa-location-dot"></i> Buyers see: <strong>${escapeHtml(locLabel())}</strong>
    ${loc.lat != null
      ? '<span class="vstorefront__loc-ok">· found on the map ✓</span>'
      : '<span class="vstorefront__loc-warn">· finding it on the map…</span>'}`;
}
