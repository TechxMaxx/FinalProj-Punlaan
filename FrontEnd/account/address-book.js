/* address-book.js — Saved delivery addresses (Profile page + Checkout).
 * Requires third_party/psgc/psgc.js and account/address-book.css.
 *
 *   AddressBook.load()                 → Promise<addresses[]>
 *   AddressBook.openForm(address?)     → Promise<{address_id, addresses} | null>
 *   AddressBook.openPicker(selectedId) → Promise<address | null>
 *   AddressBook.remove(id) / AddressBook.setDefault(id) → Promise<addresses[]>
 */

(function () {

  // Folder this script lives in, so addresses.php resolves from any page
  const BASE = document.currentScript.src.replace(/[^/]*$/, '');
  const API = BASE + 'addresses.php';

  const LABELS = ['Home', 'Work', 'Other'];


  /* ============ HELPERS ============ */

  function esc(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  async function request(body) {
    const response = await fetch(API, body
      ? {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      : { credentials: 'include', cache: 'no-store' });

    const result = await response.json();

    if (result.logged_in === false) {
      throw new Error('Please log in again.');
    }
    if (!result.success) {
      throw new Error(result.message || 'Something went wrong.');
    }
    return result;
  }

  /* ============ MAP PIN HELPERS ============ */

  const MANILA = { lat: 14.5995, lng: 120.9842 };

  // Leaflet (open-source map library) is loaded only when a map is opened
  let leafletPromise = null;

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (!leafletPromise) {
      leafletPromise = new Promise(function (resolve, reject) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(css);

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        script.onload = resolve;
        script.onerror = function () {
          leafletPromise = null;
          reject(new Error('Could not load the map. Check your internet connection.'));
        };
        document.head.appendChild(script);
      });
    }
    return leafletPromise;
  }

  // Green pin drawn in SVG (no image files needed)
  let PIN_ICON = null;

  function pinIcon() {
    if (!PIN_ICON) {
      PIN_ICON = L.divIcon({
        className: 'ab-map-pin',
        html: '<svg width="34" height="44" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0z" fill="#2d6a4f"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>',
        iconSize: [34, 44],
        iconAnchor: [17, 44]
      });
    }
    return PIN_ICON;
  }

  // Place names for a point, from OpenStreetMap (Nominatim, free)
  async function reverseGeocode(point) {
    const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18' +
      '&accept-language=en&lat=' + point.lat + '&lon=' + point.lng;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.address ? data.address : null;
  }

  // Map point for a place name, e.g. "Poblacion, Calamba, Laguna, Philippines"
  async function forwardGeocode(parts) {
    const q = parts.filter(Boolean).concat('Philippines').join(', ');
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph' +
      '&accept-language=en&q=' + encodeURIComponent(q);
    try {
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) return null;
      const data = await response.json();
      return data && data[0] ? { lat: Number(data[0].lat), lng: Number(data[0].lon) } : null;
    } catch (err) {
      return null;
    }
  }

  // Straight-line distance in km between two points
  function distanceKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  // "City of Calamba" / "Calamba City" / "Calamba" → "calamba"
  function normalizeName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\b(city of|municipality of|province of|city|municipality|barangay|brgy)\b\.?/g, ' ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function bestMatch(list, candidates) {
    const names = candidates.map(normalizeName).filter(Boolean);
    if (!names.length) return null;

    for (const n of names) {
      const exact = list.find(function (i) { return normalizeName(i.name) === n; });
      if (exact) return exact;
    }
    for (const n of names) {
      const partial = list.find(function (i) {
        const m = normalizeName(i.name);
        return m && (m.includes(n) || n.includes(m));
      });
      if (partial) return partial;
    }
    return null;
  }

  function matchRegion(regions, place) {
    const text = normalizeName([place.region, place.state].join(' '));
    if (/metro manila|national capital|\bncr\b/.test(text)) {
      return regions.find(function (r) { return PSGC.isNCR(r.code); }) || null;
    }
    return bestMatch(regions, [place.region, place.state]);
  }


  function formatPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '').replace(/^63/, '0');
    return digits.length === 11
      ? digits.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
      : phone;
  }


  /* ============ MODAL SHELL ============ */

  function openModal(title, bodyHtml, footerHtml) {

    const overlay = document.createElement('div');
    overlay.className = 'ab-overlay';
    overlay.innerHTML = `
      <div class="ab-modal" role="dialog" aria-modal="true" aria-labelledby="abTitle">
        <div class="ab-modal__header">
          <h2 class="ab-modal__title" id="abTitle">${esc(title)}</h2>
          <button type="button" class="ab-icon-btn" data-ab-close aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="ab-modal__body">${bodyHtml}</div>
        <div class="ab-modal__footer">${footerHtml}</div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('ab-no-scroll');

    const previousFocus = document.activeElement;

    let onClose = null;

    function close(value) {
      overlay.remove();
      document.body.classList.remove('ab-no-scroll');
      document.removeEventListener('keydown', onKey);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      if (onClose) onClose(value);
    }

    function onKey(e) {
      if (e.key === 'Escape') close(null);
    }

    document.addEventListener('keydown', onKey);

    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) close(null);
    });

    overlay.querySelectorAll('[data-ab-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { close(null); });
    });

    return {
      el: overlay.querySelector('.ab-modal'),
      close: close,
      onClose: function (fn) { onClose = fn; }
    };
  }

  function showError(modal, message) {
    const box = modal.el.querySelector('.ab-error');
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
    if (message) box.scrollIntoView({ block: 'nearest' });
  }


  /* ============ ADDRESS FORM ============ */

  function openForm(address) {

    const a = address || {};
    const isEdit = !!a.address_id;
    const label = a.label || 'Home';
    const labelIsCustom = label && !LABELS.includes(label);

    const modal = openModal(
      isEdit ? 'Edit address' : 'New address',
      `
        <form class="ab-form" novalidate>
          <div class="ab-error" role="alert" hidden></div>

          ${isEdit && !a.city_code ? `
            <p class="ab-note">This address was saved before the address picker existed.
            Please choose your region, city, and barangay below.</p>` : ''}

          <div class="ab-row">
            <label class="ab-field">
              <span class="ab-label">Full name</span>
              <input class="ab-input" name="recipient_name" autocomplete="name"
                     value="${esc(a.recipient_name)}" placeholder="Juan Dela Cruz" required>
            </label>
            <label class="ab-field">
              <span class="ab-label">Mobile number</span>
              <input class="ab-input" name="phone" type="tel" inputmode="tel" autocomplete="tel"
                     value="${esc(a.phone)}" placeholder="0917 123 4567" required>
            </label>
          </div>

          <div class="ab-row">
            <label class="ab-field">
              <span class="ab-label">Region</span>
              <select class="ab-input" name="region" required><option value="">Loading…</option></select>
            </label>
            <label class="ab-field" data-province-field>
              <span class="ab-label">Province</span>
              <select class="ab-input" name="province" disabled><option value="">Select region first</option></select>
            </label>
          </div>

          <div class="ab-row">
            <label class="ab-field">
              <span class="ab-label">City / Municipality</span>
              <select class="ab-input" name="city" disabled required><option value="">Select province first</option></select>
            </label>
            <label class="ab-field">
              <span class="ab-label">Barangay</span>
              <select class="ab-input" name="barangay" disabled required><option value="">Select city first</option></select>
            </label>
          </div>

          <div class="ab-row ab-row--street">
            <label class="ab-field">
              <span class="ab-label">House no., building, street</span>
              <input class="ab-input" name="street" autocomplete="street-address"
                     value="${esc(a.street)}" placeholder="Blk 1 Lot 2, Mabini St." required>
            </label>
            <label class="ab-field">
              <span class="ab-label">Postal code <span class="ab-optional">(optional)</span></span>
              <input class="ab-input" name="postal_code" inputmode="numeric" maxlength="4"
                     autocomplete="postal-code" value="${esc(a.postal_code)}" placeholder="1105">
            </label>
          </div>

          <div class="ab-pin">
            <div class="ab-pin__head">
              <span class="ab-label">Exact location <span class="ab-optional">(optional — helps the rider find you)</span></span>
              <div class="ab-pin__actions">
                <button type="button" class="ab-pin__btn" data-ab-locate>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
                  Use my current location
                </button>
                <button type="button" class="ab-pin__btn ab-pin__btn--ghost" data-ab-pin-manual>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span data-ab-pin-manual-text>Pin on map</span>
                </button>
              </div>
            </div>
            <div class="ab-pin__map" data-ab-map hidden></div>
            <p class="ab-pin__status" data-ab-pin-status hidden></p>
          </div>

          <fieldset class="ab-field ab-labels">
            <legend class="ab-label">Label as</legend>
            <div class="ab-chips">
              ${LABELS.map(function (l) {
                const checked = l === label || (l === 'Other' && labelIsCustom);
                return `<label class="ab-chip"><input type="radio" name="label" value="${l}" ${checked ? 'checked' : ''}><span>${l}</span></label>`;
              }).join('')}
            </div>
          </fieldset>

          <label class="ab-check">
            <input type="checkbox" name="is_default" ${a.is_default ? 'checked disabled' : ''}>
            <span>${a.is_default ? 'This is your default address' : 'Set as default address'}</span>
          </label>
        </form>`,
      `
        <button type="button" class="ab-btn ab-btn--ghost" data-ab-close>Cancel</button>
        <button type="button" class="ab-btn ab-btn--primary" data-ab-save>Save address</button>`
    );

    const form = modal.el.querySelector('form');
    const $ = function (name) { return form.elements[name]; };
    const provinceField = modal.el.querySelector('[data-province-field]');
    const saveBtn = modal.el.querySelector('[data-ab-save]');


    /* ----- dropdown helpers ----- */

    function fill(select, items, placeholder, selectedCode) {
      select.innerHTML = `<option value="">${esc(placeholder)}</option>` +
        items.map(function (i) {
          return `<option value="${i.code}" ${i.code === selectedCode ? 'selected' : ''}>${esc(i.name)}</option>`;
        }).join('');
      select.disabled = items.length === 0;
    }

    function reset(select, placeholder) {
      select.innerHTML = `<option value="">${esc(placeholder)}</option>`;
      select.disabled = true;
    }

    function loading(select) {
      select.innerHTML = '<option value="">Loading…</option>';
      select.disabled = true;
    }

    function selectedName(select) {
      const opt = select.options[select.selectedIndex];
      return opt && opt.value ? opt.textContent : '';
    }

    async function guard(fn) {
      try {
        showError(modal, '');
        await fn();
      } catch (err) {
        showError(modal, 'Could not load the address list. Check your internet connection and try again.');
        console.error(err);
      }
    }


    /* ----- cascade: region → province → city → barangay ----- */

    async function onRegion(prefill) {
      const code = $('region').value;
      reset($('city'), PSGC.isNCR(code) ? 'Select city' : 'Select province first');
      reset($('barangay'), 'Select city first');
      provinceField.hidden = PSGC.isNCR(code);

      if (!code) return reset($('province'), 'Select region first');

      if (PSGC.isNCR(code)) {
        reset($('province'), '');
        return onProvince(prefill);
      }

      loading($('province'));
      fill($('province'), await PSGC.provinces(code), 'Select province', prefill && prefill.province_code);
      if (prefill && prefill.province_code) await onProvince(prefill);
    }

    async function onProvince(prefill) {
      const regionCode = $('region').value;
      const provinceCode = $('province').value;
      reset($('barangay'), 'Select city first');

      if (!PSGC.isNCR(regionCode) && !provinceCode) {
        return reset($('city'), 'Select province first');
      }

      loading($('city'));
      fill($('city'), await PSGC.cities(regionCode, provinceCode), 'Select city / municipality', prefill && prefill.city_code);
      if (prefill && prefill.city_code) await onCity(prefill);
    }

    async function onCity(prefill) {
      const code = $('city').value;
      if (!code) return reset($('barangay'), 'Select city first');
      loading($('barangay'));
      fill($('barangay'), await PSGC.barangays(code), 'Select barangay', prefill && prefill.barangay_code);
    }

    $('region').addEventListener('change', function () { guard(function () { return onRegion(); }); });
    $('province').addEventListener('change', function () { guard(function () { return onProvince(); }); });
    $('city').addEventListener('change', function () { guard(function () { return onCity(); }); });

    guard(async function () {
      fill($('region'), await PSGC.regions(), 'Select region', a.region_code);
      if (a.region_code) await onRegion(a);
    });

    setTimeout(function () { $('recipient_name').focus(); }, 0);


    /* ----- map pin (geolocation) ----- */

    const pinEl = {
      map: modal.el.querySelector('[data-ab-map]'),
      status: modal.el.querySelector('[data-ab-pin-status]'),
      locate: modal.el.querySelector('[data-ab-locate]'),
      manual: modal.el.querySelector('[data-ab-pin-manual]'),
      manualText: modal.el.querySelector('[data-ab-pin-manual-text]')
    };

    let pin = (a.geo_lat != null && a.geo_lng != null)
      ? { lat: Number(a.geo_lat), lng: Number(a.geo_lng) }
      : null;

    let map = null;
    let marker = null;

    // Status line under the map, with an optional action button
    function pinStatus(text, kind, action) {
      pinEl.status.textContent = text || '';
      pinEl.status.className = 'ab-pin__status' + (kind ? ' ab-pin__status--' + kind : '');
      pinEl.status.hidden = !text;

      if (text && action) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ab-pin__fix';
        btn.textContent = action.label;
        btn.addEventListener('click', action.run);
        pinEl.status.append(' ', btn);
      }
    }

    function refreshPinUi() {
      pinEl.manualText.textContent = pin ? 'Remove pin' : 'Pin on map';
      if (pin && !pinEl.status.textContent) {
        pinStatus('Pinned at ' + pin.lat.toFixed(5) + ', ' + pin.lng.toFixed(5) + '. Drag the pin to adjust.', 'ok');
      }
    }

    async function showMap(center, zoom) {
      await loadLeaflet();
      pinEl.map.hidden = false;

      if (!map) {
        map = L.map(pinEl.map, { scrollWheelZoom: false }).setView([center.lat, center.lng], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Tap the map to move the pin there
        map.on('click', function (e) { setPin(e.latlng, 'check'); });
      } else {
        map.setView([center.lat, center.lng], zoom);
      }

      setTimeout(function () { map.invalidateSize(); }, 50);
    }

    /*
     * mode:
     *   'fill'  → fill the address from the pin (Use my current location)
     *   'check' → the user moved the pin: fill empty fields, and if the pin
     *             is in a different city/barangay than the address, offer to update it
     *   'quiet' → just show the pin (opening a saved address)
     */
    function setPin(latlng, mode) {
      pin = { lat: latlng.lat, lng: latlng.lng };

      if (!marker) {
        marker = L.marker([pin.lat, pin.lng], { draggable: true, icon: pinIcon(), keyboard: true, title: 'Drag to adjust' }).addTo(map);
        marker.on('dragend', function () { setPin(marker.getLatLng(), 'check'); });
      } else {
        marker.setLatLng([pin.lat, pin.lng]);
      }

      pinStatus('Pinned at ' + pin.lat.toFixed(5) + ', ' + pin.lng.toFixed(5) + '. Drag the pin or tap the map to adjust.', 'ok');
      refreshPinUi();

      if (mode !== 'quiet') lookUpPlace(pin, mode === 'fill');
    }

    function clearPin() {
      pin = null;
      if (marker) { marker.remove(); marker = null; }
      pinEl.map.hidden = true;
      pinStatus('');
      refreshPinUi();
    }

    // Region / province / city / barangay codes that match a place's names
    async function matchPlace(place) {
      const found = { region: null, province: null, city: null, barangay: null };

      const region = matchRegion(await PSGC.regions(), place);
      if (!region) return found;
      found.region = region;

      let provinceCode = '';
      if (!PSGC.isNCR(region.code)) {
        const province = bestMatch(await PSGC.provinces(region.code), [place.province, place.state, place.county]);
        if (!province) return found;
        found.province = province;
        provinceCode = province.code;
      }

      const city = bestMatch(
        await PSGC.cities(region.code, provinceCode),
        [place.city, place.town, place.municipality, place.county]
      );
      if (!city) return found;
      found.city = city;

      found.barangay = bestMatch(
        await PSGC.barangays(city.code),
        [place.quarter, place.suburb, place.village, place.neighbourhood, place.hamlet, place.city_district]
      );

      return found;
    }

    // Select the matched region → province → city → barangay in the form
    async function applyMatch(found) {
      if (!found.region) return 'partial';

      $('region').value = found.region.code;
      await onRegion();

      if (found.province) {
        $('province').value = found.province.code;
        await onProvince();
      } else if (!PSGC.isNCR(found.region.code)) {
        return 'partial';
      }

      if (!found.city) return 'partial';
      $('city').value = found.city.code;
      await onCity();

      if (!found.barangay) return 'partial';
      $('barangay').value = found.barangay.code;

      return 'full';
    }

    function fillStreet(place, overwrite) {
      const street = [place.house_number, place.road].filter(Boolean).join(' ');
      if (street && (overwrite || !$('street').value.trim())) $('street').value = street;
      if (place.postcode && /^\d{4}$/.test(place.postcode) && (overwrite || !$('postal_code').value.trim())) {
        $('postal_code').value = place.postcode;
      }
    }

    // Use the pin's place names for the address
    let lookupTimer = null;

    function lookUpPlace(point, fillAll) {
      clearTimeout(lookupTimer);
      lookupTimer = setTimeout(async function () {
        try {
          const place = await reverseGeocode(point);
          if (!place) return;

          const found = await matchPlace(place);

          // Empty address (or "use my location"): fill it in
          if (fillAll || !$('city').value) {
            fillStreet(place, fillAll);
            const result = await applyMatch(found);
            pinStatus(
              result === 'full'
                ? 'Location pinned and address filled in — please double-check it.'
                : 'Location pinned. We filled in what we could — please choose the rest from the lists.',
              result === 'full' ? 'ok' : 'warn'
            );
            return;
          }

          fillStreet(place, false);

          // Address already filled: does the pin agree with it?
          const cityDiffers = found.city && found.city.code !== $('city').value;
          const barangayDiffers = !cityDiffers && found.barangay && $('barangay').value && found.barangay.code !== $('barangay').value;

          if (cityDiffers || barangayDiffers) {
            const where = [found.barangay && found.barangay.name, found.city && found.city.name].filter(Boolean).join(', ');
            pinStatus(
              'The pin is in ' + where + ', but the address says ' +
              [selectedName($('barangay')), selectedName($('city'))].filter(Boolean).join(', ') + '.',
              'warn',
              {
                label: 'Update address to match the pin',
                run: async function () {
                  fillStreet(place, true);
                  const result = await applyMatch(found);
                  pinStatus(result === 'full'
                    ? 'Address updated to match the pin — please double-check it.'
                    : 'Address partly updated — please choose the rest from the lists.', result === 'full' ? 'ok' : 'warn');
                }
              }
            );
          }
        } catch (err) {
          console.warn('Address lookup failed:', err);
        }
      }, 600);
    }

    // The place chosen in the lists, as a map point (for centring the map)
    function chosenPlaceParts() {
      return [selectedName($('barangay')), selectedName($('city')), selectedName($('province'))];
    }

    async function chosenPlacePoint() {
      const parts = chosenPlaceParts();
      if (!parts[0] && !parts[1]) return null;
      return (await forwardGeocode(parts)) || (parts[0] ? await forwardGeocode(parts.slice(1)) : null);
    }

    // City / barangay changed in the lists → move the map there, and warn
    // if the pin is now far from the chosen place
    let syncTimer = null;

    function syncMapToAddress() {
      if (!map || pinEl.map.hidden) return;

      clearTimeout(syncTimer);
      syncTimer = setTimeout(async function () {
        const point = await chosenPlacePoint();
        if (!point) return;

        if (!pin) {
          map.setView([point.lat, point.lng], $('barangay').value ? 16 : 13);
          pinStatus('Tap the map where the delivery should go.');
          return;
        }

        if (distanceKm(pin, point) > 3) {
          map.setView([point.lat, point.lng], 15);
          pinStatus(
            'Your pin is far from ' + chosenPlaceParts().filter(Boolean).slice(0, 2).join(', ') + '.',
            'warn',
            {
              label: 'Move the pin here',
              run: function () { setPin(map.getCenter(), 'quiet'); pinStatus('Pin moved. Drag it to your exact spot.', 'ok'); }
            }
          );
        }
      }, 400);
    }

    $('city').addEventListener('change', syncMapToAddress);
    $('barangay').addEventListener('change', syncMapToAddress);

    pinEl.locate.addEventListener('click', function () {

      if (!navigator.geolocation) {
        return pinStatus('Your browser can\'t share your location. Use "Pin on map" instead.', 'error');
      }

      pinEl.locate.disabled = true;
      pinStatus('Finding your location…');

      navigator.geolocation.getCurrentPosition(
        async function (pos) {
          pinEl.locate.disabled = false;
          try {
            const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            await showMap(here, 17);
            setPin(here, 'fill');
            if (pos.coords.accuracy > 200) {
              pinStatus('Location found, but it\'s approximate (±' + Math.round(pos.coords.accuracy) + ' m). Drag the pin to your exact spot.', 'warn');
            }
          } catch (err) {
            pinStatus(err.message, 'error');
          }
        },
        function (err) {
          pinEl.locate.disabled = false;
          pinStatus({
            1: 'Location permission was denied. Allow it in your browser, or use "Pin on map".',
            2: 'Your location isn\'t available right now. Try "Pin on map".',
            3: 'Finding your location took too long. Try again or use "Pin on map".'
          }[err.code] || 'Could not get your location.', 'error');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });

    pinEl.manual.addEventListener('click', async function () {
      if (pin && !pinEl.map.hidden) return clearPin();
      try {
        if (pin) {
          await showMap(pin, 17);
          setPin(pin, 'quiet');
          return;
        }

        // Start the map at the barangay / city already chosen (not always Manila)
        pinStatus('Opening the map…');
        const point = await chosenPlacePoint();
        await showMap(point || MANILA, point ? ($('barangay').value ? 16 : 13) : 12);
        pinStatus('Tap the map where the delivery should go.');
      } catch (err) {
        pinStatus(err.message, 'error');
      }
    });
    // Editing an address that already has a pin: show it
    if (pin) {
      showMap(pin, 17).then(function () { setPin(pin, 'quiet'); }).catch(function () {});
    }
    refreshPinUi();


    /* ----- save ----- */

    return new Promise(function (resolve) {

      modal.onClose(resolve);

      async function save() {

        const regionCode = $('region').value;

        const payload = {
          address_id: a.address_id || 0,
          recipient_name: $('recipient_name').value,
          phone: $('phone').value,
          region_code: regionCode,
          region: selectedName($('region')),
          province_code: PSGC.isNCR(regionCode) ? '' : $('province').value,
          province: PSGC.isNCR(regionCode) ? '' : selectedName($('province')),
          city_code: $('city').value,
          city: selectedName($('city')),
          barangay_code: $('barangay').value,
          barangay: selectedName($('barangay')),
          street: $('street').value,
          postal_code: $('postal_code').value,
          label: (form.querySelector('input[name="label"]:checked') || {}).value || 'Home',
          is_default: $('is_default').checked,
          geo_lat: pin ? pin.lat : null,
          geo_lng: pin ? pin.lng : null
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';

        try {
          const result = await request({ action: 'save', address: payload });
          modal.close({ address_id: result.address_id, addresses: result.addresses });
        } catch (err) {
          showError(modal, err.message);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save address';
        }
      }

      saveBtn.addEventListener('click', save);
      form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
    });
  }


  /* ============ ADDRESS CARD (shared markup) ============ */

  function cardHtml(a, options) {
    options = options || {};
    return `
      <div class="ab-card__main">
        <div class="ab-card__top">
          <span class="ab-card__name">${esc(a.recipient_name)}</span>
          <span class="ab-card__phone">${esc(formatPhone(a.phone))}</span>
        </div>
        <p class="ab-card__address">${esc(a.full_address)}</p>
        <div class="ab-card__tags">
          <span class="ab-tag">${esc(a.label)}</span>
          ${a.is_default ? '<span class="ab-tag ab-tag--default">Default</span>' : ''}
          ${!a.city_code ? '<span class="ab-tag ab-tag--warn">Needs update</span>' : ''}
          ${a.geo_lat != null ? '<span class="ab-tag ab-tag--pin">📍 Pinned on map</span>' : ''}
        </div>
      </div>
      ${options.actions || ''}`;
  }


  /* ============ PICKER (checkout) ============ */

  function openPicker(selectedId) {

    const modal = openModal(
      'Choose delivery address',
      `<div class="ab-error" role="alert" hidden></div>
       <div class="ab-list" data-ab-list><p class="ab-muted">Loading addresses…</p></div>
       <button type="button" class="ab-add" data-ab-add>
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
         Add new address
       </button>`,
      `<button type="button" class="ab-btn ab-btn--ghost" data-ab-close>Cancel</button>
       <button type="button" class="ab-btn ab-btn--primary" data-ab-confirm>Deliver here</button>`
    );

    const listEl = modal.el.querySelector('[data-ab-list]');
    let addresses = [];

    function render() {

      if (!addresses.length) {
        listEl.innerHTML = '<p class="ab-muted">You have no saved addresses yet. Add one to continue.</p>';
        return;
      }

      if (!addresses.some(function (a) { return a.address_id === selectedId; })) {
        selectedId = addresses[0].address_id;
      }

      listEl.innerHTML = addresses.map(function (a) {
        return `
          <label class="ab-card ab-card--selectable">
            <input type="radio" name="ab-pick" value="${a.address_id}" ${a.address_id === selectedId ? 'checked' : ''}>
            ${cardHtml(a, {
              actions: `<button type="button" class="ab-link" data-ab-edit="${a.address_id}">Edit</button>`
            })}
          </label>`;
      }).join('');

      listEl.querySelectorAll('input[name="ab-pick"]').forEach(function (radio) {
        radio.addEventListener('change', function () { selectedId = Number(radio.value); });
      });

      listEl.querySelectorAll('[data-ab-edit]').forEach(function (btn) {
        btn.addEventListener('click', async function (e) {
          e.preventDefault();
          const current = addresses.find(function (a) { return a.address_id === Number(btn.dataset.abEdit); });
          const result = await openForm(current);
          if (result) { addresses = result.addresses; render(); }
        });
      });
    }

    load()
      .then(function (list) { addresses = list; render(); })
      .catch(function (err) { showError(modal, err.message); listEl.innerHTML = ''; });

    modal.el.querySelector('[data-ab-add]').addEventListener('click', async function () {
      const result = await openForm(null);
      if (result) {
        addresses = result.addresses;
        selectedId = result.address_id;
        render();
      }
    });

    return new Promise(function (resolve) {
      modal.onClose(resolve);
      modal.el.querySelector('[data-ab-confirm]').addEventListener('click', function () {
        const chosen = addresses.find(function (a) { return a.address_id === selectedId; });
        if (!chosen) return showError(modal, 'Add an address first.');
        if (!chosen.city_code) return showError(modal, 'Please update this address (tap Edit) before using it.');
        modal.close(chosen);
      });
    });
  }


  /* ============ DATA ============ */

  async function load() {
    return (await request()).addresses;
  }

  async function remove(id) {
    return (await request({ action: 'delete', address_id: id })).addresses;
  }

  async function setDefault(id) {
    return (await request({ action: 'set_default', address_id: id })).addresses;
  }


  window.AddressBook = {
    load: load,
    openForm: openForm,
    openPicker: openPicker,
    remove: remove,
    setDefault: setDefault,
    cardHtml: cardHtml,
    formatPhone: formatPhone
  };

})();
