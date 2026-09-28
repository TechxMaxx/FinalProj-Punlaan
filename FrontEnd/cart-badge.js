/* cart-badge.js — Shows how many products are in the cart on the
 * header cart icon (every page with a link to CART.html).
 *
 * Other scripts can refresh it after changing the cart:
 *   window.updateCartBadge();        // re-fetch from the server
 *   window.updateCartBadge(3);       // set directly
 */

(function () {

  // Folder this script lives in, so the PHP path works from any page
  const BASE = document.currentScript.src.replace(/[^/]*$/, '');

  const STYLE = `
    .cart-count-badge {
      position: absolute;
      top: -6px;
      right: -9px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: #a94442;
      color: #fff;
      font: 700 0.65rem/18px 'Public Sans', sans-serif;
      text-align: center;
      box-shadow: 0 0 0 2px #fff;
      pointer-events: none;
    }
    .cart-count-badge[hidden] { display: none; }
  `;

  function badges() {

    return Array.from(
      document.querySelectorAll('header a[href$="CART.html"]')
    ).map(function (link) {

      let badge = link.querySelector('.cart-count-badge');

      if (!badge) {
        // Replace the page's old, unused placeholder badge (if any)
        link.querySelectorAll('.badge-count').forEach(function (old) { old.remove(); });

        badge = document.createElement('span');
        badge.className = 'cart-count-badge';
        badge.hidden = true;
        link.style.position = 'relative';
        link.appendChild(badge);
      }

      return { link: link, badge: badge };
    });
  }

  function show(count) {

    count = Number(count) || 0;

    badges().forEach(function (b) {
      b.badge.textContent = count > 99 ? '99+' : String(count);
      b.badge.hidden = count <= 0;
      b.link.setAttribute(
        'aria-label',
        'Shopping Cart' + (count > 0 ? ' (' + count + (count === 1 ? ' item)' : ' items)') : '')
      );
    });
  }

  async function refresh() {

    try {
      const response = await fetch(BASE + 'get_cart_count.php', {
        credentials: 'include',
        cache: 'no-store'
      });
      const result = await response.json();
      show(result.count);
    } catch (error) {
      console.error('Could not load cart count:', error);
    }
  }

  window.updateCartBadge = function (count) {
    if (count === undefined) {
      refresh();
    } else {
      show(count);
    }
  };

  function init() {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
