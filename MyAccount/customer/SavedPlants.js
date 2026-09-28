/* =========================================================
   SAVED PLANTS (wishlist)
   Same layout as My Orders and Profile. Data:
     ../customer_php/get_saved_plants.php
     ../customer_php/remove_saved_plant.php
     ../../FrontEnd/add_to_cart.php
========================================================= */

let plants = [];
let currentFilter = 'all';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in-stock', label: 'In stock' },
  { key: 'out-of-stock', label: 'Out of stock' },
];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();

  if (!user) {
    window.location.replace('../../register/Login.html?next=' + encodeURIComponent(location.pathname));
    return;
  }

  document.getElementById('app').innerHTML = renderLayout('saved-plants');
  document.getElementById('pageContent').innerHTML = `
    <div class="saved">
      <div class="saved__toolbar">
        <p class="saved__count" id="savedCount"></p>
        <div class="saved__filters" id="savedFilters"></div>
      </div>
      <div class="saved__grid" id="savedGrid">
        <div class="loading">Loading your saved plants…</div>
      </div>
    </div>
  `;

  loadPlants();
});


function peso(value) {
  return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shopLink(path) {
  return '../../FrontEnd/' + path;
}


async function loadPlants() {
  try {
    const response = await fetch('../customer_php/get_saved_plants.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Could not load saved plants.');
    plants = result.plants || [];
    render();
  } catch (error) {
    document.getElementById('savedGrid').innerHTML =
      `<div class="empty-state">Could not load your saved plants. Please refresh the page.</div>`;
  }
}


function render() {
  const inStock = plants.filter((p) => p.in_stock).length;

  document.getElementById('savedCount').textContent = plants.length
    ? `${plants.length} ${plants.length === 1 ? 'plant' : 'plants'} saved · ${inStock} in stock`
    : '';

  document.getElementById('savedFilters').innerHTML = plants.length ? FILTERS.map((f) => `
    <button type="button" class="saved__filter${f.key === currentFilter ? ' saved__filter--active' : ''}" data-filter="${f.key}">
      ${f.label}
    </button>
  `).join('') : '';

  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => { currentFilter = btn.dataset.filter; render(); });
  });

  const grid = document.getElementById('savedGrid');

  if (!plants.length) {
    grid.innerHTML = `
      <div class="saved__empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        <h2>No saved plants yet</h2>
        <p>Tap the heart on any plant to keep it here for later.</p>
        <a class="btn btn--primary" href="${shopLink('MARKETPLACE.html')}">Browse the Marketplace</a>
      </div>`;
    return;
  }

  let list = plants;
  if (currentFilter === 'in-stock') list = plants.filter((p) => p.in_stock);
  if (currentFilter === 'out-of-stock') list = plants.filter((p) => !p.in_stock);

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">No saved plants in this filter.</div>';
    return;
  }

  grid.innerHTML = list.map((plant) => {
    const detail = shopLink('DETAIL.html?product_id=' + encodeURIComponent(plant.product_id));
    const image = shopLink(plant.plant_image || 'products/no_photo.jpg');

    return `
      <article class="saved-card${plant.in_stock ? '' : ' saved-card--out'}">
        <a class="saved-card__img" href="${detail}">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(plant.plant_name)}" loading="lazy"
               onerror="this.onerror=null;this.src='../../FrontEnd/products/no_photo.jpg'">
          <span class="saved-card__stock${plant.in_stock ? '' : ' saved-card__stock--out'}">${plant.in_stock ? 'In stock' : 'Out of stock'}</span>
        </a>
        <button type="button" class="saved-card__heart" data-remove="${plant.id}" title="Remove from Saved Plants" aria-label="Remove ${escapeHtml(plant.plant_name)} from Saved Plants">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </button>
        <div class="saved-card__body">
          <a class="saved-card__name" href="${detail}">${escapeHtml(plant.plant_name)}</a>
          <div class="saved-card__meta">${escapeHtml(plant.category || '')}</div>
          <div class="saved-card__seller">${escapeHtml(plant.vendor_name || 'Seller')}</div>
          <div class="saved-card__price">${peso(plant.price)}</div>
        </div>
        <div class="saved-card__actions">
          <button type="button" class="btn btn--primary" data-cart="${plant.product_id}" ${plant.in_stock ? '' : 'disabled'}>
            ${plant.in_stock ? 'Add to cart' : 'Out of stock'}
          </button>
          <button type="button" class="btn btn--ghost" data-remove="${plant.id}">Remove</button>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => removePlant(Number(btn.dataset.remove)));
  });
  grid.querySelectorAll('[data-cart]').forEach((btn) => {
    btn.addEventListener('click', () => addToCart(Number(btn.dataset.cart), btn));
  });
}


async function removePlant(savedId) {
  try {
    const data = new FormData();
    data.append('saved_plant_id', savedId);
    const response = await fetch('../customer_php/remove_saved_plant.php', { method: 'POST', credentials: 'same-origin', body: data });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    plants = plants.filter((p) => Number(p.id) !== savedId);
    render();
    showToast('Removed from Saved Plants.');
  } catch (error) {
    showToast(error.message || 'Could not remove this plant.', true);
  }
}


async function addToCart(productId, btn) {
  btn.disabled = true;
  btn.textContent = 'Adding…';

  try {
    const response = await fetch('../../FrontEnd/add_to_cart.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, quantity: 1 }),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Could not add this plant to your cart.');
    const plant = plants.find((p) => Number(p.product_id) === productId);
    showToast(`${plant ? plant.plant_name : 'Plant'} added to your cart.`);
  } catch (error) {
    showToast(error.message || 'Could not add this plant to your cart.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add to cart';
  }
}
