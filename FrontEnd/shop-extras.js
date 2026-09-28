/* shop-extras.js — ratings, reviews and "Chat with seller"
 * on the product page (DETAIL.html) and the shop page (SHOP.html).
 * Include after the page's own script.
 *
 * Data: get_product.php / get_reviews.php
 * Chat opens MyAccount/customer/Messages.html (guests are asked to log in).
 */

(function () {

  'use strict';

  const BASE = document.currentScript.src.replace(/[^/]*$/, '');   // …/FrontEnd/
  const ROOT = new URL('../', BASE).href;

  const params = new URLSearchParams(location.search);
  const productId = Number(params.get('product_id')) || 0;
  const shopId = Number(params.get('vendor_id')) || 0;

  const isProductPage = Boolean(document.getElementById('productName')) && productId > 0;
  const isShopPage = Boolean(document.getElementById('shopHeader')) && shopId > 0;

  if (!isProductPage && !isShopPage) return;

  const style = document.createElement('style');
  style.textContent = `
    .px-rating { display: inline-flex; align-items: center; gap: 8px; margin: 6px 0 4px; font-size: 0.92rem; color: #4a5a50; text-decoration: none; }
    .px-rating:hover { color: #28512F; }
    .px-stars { color: #f5a623; letter-spacing: 1px; }
    .px-stars .off { color: #d9dfda; }
    .px-chat {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 10px; padding: 10px 18px; border-radius: 10px; cursor: pointer;
      border: 1.5px solid #28512F; background: #fff; color: #28512F; font-weight: 700; font-size: 0.9rem;
      font-family: inherit; width: 100%; box-sizing: border-box;
    }
    .px-chat:hover { background: #eef6ef; }
    .shop-identity .px-chat { width: auto; }

    .px-freeship {
      display: inline-flex; align-items: center; gap: 8px; margin: 8px 0 2px;
      padding: 6px 12px; border-radius: 999px; background: #eaf6ee; color: #1b4332;
      font: 600 0.82rem 'Public Sans', sans-serif;
    }
    .px-freeship i { color: #28512F; }

    .px-reviews { max-width: 1200px; margin: 32px auto 10px; padding: 0 24px; font-family: 'Public Sans', sans-serif; }
    .px-reviews h2 { font-size: 1.35rem; margin: 0 0 16px; color: #1a1a1a; }
    .px-reviews__summary {
      display: flex; gap: 28px; flex-wrap: wrap; align-items: center;
      background: #f6faf6; border: 1px solid #e3ede5; border-radius: 16px; padding: 18px 22px; margin-bottom: 18px;
    }
    .px-reviews__avg { font-size: 2.4rem; font-weight: 800; color: #1a1a1a; line-height: 1; }
    .px-reviews__avg small { display: block; font-size: 0.8rem; font-weight: 500; color: #6b7c72; margin-top: 6px; }
    .px-bars { flex: 1; min-width: 200px; max-width: 360px; }
    .px-bar { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #6b7c72; margin: 3px 0; }
    .px-bar__track { flex: 1; height: 7px; border-radius: 4px; background: #e3ebe5; overflow: hidden; }
    .px-bar__track { display: block; }
    .px-bar__fill { display: block; height: 100%; background: #f5a623; }
    .px-review { border-bottom: 1px solid #eef2ee; padding: 16px 0; display: flex; gap: 12px; }
    .px-review__avatar { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: #28512F; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .px-review__body { flex: 1; min-width: 0; }
    .px-review__top { display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline; }
    .px-review__name { font-weight: 700; color: #1a1a1a; }
    .px-review__date { font-size: 0.8rem; color: #8a9a90; }
    .px-review__product { font-size: 0.8rem; color: #6b7c72; margin-top: 2px; }
    .px-review__text { margin: 6px 0 0; line-height: 1.55; color: #333; white-space: pre-line; overflow-wrap: anywhere; }
    .px-review__reply { margin-top: 10px; padding: 10px 12px; background: #f4f8f4; border-radius: 10px; font-size: 0.9rem; color: #3b4a41; }
    .px-review__reply strong { color: #28512F; }
    .px-empty { color: #6b7c72; padding: 8px 0 20px; }

    .px-report { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; background: none; border: 0; padding: 0;
      color: #8a9a90; font: 500 0.82rem 'Public Sans', sans-serif; cursor: pointer; }
    .px-report:hover { color: #b3261e; text-decoration: underline; }
    .px-dialog { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; }
    .px-dialog__box { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; padding: 22px; font-family: 'Public Sans', sans-serif; box-sizing: border-box; }
    .px-dialog__box h3 { margin: 0 0 4px; font-size: 1.15rem; color: #1a1a1a; }
    .px-dialog__box p { margin: 0 0 14px; font-size: 0.88rem; color: #6b7c72; }
    .px-dialog__box label { display: block; font-size: 0.82rem; font-weight: 600; color: #3b4a41; margin: 10px 0 6px; }
    .px-dialog__box select, .px-dialog__box textarea { width: 100%; box-sizing: border-box; border: 1.5px solid #d9e2db; border-radius: 10px; padding: 10px; font: inherit; }
    .px-dialog__box textarea { min-height: 80px; resize: vertical; }
    .px-dialog__error { color: #b3261e; font-size: 0.84rem; margin-top: 8px; }
    .px-dialog__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
    .px-dialog__actions button { padding: 10px 18px; border-radius: 10px; font: 700 0.88rem 'Public Sans', sans-serif; cursor: pointer; border: 1.5px solid #28512F; }
    .px-dialog__cancel { background: #fff; color: #28512F; }
    .px-dialog__send { background: #28512F; color: #fff; }
    .px-dialog__send:disabled { opacity: .6; cursor: default; }
  `;
  document.head.appendChild(style);


  /* ---------- helpers ---------- */

  function esc(text) {
    return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function stars(rating) {
    const full = Math.round(Number(rating) || 0);
    let html = '<span class="px-stars" aria-hidden="true">';
    for (let i = 1; i <= 5; i++) html += i <= full ? '★' : '<span class="off">★</span>';
    return html + '</span>';
  }

  function niceDate(value) {
    const d = new Date(String(value || '').replace(' ', 'T'));
    return isNaN(d) ? '' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function asset(path) {
    return /^https?:\/\//i.test(path) ? path : ROOT + path;
  }

  const session = window.punlaanSession || fetch(ROOT + 'register/session.php', { credentials: 'include', cache: 'no-store' })
    .then((r) => r.json()).catch(() => ({ logged_in: false }));


  /* ---------- "Chat with seller" ---------- */

  function chatButton(vendorId, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-chat';
    btn.innerHTML = '<i class="fa-regular fa-comment-dots"></i> ' + label;

    const target = 'MyAccount/customer/Messages.html?vendor_id=' + vendorId + (productId ? '&product_id=' + productId : '');

    btn.addEventListener('click', async () => {
      const s = await session;
      if (!s || !s.logged_in) {
        const next = new URL(ROOT + target);
        if (window.requireLogin) window.requireLogin(next.href);
        else location.href = ROOT + 'register/Login.html?next=' + encodeURIComponent(next.pathname + next.search);
        return;
      }
      location.href = ROOT + target;
    });

    // Sellers don't chat with their own shop
    session.then((s) => { if (s && Number(s.user_id) === Number(vendorId)) btn.remove(); });

    return btn;
  }


  /* ---------- "Report" (report.php → admin Reports page) ---------- */

  function reportButton(target, vendorId) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-report';
    btn.innerHTML = '<i class="fa-regular fa-flag"></i> Report this ' + (target === 'product' ? 'listing' : 'shop');

    btn.addEventListener('click', async () => {
      const s = await session;
      if (!s || !s.logged_in) {
        if (window.requireLogin) window.requireLogin(location.href);
        else location.href = ROOT + 'register/Login.html';
        return;
      }
      openReportDialog(target, vendorId);
    });

    // Sellers don't report their own shop
    session.then((s) => { if (s && Number(s.user_id) === Number(vendorId)) btn.remove(); });

    return btn;
  }

  async function openReportDialog(target, vendorId) {
    let reasons = [];
    try {
      reasons = (await (await fetch(BASE + 'report.php', { cache: 'no-store' })).json()).reasons || [];
    } catch (e) { /* shown empty */ }

    const dialog = document.createElement('div');
    dialog.className = 'px-dialog';
    dialog.innerHTML = `
      <form class="px-dialog__box" role="dialog" aria-modal="true" aria-labelledby="pxReportTitle">
        <h3 id="pxReportTitle">Report this ${target === 'product' ? 'listing' : 'shop'}</h3>
        <p>Punlaan's team will review it. The seller won't see who reported.</p>
        <label for="pxReason">Reason</label>
        <select id="pxReason" required>
          <option value="">Choose a reason…</option>
          ${reasons.map((r) => `<option>${esc(r)}</option>`).join('')}
        </select>
        <label for="pxDetails">Details (optional)</label>
        <textarea id="pxDetails" maxlength="1000" placeholder="What's wrong? e.g. the plant in the photo is different from what arrived."></textarea>
        <div class="px-dialog__error" id="pxReportError" hidden></div>
        <div class="px-dialog__actions">
          <button type="button" class="px-dialog__cancel">Cancel</button>
          <button type="submit" class="px-dialog__send">Send report</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);

    const close = () => dialog.remove();
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    dialog.querySelector('.px-dialog__cancel').addEventListener('click', close);
    dialog.querySelector('#pxReason').focus();

    dialog.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const error = dialog.querySelector('#pxReportError');
      const send = dialog.querySelector('.px-dialog__send');
      const reason = dialog.querySelector('#pxReason').value;
      if (!reason) { error.textContent = 'Choose a reason.'; error.hidden = false; return; }

      send.disabled = true;
      try {
        const r = await fetch(BASE + 'report.php', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target,
            product_id: productId,
            vendor_id: vendorId,
            reason,
            details: dialog.querySelector('#pxDetails').value,
          }),
        });
        const result = await r.json();
        if (!result.success) throw new Error(result.message);
        dialog.querySelector('form').innerHTML = `
          <h3>Report sent</h3><p>${esc(result.message)}</p>
          <div class="px-dialog__actions"><button type="button" class="px-dialog__send">OK</button></div>`;
        dialog.querySelector('.px-dialog__send').addEventListener('click', close);
      } catch (err) {
        error.textContent = err.message || 'Could not send the report.';
        error.hidden = false;
        send.disabled = false;
      }
    });
  }


  /* ---------- reviews list ---------- */

  function reviewsSection(data, title, showProduct) {
    const section = document.createElement('section');
    section.className = 'px-reviews';
    section.id = 'reviews';

    if (!data.count) {
      section.innerHTML = `<h2>${esc(title)}</h2><p class="px-empty">No reviews yet. Buyers can rate items after they're delivered.</p>`;
      return section;
    }

    const bars = [5, 4, 3, 2, 1].map((n) => {
      const c = data.breakdown[n] || 0;
      return `<div class="px-bar"><span>${n}★</span><span class="px-bar__track"><span class="px-bar__fill" style="width:${Math.round((c / data.count) * 100)}%"></span></span><span>${c}</span></div>`;
    }).join('');

    section.innerHTML = `
      <h2>${esc(title)}</h2>
      <div class="px-reviews__summary">
        <div class="px-reviews__avg">${Number(data.average).toFixed(1)} ${stars(data.average)}
          <small>${data.count} review${data.count === 1 ? '' : 's'}</small>
        </div>
        <div class="px-bars">${bars}</div>
      </div>
      ${data.reviews.map((r) => `
        <article class="px-review">
          ${r.avatar
            ? `<img class="px-review__avatar" src="${esc(asset(r.avatar))}" alt="">`
            : `<span class="px-review__avatar">${esc(r.customer.charAt(0))}</span>`}
          <div class="px-review__body">
            <div class="px-review__top">
              <span class="px-review__name">${esc(r.customer)}</span>
              ${stars(r.rating)}
              <span class="px-review__date">${niceDate(r.created_at)}</span>
            </div>
            ${showProduct ? `<div class="px-review__product">Bought: <a href="DETAIL.html?product_id=${r.product_id}">${esc(r.product_name)}</a></div>` : ''}
            ${r.comment ? `<p class="px-review__text">${esc(r.comment)}</p>` : ''}
            ${r.seller_reply ? `<div class="px-review__reply"><strong>Seller's reply:</strong> ${esc(r.seller_reply)}</div>` : ''}
          </div>
        </article>`).join('')}
    `;

    return section;
  }


  /* ---------- product page ---------- */

  async function productPage() {
    let product;
    try {
      const r = await fetch(BASE + 'get_product.php?product_id=' + productId, { cache: 'no-store' });
      product = (await r.json()).product;
    } catch (e) { return; }
    if (!product) return;

    // ★ rating under the price
    const price = document.getElementById('productPrice');
    if (price) {
      const link = document.createElement('a');
      link.className = 'px-rating';
      link.href = '#reviews';
      link.innerHTML = product.review_count
        ? `${stars(product.rating)} <strong>${Number(product.rating).toFixed(1)}</strong> · ${product.review_count} review${product.review_count === 1 ? '' : 's'}`
        : `${stars(0)} No reviews yet`;
      price.insertAdjacentElement('afterend', link);
      if (product.free_ship_min) link.insertAdjacentElement('afterend', freeShipBadge(product.free_ship_min, 'from this shop'));
    }

    // Chat under "Visit Shop"
    const visit = document.querySelector('.btn-visit-shop');
    if (visit) {
      const chat = chatButton(product.user_id, 'Chat with seller');
      visit.insertAdjacentElement('afterend', chat);
      chat.insertAdjacentElement('afterend', reportButton('product', product.user_id));
    }

    // Reviews below the product
    try {
      const r = await fetch(BASE + 'get_reviews.php?product_id=' + productId, { cache: 'no-store' });
      const data = await r.json();
      const main = document.querySelector('main');
      if (data.success && main) main.appendChild(reviewsSection(data, 'Ratings & reviews', false));
    } catch (e) { /* no reviews shown */ }
  }


  /* "Free shipping on orders from ₱500" */
  function freeShipBadge(amount, suffix) {
    const el = document.createElement('div');
    el.className = 'px-freeship';
    el.innerHTML = `<i class="fa-solid fa-truck-fast"></i> Free shipping on orders from
      <strong>₱${Number(amount).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</strong>${suffix ? ' ' + esc(suffix) : ''}`;
    return el;
  }


  /* ---------- shop page ---------- */

  async function shopPage() {
    let data;
    try {
      const r = await fetch(BASE + 'get_reviews.php?vendor_id=' + shopId, { cache: 'no-store' });
      data = await r.json();
    } catch (e) { return; }
    if (!data || !data.success) return;

    // Rating in the shop stats
    const stats = document.querySelector('.shop-stats');
    if (stats) {
      const stat = document.createElement('div');
      stat.className = 'shop-stat';
      stat.innerHTML = `<dt><i class="fa-solid fa-star"></i> Rating</dt>
        <dd>${data.count ? Number(data.average).toFixed(1) + ' <small style="font-weight:500;color:#6b7c72">(' + data.count + ')</small>' : '—'}</dd>`;
      stats.insertBefore(stat, stats.firstChild);
    }

    const identity = document.querySelector('.shop-identity');
    if (identity) identity.appendChild(chatButton(shopId, 'Chat with this shop'));

    // Seller's free-shipping offer
    try {
      const r = await fetch(BASE + 'get_shop.php?vendor_id=' + shopId, { cache: 'no-store' });
      const shop = (await r.json()).shop;
      if (identity && shop && shop.free_ship_min) identity.appendChild(freeShipBadge(shop.free_ship_min, ''));
    } catch (e) { /* no badge */ }

    if (identity) {
      const report = reportButton('shop', shopId);
      report.style.display = 'flex';
      identity.appendChild(report);
    }

    const products = document.getElementById('shopProducts');
    if (products) products.insertAdjacentElement('afterend', reviewsSection(data, 'Shop reviews', true));
  }

  if (isProductPage) productPage();
  if (isShopPage) shopPage();

})();
