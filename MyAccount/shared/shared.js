let CURRENT_USER = null;
async function getCurrentUser() {
  try {
    const response = await fetch(
      "../../register/current_user.php",
      {
        credentials: "same-origin"
      }
    );

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.logged_in) {
      CURRENT_USER = null;
      return null;
    }

    CURRENT_USER = result.user;

    return CURRENT_USER;

  } catch (error) {
    console.error("Could not get current user:", error);

    CURRENT_USER = null;

    return null;
  }
}

const NAV = [
  {
    section: 'Customer', group: 'customer', dir: 'customer',
    items: [
      { key: 'my-orders',    file: 'MyOrders.html',    label: 'My Orders',
        icon: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>' },
      { key: 'messages',      file: 'Messages.html',    label: 'Messages', badge: 'messages',
        icon: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>' },
      { key: 'saved-plants',  file: 'SavedPlants.html', label: 'Saved Plants',
        icon: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>' },
      { key: 'profile',       file: 'Profile.html',     label: 'Profile',
        icon: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
    ],
  },
  {
    section: 'Vendor', group: 'vendor', dir: 'vendor',
    items: [
      { key: 'inventory',        file: 'Inventory.html',        label: 'Inventory',
        icon: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>' },
      { key: 'order-processing', file: 'OrderProcessing.html',  label: 'Order Processing',
        icon: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>' },
      { key: 'sales',            file: 'Sales.html',            label: 'Sales & Payouts',
        icon: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' },
      { key: 'reviews',          file: 'Reviews.html',          label: 'Reviews',
        icon: '<path d="M11.5 2.8a.6.6 0 0 1 1 0l2.6 5.3 5.8.8a.6.6 0 0 1 .3 1l-4.2 4.1 1 5.8a.6.6 0 0 1-.8.6L12 17.7l-5.2 2.7a.6.6 0 0 1-.8-.6l1-5.8-4.2-4.1a.6.6 0 0 1 .3-1l5.8-.8Z"/>' },
      { key: 'storefront',       file: 'Storefront.html',       label: 'Storefront',
        icon: '<path d="m3 9 2-6h14l2 6"/><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/><path d="M4 9v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/>' },
    ],
  },
];

const PAGE_LABELS = Object.fromEntries(NAV.flatMap(s => s.items).map(i => [i.key, i.label]));

/** Marketplace home (FrontEnd/HOME.html) — used by sidebar brand click */
const MARKETPLACE_HOME = '../../FrontEnd/HOME.html';

function goToMarketplaceHome() {
  window.location.href = MARKETPLACE_HOME;
}

/* ---------- helpers ---------- */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, isError) {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' toast--error' : '');
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  setTimeout(() => {
    el.classList.remove('toast--show');
    setTimeout(() => el.remove(), 200);
  }, 2600);
}

/* ---------- layout shell ---------- */

function renderLayout(activeKey) {
  const title = PAGE_LABELS[activeKey] || 'Dashboard';
  const session = getSessionProfile();

  const navSections = NAV.filter(
    (section) => section.group !== 'vendor' || session.is_vendor
  );

  const navHtml = navSections.map(section => `
    <div class="sidebar__section">
      <div class="sidebar__section-label">${section.section}</div>
      ${section.items.map(item => `
        <a class="sidebar__link${item.key === activeKey ? ' sidebar__link--active' : ''}"
           href="../${section.dir}/${item.file}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
          <span>${item.label}</span>
          ${item.badge ? `<span class="sidebar__badge" data-badge="${item.badge}" hidden></span>` : ''}
        </a>
      `).join('')}
    </div>
  `).join('');

  const footName = escapeHtml(session.full_name || 'User');
  const footRole = session.is_vendor ? 'Vendor + Customer' : 'Customer';
  const userIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const sidebarAvatar = session.avatar_url
    ? `<img src="${session.avatar_url}" alt="${footName}" class="sidebar__foot-avatar" />`
    : `<div class="sidebar__foot-avatar sidebar__foot-avatar--placeholder">${userIcon}</div>`;
  const topbarAvatar = session.avatar_url
    ? `<img src="${session.avatar_url}" alt="${footName}" class="topbar__avatar" />`
    : `<div class="topbar__avatar topbar__avatar--placeholder">${userIcon}</div>`;

  const notifBellHtml = `
    <button type="button" class="notif-bell" id="notifBell" onclick="toggleNotifications(event)" aria-label="Notifications">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      <span class="notif-bell__badge" id="notifBadge" style="display:none;">0</span>
    </button>
    <div class="notif-panel" id="notifPanel" style="display:none;"></div>
  `;

  setTimeout(initNotifications, 0);

  return `
    <aside class="sidebar">
      <button type="button" class="sidebar__brand" onclick="goToMarketplaceHome()" aria-label="Go to Punlaan home">
        <span class="sidebar__brand-mark">🌿</span>
        <span class="sidebar__brand-name">Punlaan</span>
      </button>
      <nav class="sidebar__nav">
        <div class="sidebar__section">
          <a class="sidebar__link sidebar__link--shop" href="../../FrontEnd/MARKETPLACE.html">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            <span>Back to shop</span>
          </a>
        </div>
        ${navHtml}
      </nav>
      <div class="sidebar__foot">
        ${sidebarAvatar}
        <div class="sidebar__foot-info">
          <div class="sidebar__foot-name">${footName}</div>
          <div class="sidebar__foot-role">${footRole}</div>
        </div>
      </div>
    </aside>
    <div class="sidebar-backdrop" onclick="toggleSidebar(false)"></div>
    <div class="main">
      <header class="topbar">
        <button type="button" class="topbar__menu" onclick="toggleSidebar()" aria-label="Open menu" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="topbar__title">${title}</div>
        <div class="topbar__right">
          ${notifBellHtml}
          ${topbarAvatar}
        </div>
      </header>
      <div class="content" id="pageContent"></div>
    </div>
  `;
}

/* ---------- small screens: slide-in sidebar ---------- */

function toggleSidebar(open) {
  const page = document.querySelector('.page');
  if (!page) return;
  const isOpen = open === undefined ? !page.classList.contains('nav-open') : open;
  page.classList.toggle('nav-open', isOpen);
  document.querySelector('.topbar__menu')?.setAttribute('aria-expanded', String(isOpen));
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggleSidebar(false);
});

/* ---------- notifications ---------- */

// Real notifications (same data as FrontEnd/NOTIFICATION.html)
const NOTIF_API = '../../FrontEnd/notification/';
let _notifCache = [];

let _notifTimer = null;

async function initNotifications() {
  document.removeEventListener('click', handleNotifOutsideClick);
  document.addEventListener('click', handleNotifOutsideClick);
  await loadNotifCache();
  refreshSidebarBadges();

  // Keep the bell and Messages badge fresh while the page is open
  clearInterval(_notifTimer);
  _notifTimer = setInterval(() => {
    if (document.hidden) return;
    loadNotifCache();
    refreshSidebarBadges();
  }, 60000);
}

async function loadNotifCache() {
  try {
    const response = await fetch(NOTIF_API + 'get_notifications.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    _notifCache = (result.notifications || []).map(n => ({
      id: n.notification_id,
      title: n.title,
      message: n.message,
      link: n.link,
      kind: n.kind,
      priority: n.priority,
      created_at: n.created_at,
      is_read: Number(n.is_read) === 1
    }));
    renderNotifBadge();
  } catch (err) { /* fail silently, badge stays hidden */ }
}

/* Unread chat messages → badge next to "Messages" in the sidebar */
async function refreshSidebarBadges() {
  try {
    const response = await fetch(NOTIF_API + 'unread_counts.php', { credentials: 'same-origin', cache: 'no-store' });
    const c = await response.json();
    document.querySelectorAll('[data-badge="messages"]').forEach((el) => {
      el.hidden = !c.messages;
      el.textContent = c.messages > 99 ? '99+' : String(c.messages || '');
    });
  } catch (err) { /* ignore */ }
}

function postNotif(file, body) {
  return fetch(NOTIF_API + file, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
}

function renderNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const unread = _notifCache.filter(n => !n.is_read).length;
  badge.style.display = unread > 0 ? 'flex' : 'none';
  badge.textContent = unread > 9 ? '9+' : String(unread);
}

function toggleNotifications(e) {
  e.stopPropagation();
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  if (panel.style.display === 'block') {
    panel.style.display = 'none';
  } else {
    renderNotifPanel();
    panel.style.display = 'block';
  }
}

function handleNotifOutsideClick(e) {
  const panel = document.getElementById('notifPanel');
  const bell = document.getElementById('notifBell');
  if (!panel || panel.style.display !== 'block') return;
  if (panel.contains(e.target) || (bell && bell.contains(e.target))) return;
  panel.style.display = 'none';
}

function renderNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  const hasUnread = _notifCache.some(n => !n.is_read);

  const listHtml = _notifCache.length
    ? _notifCache.slice(0, 8).map(n => `
        <div class="notif-item${n.is_read ? '' : ' notif-item--unread'}" onclick="onNotifClick(${Number(n.id)})">
          <span class="notif-item__dot${n.is_read ? ' notif-item__dot--read' : ''}"></span>
          <div class="notif-item__body">
            <div class="notif-item__title">${escapeHtml(n.title)}</div>
            <div class="notif-item__msg">${escapeHtml(n.message)}</div>
            <div class="notif-item__time">${timeAgo(n.created_at)}</div>
          </div>
        </div>
      `).join('')
    : `<div class="notif-panel__empty">You're all caught up.</div>`;

  panel.innerHTML = `
    <div class="notif-panel__header">
      <span class="notif-panel__title">Notifications</span>
      ${hasUnread ? `<button type="button" class="notif-panel__mark-all" onclick="markAllNotificationsRead(event)">Mark all as read</button>` : ''}
    </div>
    <div class="notif-panel__list">${listHtml}</div>
    <a class="notif-panel__mark-all" style="display:block;text-align:center;padding:10px;border-top:1px solid #eee;text-decoration:none;"
       href="../../FrontEnd/NOTIFICATION.html">See all notifications</a>
  `;
}

async function onNotifClick(id) {
  const n = _notifCache.find(x => Number(x.id) === Number(id));
  try {
    await postNotif('mark_notification_read.php', { notification_id: id });
    if (n) n.is_read = true;
    renderNotifBadge();
    renderNotifPanel();
  } catch (err) {}
  if (!n) return;
  // Open the page the notification is about (links are relative to the site root)
  if (n.link) {
    window.location.href = '../../' + String(n.link).replace(/^\/+/, '');
  } else if (n.kind !== 'system') {
    // Admin announcement → read it in a popup
    document.getElementById('notifPanel').style.display = 'none';
    withAnnouncementPopup(() => window.showAnnouncement(n));
  }
}

/* ---------- opened from a notification: jump to the right card ----------
   Links look like MyOrders.html?order=12&item=40, OrderProcessing.html?return=3,
   Reviews.html?review=7. Pages mark their cards with data-order-id /
   data-item-id / data-return-id / data-review-id and call this after rendering.
   Runs once per page load. */
let _linkedDone = false;

function highlightLinked() {
  if (_linkedDone) return;
  const params = new URLSearchParams(location.search);
  const selectors = [
    ['item', 'data-item-id'],      // most specific first
    ['return', 'data-return-id'],
    ['review', 'data-review-id'],
    ['order', 'data-order-id']
  ];

  for (const [param, attr] of selectors) {
    const value = params.get(param);
    if (!value || !/^\d+$/.test(value)) continue;
    const cards = document.querySelectorAll(`[${attr}="${value}"]`);
    if (!cards.length) continue;

    _linkedDone = true;
    cards.forEach(card => card.classList.add('is-linked'));
    scrollToCard(cards[0]);
    setTimeout(() => cards.forEach(card => card.classList.remove('is-linked')), 6000);
    return;
  }
}

// Scroll only the area that scrolls (the page content), not the whole layout
function scrollToCard(el) {
  for (let box = el.parentElement; box && box !== document.body; box = box.parentElement) {
    const overflow = getComputedStyle(box).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && box.scrollHeight > box.clientHeight) {
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: 'smooth' });
      return;
    }
  }
  window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3), behavior: 'smooth' });
}

// Loads FrontEnd/notification/announcement-popup.js the first time it's needed
function withAnnouncementPopup(callback) {
  if (window.showAnnouncement) { callback(); return; }
  const script = document.createElement('script');
  script.src = NOTIF_API + 'announcement-popup.js?v=20260927d';
  script.onload = callback;
  document.head.appendChild(script);
}

async function markAllNotificationsRead(e) {
  e.stopPropagation();
  try {
    await postNotif('mark_all_notifications_read.php');
    _notifCache.forEach(n => n.is_read = true);
    renderNotifBadge();
    renderNotifPanel();
  } catch (err) {}
}

function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}