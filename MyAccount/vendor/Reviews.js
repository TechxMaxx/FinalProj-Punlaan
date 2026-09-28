/* =========================================================
   REVIEWS (seller) — what buyers said about your products.
   Replies are public: they show under the review on the
   product page and your shop page.
   ../vendor_php/reviews.php
========================================================= */

const REVIEWS_API = '../vendor_php/reviews.php';

let reviewData = null;
let reviewFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {

  const user = await getCurrentUser();

  if (!user) {
    window.location.replace('../../register/Login.html');
    return;
  }

  document.getElementById('app').innerHTML = renderLayout('reviews');

  if (Number(user.is_vendor) !== 1) {
    document.getElementById('pageContent').innerHTML = '<div class="empty-state">Only sellers receive reviews.</div>';
    return;
  }

  document.getElementById('pageContent').innerHTML = '<div class="loading">Loading reviews…</div>';
  loadReviews();
});


async function loadReviews() {
  try {
    const response = await fetch(REVIEWS_API, { credentials: 'same-origin', cache: 'no-store' });
    reviewData = await response.json();
    if (!reviewData.success) throw new Error(reviewData.message);
    renderReviews();
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state">Could not load reviews. ${escapeHtml(err.message || '')}</div>`;
  }
}

function productSrc(path) {
  if (!path) return '../../FrontEnd/products/no_photo.jpg';
  return /^(https?:|\/|\.\.\/)/.test(path) ? path : '../../FrontEnd/' + path;
}

function renderReviews() {
  const d = reviewData;

  const list = d.reviews.filter(r =>
    reviewFilter === 'all' ? true
    : reviewFilter === 'unanswered' ? !r.seller_reply
    : r.rating === Number(reviewFilter));

  const bars = [5, 4, 3, 2, 1].map(n => {
    const c = d.breakdown[n] || 0;
    const pct = d.count ? Math.round((c / d.count) * 100) : 0;
    return `<div class="vrev__bar"><span>${n}★</span><span class="vrev__track"><span style="width:${pct}%"></span></span><span>${c}</span></div>`;
  }).join('');

  document.getElementById('pageContent').innerHTML = `
    <div class="vrev">
      <div class="vrev__summary">
        <div class="vrev__avg">
          <div class="vrev__avg-num">${d.count ? d.average.toFixed(1) : '—'}</div>
          ${starsHtml(d.average)}
          <div class="vrev__avg-sub">${d.count} review${d.count === 1 ? '' : 's'} · ${d.unanswered} without a reply</div>
        </div>
        <div class="vrev__bars">${bars}</div>
      </div>

      <div class="toolbar">
        <div class="toolbar__title">Reviews</div>
        <div class="filters">
          ${[['all', 'All'], ['unanswered', 'No reply yet'], ['5', '5★'], ['4', '4★'], ['3', '3★'], ['2', '2★'], ['1', '1★']].map(([k, label]) => `
            <button class="filter-btn${reviewFilter === k ? ' filter-btn--active' : ''}" onclick="setReviewFilter('${k}')">${label}</button>`).join('')}
        </div>
      </div>

      ${list.length ? list.map(r => `
        <div class="vrev__card" data-review-id="${Number(r.review_id)}">
          <img class="vrev__thumb" src="${escapeHtml(productSrc(r.product_image))}" alt="" onerror="this.style.visibility='hidden'">
          <div class="vrev__body">
            <div class="vrev__top">
              <strong>${escapeHtml(r.product_name || 'Product')}</strong>
              <span class="vrev__date">${formatDate(r.created_at)}</span>
            </div>
            <div class="vrev__who">${starsHtml(r.rating)} <span>${escapeHtml(r.customer)}</span></div>
            ${r.comment ? `<p class="vrev__text">${escapeHtml(r.comment)}</p>` : '<p class="vrev__text vrev__text--empty">No comment.</p>'}

            <div class="vrev__reply" id="reply-${r.review_id}">
              ${r.seller_reply ? `
                <div class="vrev__reply-text"><strong>Your reply:</strong> ${escapeHtml(r.seller_reply)}</div>
                <button class="btn btn--ghost" onclick="editReply(${r.review_id})">Edit reply</button>` : `
                <button class="btn btn--primary" onclick="editReply(${r.review_id})">Reply</button>`}
            </div>
          </div>
        </div>`).join('')
        : `<div class="empty-state">${d.count ? 'No reviews match this filter.' : 'No reviews yet. Buyers can rate items after they\'re delivered.'}</div>`}
    </div>`;

  // Opened from a notification → scroll to that review
  highlightLinked();
}

function setReviewFilter(k) {
  reviewFilter = k;
  renderReviews();
}

function editReply(reviewId) {
  const r = reviewData.reviews.find(x => x.review_id === reviewId);
  const box = document.getElementById('reply-' + reviewId);
  if (!r || !box) return;

  box.innerHTML = `
    <textarea class="vrev__input" id="replyText-${reviewId}" maxlength="1000"
      placeholder="Thank the buyer or explain what you'll improve. Everyone can read your reply.">${escapeHtml(r.seller_reply || '')}</textarea>
    <div class="vrev__reply-actions">
      <button class="btn btn--ghost" onclick="renderReviews()">Cancel</button>
      <button class="btn btn--primary" id="saveReply-${reviewId}">Post reply</button>
    </div>`;

  document.getElementById('replyText-' + reviewId).focus();
  document.getElementById('saveReply-' + reviewId).addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const result = await postJson(REVIEWS_API, {
        review_id: reviewId,
        reply: document.getElementById('replyText-' + reviewId).value
      });
      if (!result.success) throw new Error(result.message);
      showToast(result.message);
      loadReviews();
    } catch (err) {
      showToast(err.message || 'Could not save your reply.', true);
      btn.disabled = false;
    }
  });
}
