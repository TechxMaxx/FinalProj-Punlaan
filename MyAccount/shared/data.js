/* data.js — the signed-in user for the dashboard layout.
 * Everything else on these pages comes from the database (PHP files);
 * the old sample orders / products / notifications were removed. */

/** Current signed-in user profile from the real PHP session. */
function getSessionProfile() {

  if (!CURRENT_USER) {
    return {
      full_name: 'Guest',
      email: '',
      is_vendor: false,
      avatar_url: '',
    };
  }

  return {
    user_id: CURRENT_USER.user_id,

    full_name:
      `${CURRENT_USER.first_name || ''} ${CURRENT_USER.last_name || ''}`.trim()
      || 'User',

    email: CURRENT_USER.email || '',

    is_vendor:
      Number(CURRENT_USER.is_vendor) === 1,

    // Uploaded photos are stored relative to the project root (uploads/…);
    // these pages live two folders down (MyAccount/customer|vendor/).
    avatar_url:
      CURRENT_USER.profile_picture
        ? (/^(https?:|data:|\/)/.test(CURRENT_USER.profile_picture)
            ? CURRENT_USER.profile_picture
            : '../../' + CURRENT_USER.profile_picture)
        : '',
  };
}

/* ---------- small helpers shared by the dashboard pages ---------- */

/** ★★★★☆ — rating 0–5 (halves round to the nearest star) */
function starsHtml(rating) {
  const full = Math.round(Number(rating) || 0);
  let html = '<span class="stars" aria-label="' + (Number(rating) || 0).toFixed(1) + ' out of 5 stars">';
  for (let i = 1; i <= 5; i++) html += `<span class="${i <= full ? '' : 'star--off'}">★</span>`;
  return html + '</span>';
}

function formatPeso(value) {
  return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** POST JSON and return the parsed answer */
async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  return response.json();
}

/** Opens a dialog in #modalRoot (or the body). Returns the overlay element. */
function openDialog({ title, sub = '', body = '', actions = '' }) {
  closeDialog();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'pdialogOverlay';
  overlay.innerHTML = `
    <div class="pdialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="pdialog__head">
        <div>
          <div class="pdialog__title">${escapeHtml(title)}</div>
          ${sub ? `<div class="pdialog__sub">${sub}</div>` : ''}
        </div>
        <button type="button" class="modal__close" aria-label="Close" onclick="closeDialog()">×</button>
      </div>
      <div class="pdialog__body">${body}<div class="pdialog__error" id="pdialogError" hidden></div></div>
      <div class="pdialog__foot">${actions}</div>
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });
  (document.getElementById('modalRoot') || document.body).appendChild(overlay);
  setTimeout(() => overlay.querySelector('input, textarea, select, .star-picker button')?.focus(), 30);
  return overlay;
}

function closeDialog() {
  document.getElementById('pdialogOverlay')?.remove();
}

function dialogError(message) {
  const el = document.getElementById('pdialogError');
  if (!el) return showToast(message, true);
  el.textContent = message;
  el.hidden = !message;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDialog();
});
