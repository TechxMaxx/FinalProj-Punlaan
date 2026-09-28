/* announcement-popup.js — shows an admin announcement (broadcast) in a popup.

   Admin announcements have no page to open, so clicking one shows the
   full title + message here instead.

     showAnnouncement({ title, message, priority, created_at })

   Self-contained (own styles) so it works on every page: Notifications,
   My Account pages and the bell dropdown. */
(function () {
  'use strict';

  const STYLE = `
    .ann-overlay {
      position: fixed; inset: 0; z-index: 3000;
      background: rgba(15, 30, 22, 0.45);
      display: flex; align-items: center; justify-content: center; padding: 16px;
      animation: ann-fade 0.15s ease;
    }
    .ann-box {
      width: 100%; max-width: 440px; max-height: 85vh; overflow-y: auto;
      background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      font-family: 'Public Sans', 'Inter', system-ui, sans-serif; color: #1a2e22;
      animation: ann-pop 0.18s ease;
    }
    .ann-head { display: flex; align-items: center; gap: 12px; padding: 20px 22px 0; }
    .ann-icon {
      width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 18px;
      background: #e8f5ee; color: #2d6a4f;
    }
    .ann-icon--Promo  { background: #fff4e0; color: #b26a00; }
    .ann-icon--Urgent { background: #fdecec; color: #c0392b; }
    .ann-from { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #6b8a7a; }
    .ann-date { font-size: 12px; color: #8aa596; margin-top: 2px; }
    .ann-title { margin: 16px 22px 8px; font-size: 18px; font-weight: 800; line-height: 1.3; }
    .ann-message { margin: 0 22px; font-size: 14.5px; line-height: 1.6; color: #3d5c4a; white-space: pre-wrap; overflow-wrap: anywhere; }
    .ann-foot { padding: 20px 22px 22px; }
    .ann-ok {
      width: 100%; height: 44px; border: none; border-radius: 10px; cursor: pointer;
      background: #2d6a4f; color: #fff; font: inherit; font-weight: 700; font-size: 15px;
    }
    .ann-ok:hover { background: #1b4332; }
    @keyframes ann-fade { from { opacity: 0; } }
    @keyframes ann-pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
  `;

  const ICONS = { Urgent: 'fa-solid fa-triangle-exclamation', Promo: 'fa-solid fa-tag', Info: 'fa-solid fa-bullhorn' };

  function esc(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function niceDate(value) {
    const date = new Date(String(value || '').replace(' ', 'T'));
    if (isNaN(date)) return '';
    return date.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function ensureStyle() {
    if (document.getElementById('annPopupStyle')) return;
    const style = document.createElement('style');
    style.id = 'annPopupStyle';
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  function close() {
    document.querySelector('.ann-overlay')?.remove();
    document.removeEventListener('keydown', onKey);
  }

  function onKey(event) {
    if (event.key === 'Escape') close();
  }

  window.showAnnouncement = function (notification) {
    ensureStyle();
    close();

    const priority = ['Urgent', 'Promo'].includes(notification.priority) ? notification.priority : 'Info';
    const overlay = document.createElement('div');
    overlay.className = 'ann-overlay';
    overlay.innerHTML = `
      <div class="ann-box" role="dialog" aria-modal="true" aria-labelledby="annTitle">
        <div class="ann-head">
          <div class="ann-icon ann-icon--${priority}"><i class="${ICONS[priority]}"></i></div>
          <div>
            <div class="ann-from">Announcement from Punlaan${priority !== 'Info' ? ' · ' + priority : ''}</div>
            <div class="ann-date">${esc(niceDate(notification.created_at))}</div>
          </div>
        </div>
        <h2 class="ann-title" id="annTitle">${esc(notification.title)}</h2>
        <p class="ann-message">${esc(notification.message)}</p>
        <div class="ann-foot"><button type="button" class="ann-ok">OK</button></div>
      </div>`;

    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('.ann-ok')) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('.ann-ok').focus();
  };
})();
