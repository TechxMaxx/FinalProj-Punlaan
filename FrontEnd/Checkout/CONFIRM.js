/* =========================================================
   CONFIRM.JS — Order placed / payment page
   CONFIRM.html?order_id=123

   Cash on delivery → confirmation.
   GCash / Maya / card → pay step, then confirmation:
     - PayMongo keys set  → PayMongo's payment page
       (paymongo_checkout.php), checked on return (paymongo_verify.php)
     - no keys yet        → TEST MODE button (pay_order.php)
========================================================= */

(function () {

  'use strict';

  const page = document.getElementById('confirmPage');
  const params = new URLSearchParams(location.search);
  const orderId = params.get('order_id');
  // Set by PayMongo when the customer comes back: done | cancelled
  const returnedFrom = params.get('paymongo');
  let verified = false;

  const METHODS = {
    cod: { label: 'Cash on Delivery', icon: '<i class="fa-solid fa-money-bill-wave"></i>', color: '#2e7d32' },
    gcash: { label: 'GCash', icon: '<img src="img/gcash.png" alt="">', color: '#297bfa' },
    maya: { label: 'Maya', icon: '<img src="img/maya.jpg" alt="">', color: '#000' },
    card: { label: 'Credit / Debit Card', icon: '<i class="fa-regular fa-credit-card"></i>', color: '#1a1f71' }
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function peso(value) {
    return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function niceDate(ymd) {
    const d = new Date(ymd + 'T00:00:00');
    return isNaN(d) ? ymd : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }

  function message(html) {
    page.innerHTML = `<div class="section-card confirm-loading">${html}</div>`;
  }


  async function load() {

    if (!orderId) {
      message('No order was selected. <a href="../../MyAccount/customer/MyOrders.html">View my orders</a>');
      return;
    }

    try {
      const response = await fetch('get_order_summary.php?order_id=' + encodeURIComponent(orderId), {
        credentials: 'include',
        cache: 'no-store'
      });
      const result = await response.json();

      if (result.logged_in === false) {
        location.href = '../../register/Login.html?next=' + encodeURIComponent(location.pathname + location.search);
        return;
      }

      if (!result.success) {
        message(esc(result.message || 'Order not found.') + ' <a href="../../MyAccount/customer/MyOrders.html">View my orders</a>');
        return;
      }

      const o = result.order;

      // Back from PayMongo (or reopened later): ask PayMongo once whether it's paid
      if (!verified && result.gateway !== 'test' && o.payment_method !== 'cod' && o.payment_status === 'unpaid') {
        verified = true;
        message('<i class="fa-solid fa-spinner fa-spin"></i> Checking your payment…');
        try {
          const check = await (await fetch('paymongo_verify.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: o.order_id })
          })).json();
          if (check.paid) return load();
        } catch (e) { /* show the pay button again */ }
      }

      render(o, result.items, result.gateway, result.shipments || []);

    } catch (error) {
      message('Could not load your order. Please refresh the page.');
    }
  }


  function render(order, items, gateway, shipments) {

    const method = METHODS[order.payment_method] || METHODS.cod;
    const needsPayment = order.payment_method !== 'cod' && order.payment_status !== 'paid' && order.status !== 'cancelled';
    const paid = order.payment_status === 'paid';

    const [recipient, phone, address] = String(order.shipping_address || '').split(' | ');

    let headline;
    if (needsPayment) {
      headline = `
        <span class="confirm-hero__icon confirm-hero__icon--pay"><i class="fa-solid fa-wallet"></i></span>
        <h1>Almost done — pay for your order</h1>
        <p>Your order <strong>${esc(order.order_number)}</strong> is reserved. Complete the payment below.</p>`;
    } else {
      headline = `
        <span class="confirm-hero__icon"><i class="fa-solid fa-check"></i></span>
        <h1>Thank you! Your order is placed.</h1>
        <p>Order <strong>${esc(order.order_number)}</strong> · Estimated delivery
           <strong>${niceDate(order.delivery_start)} – ${niceDate(order.delivery_end)}</strong></p>`;
    }

    page.innerHTML = `
      <div class="confirm-hero section-card">${headline}</div>

      <div class="confirm-grid">

        <div class="section-card">
          <div class="section-label"><i class="fa-solid fa-box"></i> ITEMS</div>
          <div class="confirm-items">
            ${items.map((item) => `
              <div class="confirm-item">
                <img src="../${esc(item.image || 'products/no_photo.jpg')}" alt="" onerror="this.onerror=null;this.src='../products/no_photo.jpg'">
                <div class="confirm-item__text">
                  <strong>${esc(item.name)}</strong>
                  <small>${esc(item.vendor || '')} · Qty ${item.quantity}</small>
                </div>
                <span>${peso(item.total)}</span>
              </div>
            `).join('')}
          </div>

          <div class="section-label" style="margin-top:18px"><i class="fa-solid fa-location-dot"></i> DELIVER TO</div>
          <p class="confirm-address">
            <strong>${esc(recipient || '')}</strong> ${phone ? '· ' + esc(phone) : ''}<br>
            ${esc(address || '')}
          </p>
        </div>

        <div class="section-card">
          <div class="section-label"><i class="fa-solid fa-receipt"></i> PAYMENT</div>

          <div class="confirm-method">
            <span class="pay-option__icon ${method.icon.length === 1 ? 'pay-option__icon--text' : ''}" style="background:${method.color}">${method.icon}</span>
            <div>
              <strong>${method.label}</strong>
              <small class="confirm-status confirm-status--${paid ? 'paid' : (order.payment_status === 'refunded' ? 'refunded' : 'unpaid')}">
                ${paid ? 'Paid'
                  : order.payment_status === 'refunded' ? 'Refunded (order cancelled)'
                  : order.status === 'cancelled' ? 'Order cancelled'
                  : order.payment_method === 'cod' ? 'Pay the rider on delivery' : 'Waiting for payment'}
              </small>
            </div>
          </div>

          <div class="summary-row"><span>Subtotal</span><span>${peso(order.subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span>${peso(order.shipping_fee)}</span></div>
          ${shipments.map((s) => `
            <div class="shipping-breakdown__row">
              <span>${esc(s.vendor || 'Seller')}${s.from ? ' · from ' + esc(s.from) : ''}${s.zone ? ' · ' + esc(s.zone) : s.distance_km != null ? ' · ' + s.distance_km + ' km' : ''}</span>
              <span>${peso(s.fee)}</span>
            </div>`).join('')}
          <div class="summary-row summary-row--total"><span>Total</span><span class="total-amount">${peso(order.total_amount)}</span></div>

          ${needsPayment ? `
            <div class="confirm-pay">
              ${returnedFrom === 'cancelled' ? `
                <p class="place-order-error" role="alert">The payment was cancelled. You can try again below.</p>` : ''}
              ${gateway === 'test' ? `
                <p class="confirm-test">
                  <i class="fa-solid fa-flask"></i>
                  <span><strong>Test mode</strong> — no real money is charged. Online payments
                  switch to PayMongo once its keys are added.</span>
                </p>` : gateway === 'paymongo_test' ? `
                <p class="confirm-test">
                  <i class="fa-solid fa-flask"></i>
                  <span><strong>PayMongo test mode</strong> — you'll see PayMongo's payment page,
                  but no real money is charged.</span>
                </p>` : `
                <p class="confirm-test confirm-test--secure">
                  <i class="fa-solid fa-lock"></i>
                  <span>You'll pay securely on PayMongo's page, then come back here.</span>
                </p>`}
              <button type="button" class="btn btn-checkout btn-lg w-100" id="payNowBtn">
                Pay ${peso(order.total_amount)} with ${method.label}
              </button>
              <p class="place-order-error" id="payError" role="alert" hidden></p>
              <p class="summary-terms">You can also pay later from <a href="../../MyAccount/customer/MyOrders.html">My Orders</a>.</p>
            </div>
          ` : ''}

          <div class="confirm-actions">
            <a class="btn btn-outline-success" href="../../MyAccount/customer/MyOrders.html">View my orders</a>
            <a class="btn btn-link" href="../MARKETPLACE.html">Continue shopping</a>
          </div>
        </div>

      </div>
    `;

    const payBtn = document.getElementById('payNowBtn');
    if (payBtn) payBtn.addEventListener('click', () => pay(order, method, payBtn, gateway));
  }


  async function pay(order, method, btn, gateway) {

    const errorBox = document.getElementById('payError');
    errorBox.hidden = true;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' +
      (gateway === 'test' ? 'Processing ' + method.label + ' payment…' : 'Opening the payment page…');

    // PayMongo: go to its payment page (it sends the customer back here)
    if (gateway !== 'test') {
      try {
        const response = await fetch('paymongo_checkout.php', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.order_id })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Could not open the payment page.');
        location.href = result.checkout_url;
      } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Pay ' + peso(order.total_amount) + ' with ' + method.label;
      }
      return;
    }

    try {
      // Short pause so it feels like a payment step
      await new Promise((r) => setTimeout(r, 900));

      const response = await fetch('pay_order.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.order_id })
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message || 'Payment failed.');

      load();

    } catch (error) {
      errorBox.textContent = error.message || 'Payment failed. Please try again.';
      errorBox.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Pay ' + peso(order.total_amount) + ' with ' + method.label;
    }
  }

  load();

})();
