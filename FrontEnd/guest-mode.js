/* guest-mode.js — Lets visitors browse without an account.
 *
 * Load it in the <head> of public pages (Home, Marketplace, Detail,
 * Shop, About Us). For visitors who are not logged in it:
 *   - swaps the cart / saved / bell / profile icons in the header
 *     for "Log in" and "Register" buttons
 *   - sends clicks on account-only links (Cart, Saved Plants,
 *     Notifications, Profile, Start Selling) to the Login page,
 *     then back to where they were going after signing in
 *
 * Other scripts can use:
 *   window.punlaanSession          // Promise → session.php result
 *   window.requireLogin(nextUrl)   // go to Login, return to nextUrl
 */

(function () {

  // Folder this script lives in (FrontEnd/), so paths work from any page
  const BASE = document.currentScript.src.replace(/[^/]*$/, '');
  const REGISTER_DIR = new URL('../register/', BASE).href;

  // Links that need an account
  const ACCOUNT_ONLY = /(CART\.html|CHECKOUT\.html|SavedPlants\.html|NOTIFICATION\.html|Profile\.html|MyOrders\.html|Messages\.html)/i;

  // Hide the header icons until we know who is visiting (avoids a flash)
  const earlyStyle = document.createElement('style');
  earlyStyle.textContent = 'html:not(.session-ready) header nav.secondary { visibility: hidden; }';
  document.head.appendChild(earlyStyle);

  // Path + query + hash of a URL on this site, used as the "next" page
  function sitePath(url) {
    const u = new URL(url || window.location.href, window.location.href);
    return u.pathname + u.search + u.hash;
  }

  function authUrl(page, next) {
    return REGISTER_DIR + page + '?next=' + encodeURIComponent(sitePath(next));
  }

  window.requireLogin = function (next) {
    window.location.href = authUrl('Login.html', next);
  };

  window.punlaanSession = fetch(REGISTER_DIR + 'session.php', {
    credentials: 'include',
    cache: 'no-store'
  })
    .then(function (response) { return response.json(); })
    .catch(function () { return { logged_in: false }; });

  const STYLE = `
    .guest-auth {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .guest-auth a {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border: 1.5px solid #28512F;
      border-radius: 999px;
      font: 600 0.85rem/1.2 'Public Sans', sans-serif;
      color: #28512F;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.2s, color 0.2s;
    }
    .guest-auth a:hover { background: #eef4ee; }
    .guest-auth a.guest-auth__primary { background: #28512F; color: #fff; }
    .guest-auth a.guest-auth__primary:hover { background: #1e3e24; }
    @media (max-width: 600px) {
      .guest-auth { gap: 6px; }
      .guest-auth a { padding: 6px 12px; font-size: 0.8rem; }
    }
  `;

  function showGuestHeader() {

    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    document.querySelectorAll('header nav.secondary').forEach(function (nav) {

      // Page CSS sets display on these, so the hidden attribute alone isn't enough
      Array.from(nav.children).forEach(function (child) { child.style.display = 'none'; });

      const box = document.createElement('div');
      box.className = 'guest-auth';

      const login = document.createElement('a');
      login.href = authUrl('Login.html');
      login.textContent = 'Log in';

      const register = document.createElement('a');
      register.href = authUrl('Register.html');
      register.className = 'guest-auth__primary';
      register.textContent = 'Register';

      box.append(login, register);
      nav.appendChild(box);
    });

    // Account-only links → Login first, then continue to that page
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href]');
      if (!link || !ACCOUNT_ONLY.test(link.getAttribute('href'))) return;
      e.preventDefault();
      window.requireLogin(link.href);
    }, true);
  }

  function init() {
    window.punlaanSession.then(function (session) {
      document.documentElement.classList.toggle('is-guest', !session.logged_in);
      if (!session.logged_in) {
        showGuestHeader();
      } else if (session.first_name) {
        // Pages that never fill in the name still show the "username" placeholder
        document.querySelectorAll('header .profile-container span').forEach(function (span) {
          if (span.textContent.trim().toLowerCase() === 'username') span.textContent = session.first_name;
        });
      }
      document.documentElement.classList.add('session-ready');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
