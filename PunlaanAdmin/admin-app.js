async function checkAdminSession() {
    try {
        const response = await fetch(
            './admin login/admin-current-user.php',
            { credentials: 'same-origin' }
        );

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();

        if (
            !result.logged_in ||
            !result.user ||
            Number(result.user.is_admin) !== 1
        ) {
            window.location.href =
                './admin login/admin-login.html';
            return false;
        }

        // Make current admin data available to all admin modules.
        window.ADMIN_USER = result.user;

        return true;

    } catch (error) {
        console.error(
            'Admin session check failed:',
            error
        );

        window.location.href =
            './admin login/admin-login.html';

        return false;
    }
}
import { icon } from './admin-icons.js?v=20260927d';
import { renderDashboard, redrawCharts } from './admin-dashboard.js?v=20260927d';
import { loadOrders } from './admin-orders.js?v=20260927d';
import { renderCategories } from './admin-categories.js?v=20260927d';
import { loadCatalog } from './admin-catalog.js?v=20260927d';
import { loadListings } from './admin-listings.js?v=20260927d';
import { renderSettings } from './admin-settings.js?v=20260927sb';
import { loadNotifications } from './admin-notifications.js?v=20260927d';
import { loadMoney } from './admin-money.js?v=20260927sb';
import { loadReports } from './admin-reports.js?v=20260927sb';
import {
    loadVerifications,
    loadAllUsers,
    loadBlockedUsers
} from './admin-users.js?v=20260927sb';
/* ---------- Navigation ---------- */
const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', path: '#/dashboard' },
  {
    label: 'User Management', icon: 'users',
    children: [
       { label: 'Verification', icon: 'shieldCheck', path: '#/users/verification' },
  { label: 'All User Accounts', icon: 'userCheck', path: '#/users/all' },
  { label: 'Blocked Users', icon: 'ban', path: '#/users/blocked' },
],
  },
  {
    label: 'Product Management', icon: 'package',
    children: [
      { label: 'Categories & Taxonomy', icon: 'tag', path: '#/products/categories' },
      { label: 'Vendor Listings Approval', icon: 'checkSquare', path: '#/products/listings' },
      { label: 'Master Catalog', icon: 'bookOpen', path: '#/products/catalog' },
    ],
  },
  { label: 'Order Oversight', icon: 'clipboardList', path: '#/orders', expandable: true,
    children: [{ label: 'Order Overview', icon: 'clipboardList', path: '#/orders' }]
  },
  { label: 'Returns & Payouts', icon: 'alertTriangle', path: '#/money' },
  { label: 'Reports', icon: 'alertCircle', path: '#/reports' },
  { label: 'Notification Broadcast', icon: 'bell', path: '#/notifications' },
  { label: 'Settings', icon: 'settings', path: '#/settings' },
];

const openSections = new Set(['User Management', 'Product Management']);

