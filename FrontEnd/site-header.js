/* site-header.js — Shared header behaviour for every shop page
 * (Home, Marketplace, product page, shop, About Us, Notifications,
 * Cart, Checkout). Include it at the end of <body>.
 *
 *  1. Shows the logged-in user's real profile photo and first name
 *     (read fresh from the database, so profile edits show right away).
 *  2. Small screens: a ☰ button opens the menu (links, search, icons).
 *  3. Search box: suggestions while typing (products and shops).
 *  4. Logged in: a Messages (chat) icon, and red unread badges on
 *     Messages and the notification bell (checked every minute).
 */

(function () {

  // Folder this script lives in (FrontEnd/), so paths work from any page
  const BASE = document.currentScript.src.replace(/[^/]*$/, '');
  const ROOT = new URL('../', BASE).href;

  const header = document.querySelector('body > header, header');
  if (!header) return;

  header.classList.add('sh');

  const STYLE = `
    header.sh .profile-container { text-decoration: none; }

    /* ---------- profile photo ---------- */
    header.sh .profile-avatar img.sh-avatar {
      width: 32px; height: 32px; border-radius: 50%; object-fit: cover; display: block;
    }

    /* ---------- search suggestions ---------- */
    header.sh .header-search { position: relative; }
    .sh-suggest {
      position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 1100;
      background: #fff; border: 1px solid #e3e3e3; border-radius: 14px;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14); overflow: hidden;
      font-family: 'Public Sans', sans-serif; text-align: left;
    }
    .sh-suggest[hidden] { display: none; }
    .sh-suggest__label {
      padding: 8px 14px 4px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase; color: #8a8a8a;
    }
    .sh-suggest__item {
      display: flex; align-items: center; gap: 12px; padding: 8px 14px;
      color: #1a1a1a; text-decoration: none; cursor: pointer;
    }
    .sh-suggest__item:hover, .sh-suggest__item.is-active { background: #f1f6f1; }
    .sh-suggest__thumb {
      width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: #eee;
    }
    .sh-suggest__thumb--round { border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; background: #28512F; font-weight: 700; }
    .sh-suggest__text { flex: 1; min-width: 0; }
    .sh-suggest__name { display: block; font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sh-suggest__sub { display: block; }
    .sh-suggest__name mark { background: none; color: #28512F; font-weight: 800; }
    .sh-suggest__sub { font-size: 0.75rem; color: #777; }
    .sh-suggest__price { font-size: 0.85rem; font-weight: 700; white-space: nowrap; }
    .sh-suggest__all { border-top: 1px solid #f0f0f0; font-size: 0.85rem; font-weight: 600; color: #28512F; }
    .sh-suggest__empty { padding: 14px; font-size: 0.85rem; color: #777; }

    /* ---------- unread badges ---------- */
    header.sh nav.secondary a.icon-btn { position: relative; }
    .sh-badge {
      position: absolute; top: -4px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px;
      border-radius: 9px; background: #d93025; color: #fff; font: 700 11px/18px 'Public Sans', sans-serif;
      text-align: center; box-shadow: 0 0 0 2px #fff; pointer-events: none;
    }
    .sh-badge[hidden] { display: none; }

    /* ---------- bell dropdown ---------- */
    .sh-notif {
      position: fixed; z-index: 1200; width: 370px; max-width: calc(100vw - 24px);
      background: #fff; border: 1px solid #e3e3e3; border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16); overflow: hidden;
      font-family: 'Public Sans', sans-serif; text-align: left; color: #1a1a1a;
    }
    .sh-notif[hidden] { display: none; }
    .sh-notif__head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
    }
    .sh-notif__title { font-weight: 800; font-size: 0.95rem; }
    .sh-notif__markall {
      border: none; background: none; color: #28512F; font: 600 0.8rem 'Public Sans', sans-serif; cursor: pointer;
    }
    .sh-notif__markall:hover { text-decoration: underline; }
    .sh-notif__list { max-height: min(420px, 60vh); overflow-y: auto; }
    .sh-notif__item {
      display: flex; gap: 12px; align-items: flex-start; padding: 11px 16px; cursor: pointer;
      border-bottom: 1px solid #f6f6f6;
    }
    .sh-notif__item:hover { background: #f5f9f5; }
    .sh-notif__item--unread { background: #f1f8f2; }
    .sh-notif__icon {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 0.9rem;
      background: #e6f2e8; color: #28512F;
    }
    .sh-notif__icon--Promo { background: #fff3df; color: #b26a00; }
    .sh-notif__icon--Urgent { background: #fdecec; color: #c0392b; }
    .sh-notif__body { flex: 1; min-width: 0; }
    .sh-notif__item-title { font-size: 0.86rem; font-weight: 700; line-height: 1.3; }
    .sh-notif__msg {
      font-size: 0.8rem; color: #555; line-height: 1.4; margin-top: 2px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .sh-notif__time { font-size: 0.72rem; color: #8a8a8a; margin-top: 3px; }
    .sh-notif__dot { width: 8px; height: 8px; border-radius: 50%; background: #2e7d32; margin-top: 6px; flex-shrink: 0; }
    .sh-notif__empty { padding: 28px 16px; text-align: center; color: #777; font-size: 0.88rem; }
    .sh-notif__all {
      display: block; padding: 12px; text-align: center; border-top: 1px solid #f0f0f0;
      color: #28512F; font-weight: 700; font-size: 0.85rem; text-decoration: none;
    }
    .sh-notif__all:hover { background: #f5f9f5; }

    /* ---------- small screens: ☰ menu ---------- */
    .sh-menu-btn { display: none; }

    @media (max-width: 900px) {
      header.sh {
        flex-direction: row !important; flex-wrap: wrap !important; align-items: center !important;
        gap: 10px !important; padding: 10px 16px !important;
      }
      header.sh .header-left {
        flex: 1 1 auto !important; width: auto !important; min-width: 0;
        flex-wrap: wrap; justify-content: flex-start !important; gap: 12px !important;
      }
      header.sh .logo-mark img { height: 40px; }
      header.sh .sh-menu-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 42px; height: 42px; border-radius: 12px; border: 1px solid #e3e3e3;
        background: #fff; color: #1a1a1a; font-size: 1.15rem; cursor: pointer; order: 2;
        align-self: flex-start;
      }
      header.sh .header-search {
        order: 3; flex: 1 1 100% !important; width: 100% !important;
        max-width: none !important; margin: 0 !important;
      }
      header.sh nav.primary,
      header.sh nav.secondary { display: none !important; }

      /* Menu open */
      header.sh.sh-open nav.primary {
        display: flex !important; flex: 1 1 100%; flex-direction: column; gap: 2px !important;
        padding-top: 6px;
      }
      header.sh.sh-open nav.primary a {
        padding: 10px 4px; border-bottom: 1px solid #f2f2f2 !important;
      }
      header.sh.sh-open nav.secondary {
        display: flex !important; order: 4; flex: 1 1 100% !important; width: 100% !important;
        flex-direction: column; align-items: stretch !important; justify-content: flex-start !important;
        gap: 2px !important; padding-top: 6px; border-top: 1px solid #eee;
      }
      header.sh.sh-open nav.secondary > a,
      header.sh.sh-open nav.secondary > .guest-auth a {
        justify-content: flex-start !important; padding: 10px 4px !important; gap: 12px;
      }
      header.sh.sh-open nav.secondary > a.icon-btn::after {
        content: attr(data-label); font-size: 0.95rem; font-weight: 600;
      }
      header.sh.sh-open nav.secondary .guest-auth {
        display: flex; flex-direction: row; gap: 10px; padding: 8px 0;
      }
      header.sh.sh-open nav.secondary .guest-auth a { justify-content: center !important; flex: 1; }
    }
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);


  /* ==========================================
     1. PROFILE PHOTO + NAME
  ========================================== */

  const session = window.punlaanSession || fetch(ROOT + 'register/session.php', {
    credentials: 'include',
    cache: 'no-store'
  }).then((r) => r.json()).catch(() => ({ logged_in: false }));

  session.then((s) => {
    if (!s || !s.logged_in) return;

    const nameEl = header.querySelector('#usernameDisplay') || header.querySelector('.profile-container span');
    if (nameEl && s.first_name) nameEl.textContent = s.first_name;

    if (s.profile_picture) {
      const src = /^https?:\/\//i.test(s.profile_picture) ? s.profile_picture : ROOT + s.profile_picture;
      header.querySelectorAll('.profile-avatar').forEach((box) => {
        const img = document.createElement('img');
        img.className = 'sh-avatar';
        img.alt = '';
        img.src = src;
        img.onload = () => { box.innerHTML = ''; box.appendChild(img); };
      });
    }

    startBadges();
  });


  /* ==========================================
     4. MESSAGES ICON + UNREAD BADGES
  ========================================== */

  function addBadge(link) {
    const badge = document.createElement('span');
    badge.className = 'sh-badge';
    badge.hidden = true;
    link.appendChild(badge);
    return badge;
  }

  function setBadge(badge, n) {
    if (!badge) return;
    badge.hidden = !n;
    badge.textContent = n > 99 ? '99+' : String(n);
  }

  function startBadges() {
    const bellLink = header.querySelector('nav.secondary a[href$="NOTIFICATION.html"]');
    if (!bellLink) return;

    // Chat with sellers / buyers (MyAccount → Messages)
    const chatLink = document.createElement('a');
    chatLink.href = ROOT + 'MyAccount/customer/Messages.html';
    chatLink.className = 'icon-btn';
    chatLink.setAttribute('aria-label', 'Messages');
    chatLink.dataset.label = 'Messages';
    chatLink.innerHTML = '<i class="fa-regular fa-comment-dots" style="font-size: 1.2rem;"></i>';
    bellLink.parentNode.insertBefore(chatLink, bellLink);

    const chatBadge = addBadge(chatLink);
    const bellBadge = bellLink.querySelector('#notificationBellBadge') || addBadge(bellLink);

    async function refresh() {
      if (document.hidden) return;
      try {
        const r = await fetch(ROOT + 'FrontEnd/notification/unread_counts.php', { credentials: 'include', cache: 'no-store' });
        const c = await r.json();
        if (!c.logged_in) return;
        setBadge(chatBadge, c.messages);
        if (bellBadge.classList.contains('sh-badge')) setBadge(bellBadge, c.notifications);
      } catch (e) { /* offline — try again later */ }
    }

    refresh();
    setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    window.punlaanRefreshBadges = refresh;

    setupBellPanel(bellLink, refresh);
  }


  /* ==========================================
     5. BELL DROPDOWN (latest notifications)
     Click the bell → the newest 8; "See all" → Notifications page.
     In the small-screen ☰ menu the bell just opens the page.
  ========================================== */

  function setupBellPanel(bellLink, refreshBadges) {
    const panel = document.createElement('div');
    panel.className = 'sh-notif';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(panel);

    let items = [];

    function place() {
      const r = bellLink.getBoundingClientRect();
      panel.style.top = (r.bottom + 10) + 'px';
      panel.style.right = Math.max(12, window.innerWidth - r.right - 16) + 'px';
    }

    function openPanel() {
      place();
      panel.hidden = false;
      panel.innerHTML = '<div class="sh-notif__empty">Loading…</div>';
      load();
    }

    function closePanel() { panel.hidden = true; }

    async function load() {
      try {
        const r = await fetch(ROOT + 'FrontEnd/notification/get_notifications.php', { credentials: 'include', cache: 'no-store' });
        const data = await r.json();
        items = (data.notifications || []).slice(0, 8);
      } catch (e) {
        items = [];
      }
      render();
    }

    function icon(n) {
      if (n.kind !== 'system') {
        return n.priority === 'Urgent' ? 'fa-solid fa-triangle-exclamation'
          : n.priority === 'Promo' ? 'fa-solid fa-tag' : 'fa-solid fa-bullhorn';
      }
      const t = String(n.title || '').toLowerCase();
      if (t.includes('message')) return 'fa-regular fa-comment-dots';
      if (t.includes('cancel')) return 'fa-solid fa-ban';
      if (t.includes('refund') || t.includes('return') || t.includes('dispute')) return 'fa-solid fa-rotate-left';
      if (t.includes('payment') || t.includes('payout')) return 'fa-solid fa-wallet';
      if (t.includes('courier') || t.includes('on the way') || t.includes('ship')) return 'fa-solid fa-truck-fast';
      if (t.includes('delivered') || t.includes('received')) return 'fa-solid fa-box-open';
      if (t.includes('review') || t.includes('rating')) return 'fa-solid fa-star';
      if (t.includes('seller') || t.includes('product')) return 'fa-solid fa-store';
      return 'fa-solid fa-box';
    }

    function timeAgo(value) {
      const d = new Date(String(value || '').replace(' ', 'T'));
      if (isNaN(d)) return '';
      const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
      if (s < 60) return 'Just now';
      if (s < 3600) return Math.floor(s / 60) + ' min ago';
      if (s < 86400) return Math.floor(s / 3600) + ' hr ago';
      if (s < 604800) return Math.floor(s / 86400) + 'd ago';
      return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    }

    function render() {
      const unread = items.some((n) => Number(n.is_read) === 0);
      panel.innerHTML = `
        <div class="sh-notif__head">
          <span class="sh-notif__title">Notifications</span>
          ${unread ? '<button type="button" class="sh-notif__markall">Mark all as read</button>' : ''}
        </div>
        <div class="sh-notif__list">
          ${items.length ? items.map((n) => {
            const isUnread = Number(n.is_read) === 0;
            const tone = n.kind !== 'system' ? (n.priority || 'Info') : 'Info';
            return `
              <div class="sh-notif__item${isUnread ? ' sh-notif__item--unread' : ''}" data-id="${Number(n.notification_id)}" role="button" tabindex="0">
                <span class="sh-notif__icon sh-notif__icon--${esc(tone)}"><i class="${icon(n)}"></i></span>
                <span class="sh-notif__body">
                  <span class="sh-notif__item-title" style="display:block">${esc(n.title)}</span>
                  <span class="sh-notif__msg">${esc(n.message)}</span>
                  <span class="sh-notif__time" style="display:block">${timeAgo(n.created_at)}</span>
                </span>
                ${isUnread ? '<span class="sh-notif__dot" aria-label="Unread"></span>' : ''}
              </div>`;
          }).join('') : '<div class="sh-notif__empty">You\'re all caught up. 🌱</div>'}
        </div>
        <a class="sh-notif__all" href="${BASE}NOTIFICATION.html">See all notifications</a>`;
    }

    function post(file, body) {
      return fetch(ROOT + 'FrontEnd/notification/' + file, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      }).catch(() => null);
    }

    function withPopup(callback) {
      if (window.showAnnouncement) return callback();
      const s = document.createElement('script');
      s.src = BASE + 'notification/announcement-popup.js?v=20260927d';
      s.onload = callback;
      document.head.appendChild(s);
    }

    async function openItem(id) {
      const n = items.find((x) => Number(x.notification_id) === id);
      if (!n) return;
      if (Number(n.is_read) === 0) {
        n.is_read = 1;
        await post('mark_notification_read.php', { notification_id: id });
        refreshBadges();
      }
      if (n.link) {
        location.href = ROOT + String(n.link).replace(/^\/+/, '');
      } else if (n.kind !== 'system') {
        closePanel();
        withPopup(() => window.showAnnouncement(n));
      } else {
        render();
      }
    }

    panel.addEventListener('click', async (e) => {
      if (e.target.closest('.sh-notif__markall')) {
        await post('mark_all_notifications_read.php');
        items.forEach((n) => { n.is_read = 1; });
        render();
        refreshBadges();
        return;
      }
      const item = e.target.closest('.sh-notif__item');
      if (item) openItem(Number(item.dataset.id));
    });

    panel.addEventListener('keydown', (e) => {
      const item = e.target.closest('.sh-notif__item');
      if (item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openItem(Number(item.dataset.id)); }
    });

    bellLink.addEventListener('click', (e) => {
      if (header.classList.contains('sh-open')) return;   // ☰ menu: go to the page
      e.preventDefault();
      panel.hidden ? openPanel() : closePanel();
    });

    document.addEventListener('click', (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !bellLink.contains(e.target)) closePanel();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
    window.addEventListener('resize', () => {
      if (panel.hidden) return;
      // Switched to the small-screen menu → the bell becomes a normal link
      if (window.innerWidth <= 900) closePanel(); else place();
    });
    window.addEventListener('scroll', () => { if (!panel.hidden) place(); }, { passive: true });
  }


  /* ==========================================
     2. SMALL SCREENS: ☰ MENU
  ========================================== */

  // Labels shown next to the icons inside the open menu
  header.querySelectorAll('nav.secondary > a.icon-btn').forEach((a) => {
    a.dataset.label = (a.getAttribute('aria-label') || '').replace(/\s*\(.*\)$/, '');
  });

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'sh-menu-btn';
  menuBtn.setAttribute('aria-label', 'Open menu');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';

  const left = header.querySelector('.header-left');
  if (left && left.nextSibling) header.insertBefore(menuBtn, left.nextSibling);
  else header.appendChild(menuBtn);

  function setMenu(open) {
    header.classList.toggle('sh-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
  }

  menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('sh-open')));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });


  /* ==========================================
     3. SEARCH SUGGESTIONS
  ========================================== */

  const form = header.querySelector('.header-search');
  const input = form && form.querySelector('input[name="q"]');
  if (!input) return;

  input.setAttribute('autocomplete', 'off');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', 'shSuggest');

  const box = document.createElement('div');
  box.className = 'sh-suggest';
  box.id = 'shSuggest';
  box.setAttribute('role', 'listbox');
  box.hidden = true;
  form.appendChild(box);

  let timer = null;
  let lastQuery = '';
  let active = -1;

  function esc(text) {
    return String(text ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Bold the typed part of a name
  function highlight(name, q) {
    const i = name.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(name);
    return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length));
  }

  function peso(v) {
    return '₱' + Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function close() {
    box.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
  }

  function items() {
    return Array.from(box.querySelectorAll('.sh-suggest__item'));
  }

  function setActive(i) {
    const list = items();
    if (!list.length) return;
    active = (i + list.length) % list.length;
    list.forEach((el, n) => el.classList.toggle('is-active', n === active));
    list[active].scrollIntoView({ block: 'nearest' });
  }

  function render(q, data) {
    const products = data.products || [];
    const shops = data.shops || [];
    const searchUrl = BASE + 'MARKETPLACE.html?q=' + encodeURIComponent(q);

    let html = '';

    if (products.length) {
      html += '<div class="sh-suggest__label">Plants &amp; products</div>';
      html += products.map((p) => `
        <a class="sh-suggest__item" role="option" href="${BASE}DETAIL.html?product_id=${p.id}">
          <img class="sh-suggest__thumb" src="${esc(BASE + p.image)}" alt="" loading="lazy"
               onerror="this.onerror=null;this.src='${BASE}products/no_photo.jpg'">
          <span class="sh-suggest__text">
            <span class="sh-suggest__name">${highlight(p.name, q)}</span>
            ${p.subcategory ? `<span class="sh-suggest__sub">${esc(p.subcategory)}</span>` : ''}
          </span>
          <span class="sh-suggest__price">${peso(p.price)}</span>
        </a>`).join('');
    }

    if (shops.length) {
      html += '<div class="sh-suggest__label">Shops</div>';
      html += shops.map((s) => {
        const avatar = s.avatar
          ? `<img class="sh-suggest__thumb" style="border-radius:50%" src="${esc(/^https?:/i.test(s.avatar) ? s.avatar : ROOT + s.avatar)}" alt="">`
          : `<span class="sh-suggest__thumb sh-suggest__thumb--round">${esc(s.name.charAt(0))}</span>`;
        return `
          <a class="sh-suggest__item" role="option" href="${BASE}SHOP.html?vendor_id=${s.id}">
            ${avatar}
            <span class="sh-suggest__text">
              <span class="sh-suggest__name">${highlight(s.name, q)}</span>
              <span class="sh-suggest__sub">Visit shop</span>
            </span>
          </a>`;
      }).join('');
    }

    if (!products.length && !shops.length) {
      html += `<div class="sh-suggest__empty">No matches for “${esc(q)}”.</div>`;
    }

    html += `
      <a class="sh-suggest__item sh-suggest__all" role="option" href="${searchUrl}">
        <i class="fa-solid fa-magnifying-glass"></i> Search the Marketplace for “${esc(q)}”
      </a>`;

    box.innerHTML = html;
    box.hidden = false;
    active = -1;
    input.setAttribute('aria-expanded', 'true');
  }

  async function suggest() {
    const q = input.value.trim();
    if (q === lastQuery && !box.hidden) return;
    lastQuery = q;

    if (q.length < 2) {
      close();
      return;
    }

    try {
      const response = await fetch(BASE + 'search_suggest.php?q=' + encodeURIComponent(q), { cache: 'no-store' });
      const data = await response.json();
      // Ignore late answers for older text
      if (input.value.trim() === q) render(q, data);
    } catch (e) {
      close();
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(suggest, 180);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) {
      lastQuery = '';
      suggest();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); items()[active].click(); }
    else if (e.key === 'Escape') { close(); }
  });

  document.addEventListener('click', (e) => {
    if (!form.contains(e.target)) close();
  });

})();