/* ---------- Router ---------- */
export function currentPath() {
  return location.hash.replace(/^#/, '') || '/dashboard';
}

window.addEventListener('hashchange', render);

function routeToPage(path) {
  if (path === '/dashboard' || path === '/') return 'dashboard';
  if (path === '/orders') return 'orders';
  if (path.startsWith('/products/categories')) return 'categories';
  if (path.startsWith('/products/listings')) return 'listings';
  if (path.startsWith('/products/catalog')) return 'catalog';
  if (path.startsWith('/users/verification')) return 'verification';
  if (path.startsWith('/users/all')) return 'allUsers';
  if (path.startsWith('/users/blocked')) return 'blockedUsers';
  // Seller applications are reviewed in User Management → Verification
  if (path.startsWith('/vendor-applications')) return 'verification';
  if (path.startsWith('/notifications')) return 'notifications';
  if (path.startsWith('/money')) return 'money';
  if (path.startsWith('/reports')) return 'reports';
  if (path.startsWith('/settings')) return 'settings';
  return { placeholder: 'Page Not Found', subtitle: 'The page you are looking for does not exist.' };
}

/* ---------- Sidebar ---------- */
export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const path = currentPath();

  let html = `
    <button type="button" class="sidebar-logo" id="adminBrandHome" aria-label="Go to dashboard">
      <div class="sidebar-logo-icon">${icon('leaf')}</div>
      <div>
        <span class="sidebar-logo-text">Punlaan</span>
        <span class="sidebar-logo-admin">Admin</span>
      </div>
    </button>
    <nav class="sidebar-nav">
  `;

  for (const item of NAV_ITEMS) {
    if (item.path && !item.expandable) {
      const active = path === item.path.replace('#', '');
      html += `
        <a href="${item.path}" class="nav-item ${active ? 'active' : ''}">
          <span class="nav-icon">${icon(item.icon)}</span>
          ${item.label}
        </a>
      `;
    } else if (item.expandable && item.path) {
      const active = path === item.path.replace('#', '');
      const isOpen = openSections.has(item.label);
      html += `
        <div class="nav-item-group">
          <a href="${item.path}" class="nav-item ${active ? 'active' : ''}" style="flex:1">
            <span class="nav-icon">${icon(item.icon)}</span>
            ${item.label}
          </a>
          <button class="nav-section-toggle ${isOpen ? 'open' : ''}" data-section="${item.label}">
            <span class="chevron">${icon('chevronDown')}</span>
          </button>
        </div>
      `;
      if (isOpen && item.children) {
        html += '<div class="nav-children">';
        item.children.forEach((child) => {
          const ca = path.startsWith(child.path.replace('#', ''));
          html += `<a href="${child.path}" class="nav-child ${ca ? 'active' : ''}">${icon(child.icon)}${child.label}</a>`;
        });
        html += '</div>';
      }
    } else {
      const isOpen = openSections.has(item.label);
      const hasActive = item.children.some((c) => path.startsWith(c.path.replace('#', '')));
      html += `
        <button class="nav-section-header ${isOpen ? 'open' : ''} ${hasActive ? 'has-active' : ''}" data-section="${item.label}">
          <span class="nav-left">
            <span class="nav-icon">${icon(item.icon)}</span>
            ${item.label}
          </span>
          <span class="chevron">${icon('chevronRight')}</span>
        </button>
      `;
      if (isOpen) {
        html += '<div class="nav-children">';
        item.children.forEach((child) => {
          const ca = path.startsWith(child.path.replace('#', ''));
          html += `<a href="${child.path}" class="nav-child ${ca ? 'active' : ''}">${icon(child.icon)}${child.label}</a>`;
        });
        html += '</div>';
      }
    }
  }

  html += `</nav><div class="sidebar-footer">Punlaan Admin v1.0</div>`;
  sidebar.innerHTML = html;

  const brandHome = sidebar.querySelector('#adminBrandHome');
  if (brandHome) {
    brandHome.addEventListener('click', () => {
      window.location.hash = '/dashboard';
    });
  }

  sidebar.querySelectorAll('.nav-section-header').forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.section;
      if (openSections.has(s)) openSections.delete(s); else openSections.add(s);
      renderSidebar();
    });
  });

  sidebar.querySelectorAll('.nav-section-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.section;
      if (openSections.has(s)) openSections.delete(s); else openSections.add(s);
      renderSidebar();
    });
  });
}

/* ---------- Header ---------- */
export function renderHeader() {
  const header = document.getElementById('header');

  header.innerHTML = `
    <a class="header-shop-link" href="../FrontEnd/HOME.html" target="_blank" rel="noopener">
      ${icon('leaf', 15)} Open the Punlaan shop
    </a>

    <div class="header-right">
      <div class="header-bell-wrap">
        <button type="button" class="header-bell" id="adminBell" aria-label="Things waiting for review" aria-expanded="false">
          ${icon('bell')}
          <span class="bell-dot" id="adminBellDot" hidden></span>
        </button>
        <div class="header-bell-panel" id="adminBellPanel" hidden></div>
      </div>

      <div class="header-profile">
        <div class="header-profile-avatar" id="adminHeaderAvatar">A</div>

        <div class="header-profile-info">
          <p class="header-profile-name" id="adminHeaderName">Administrator</p>
          <p class="header-profile-role">${Number(window.ADMIN_USER?.is_superadmin) === 1 ? 'Super Admin' : 'Moderator'}</p>
        </div>

        <button type="button" class="header-logout" id="adminLogoutBtn">
          ${icon('logOut', 16)}
          <span>Logout</span>
        </button>
      </div>
    </div>
  `;

  loadAdminHeader();
  loadAdminBell();
}

/* Header bell: real counts of things waiting for the admin */
async function loadAdminBell() {
  const bell = document.getElementById('adminBell');
  const dot = document.getElementById('adminBellDot');
  const panel = document.getElementById('adminBellPanel');
  if (!bell || !panel) return;

  let items = [];

  try {
    const response = await fetch('get_admin_alerts.php', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (result.success) {
      items = [
        { count: result.pending_sellers, label: 'seller application(s) to review', link: '#/users/verification' },
        { count: result.pending_listings, label: 'product listing(s) to approve', link: '#/products/listings' },
        { count: result.late_orders, label: 'order(s) not packed after 2+ days', link: '#/orders' },
        { count: result.disputes, label: 'return dispute(s) to decide', link: '#/money' },
        { count: result.payouts, label: 'seller payout(s) to send', link: '#/money', superOnly: true },
        { count: result.open_reports, label: 'report(s) about products or shops', link: '#/reports' },
      ].filter((item) => item.count > 0 && (!item.superOnly || Number(window.ADMIN_USER?.is_superadmin) === 1));
    }
  } catch (error) {
    console.error('Could not load admin alerts:', error);
  }

  dot.hidden = items.length === 0;

  panel.innerHTML = `
    <p class="header-bell-title">Needs your attention</p>
    ${items.length ? items.map((item) => `
      <a class="header-bell-item" href="${item.link}">
        <strong>${item.count}</strong> ${item.label}
      </a>
    `).join('') : '<p class="header-bell-empty">All caught up — nothing to review.</p>'}
  `;

  panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    panel.hidden = true;
    bell.setAttribute('aria-expanded', 'false');
  }));

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    bell.setAttribute('aria-expanded', String(!panel.hidden));
  });
}

document.addEventListener('click', (e) => {
  const panel = document.getElementById('adminBellPanel');
  if (panel && !panel.hidden && !e.target.closest('.header-bell-wrap')) {
    panel.hidden = true;
    document.getElementById('adminBell')?.setAttribute('aria-expanded', 'false');
  }
});

async function loadAdminHeader() {
  try {
    const response = await fetch(
      './admin login/admin-current-user.php',
      {
        credentials: 'same-origin'
      }
    );

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.logged_in || !result.user) {
      window.location.href = './admin login/admin-login.html';
      return;
    }

    const user = result.user;
    const fullName =
      `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Administrator';

    const initials = fullName
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();

    const nameEl = document.getElementById('adminHeaderName');
    const avatarEl = document.getElementById('adminHeaderAvatar');

    if (nameEl) {
      nameEl.textContent = fullName;
    }

    if (avatarEl) {
      avatarEl.textContent = initials || 'A';
    }
  } catch (error) {
    console.error('Failed to load admin header:', error);
  }

  const logoutBtn = document.getElementById('adminLogoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch(
          './admin login/admin-logout.php',
          {
            method: 'POST',
            credentials: 'same-origin'
          }
        );

        const result = await response.json();

        if (result.success) {
          window.location.href = './admin login/admin-login.html';
        } else {
          alert(result.message || 'Failed to log out.');
        }
      } catch (error) {
        console.error('Logout failed:', error);
        alert('Unable to log out.');
      }
    });
  }
}

/* ---------- Placeholder ---------- */
export function renderPlaceholder(title, subtitle) {
  document.getElementById('content').innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon">${icon('construction')}</div>
      <h2 class="placeholder-title">${title}</h2>
      <p class="placeholder-sub">${subtitle || 'This section is under construction.'}</p>
    </div>
  `;
}

/* ---------- Main render ---------- */
function render() {
  renderSidebar();
  renderHeader();
  const page = routeToPage(currentPath());
  if (page === 'dashboard') renderDashboard();
  else if (page === 'orders') loadOrders();
  else if (page === 'categories') renderCategories();
  else if (page === 'listings') loadListings();
  else if (page === 'catalog') loadCatalog();
 else if (page === 'verification') loadVerifications();
  else if (page === 'allUsers') loadAllUsers();
  else if (page === 'blockedUsers') loadBlockedUsers();
  else if (page === 'notifications') loadNotifications();
  else if (page === 'money') loadMoney();
  else if (page === 'reports') loadReports();
  else if (page === 'settings') renderSettings();
  else if (page && page.placeholder) renderPlaceholder(page.placeholder, page.subtitle);
  else renderPlaceholder('Page Not Found', 'The page you are looking for does not exist.');
}

/* If the admin session expires, any admin request returns 401 → back to login */
const nativeFetch = window.fetch.bind(window);

window.fetch = async (...args) => {
  const response = await nativeFetch(...args);
  if (response.status === 401) {
    window.location.href = './admin login/admin-login.html';
  }
  return response;
};

(async () => {
    const authenticated =
        await checkAdminSession();
    if (!authenticated) {
        return;
    }
    if (!location.hash) {
        location.hash = '/dashboard';
    }
    render();
})();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (currentPath() === '/dashboard' || currentPath() === '/') {
      redrawCharts();
    }
  }, 150);
});