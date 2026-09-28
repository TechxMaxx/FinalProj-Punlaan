(function () {

  'use strict';


  /* =========================================================
     DOM ELEMENTS
  ========================================================= */

  const orderContainer =
    document.getElementById(
      'checkoutOrderContainer'
    );


  const orderTotalEl =
    document.getElementById(
      'checkoutOrderTotal'
    );


  const itemCountEl =
    document.getElementById(
      'checkoutItemCount'
    );


  const itemPluralEl =
    document.getElementById(
      'checkoutItemPlural'
    );


  const checkoutDelivery =
    document.getElementById(
      'checkoutDelivery'
    );


  const changeAddressBtn =
    document.getElementById(
      'changeAddressBtn'
    );


  /* Delivery address chosen from the address book */
  let selectedAddress = null;


  /* Shipping is per seller, by item size + zone (worked out by get_checkout.php
     for the chosen address — the same amounts place_order.php charges) */
  let orderTotal = 0;

  function formatPeso(value) {
    return '₱' + Number(value || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }


  /* =========================================================
     PAYMENT METHOD
  ========================================================= */

  const payNote =
    document.getElementById('payNote');

  const placeOrderError =
    document.getElementById('placeOrderError');

  function selectedPaymentMethod() {
    const checked = document.querySelector('input[name="payment_method"]:checked');
    return checked ? checked.value : 'cod';
  }

  function updatePlaceOrderLabel() {
    const btn = document.getElementById('placeOrderBtn');
    if (!btn || btn.disabled) return;

    const method = selectedPaymentMethod();

    btn.textContent = method === 'cod'
      ? 'Place Order' + (orderTotal ? ' · ' + formatPeso(orderTotal) : '')
      : 'Place Order & Pay' + (orderTotal ? ' · ' + formatPeso(orderTotal) : '');

    if (payNote) payNote.hidden = method === 'cod';
  }

  document.querySelectorAll('input[name="payment_method"]').forEach(function (radio) {
    radio.addEventListener('change', updatePlaceOrderLabel);
  });

  function showPlaceOrderError(message) {
    if (!placeOrderError) return;
    placeOrderError.textContent = message;
    placeOrderError.hidden = false;
  }


  const placeOrderBtn =
    document.getElementById(
      'placeOrderBtn'
    );


  const usernameDisplay =
    document.getElementById(
      'usernameDisplay'
    );


  /* =========================================================
     CHECK LOGIN SESSION
     
     CHECKOUT is inside /FrontEnd/Checkout/
  ========================================================= */

  async function checkSession() {

    try {

      const response =
        await fetch(
          '../../register/session.php',
          {
            method: 'GET',

            credentials: 'include',

            cache: 'no-store'
          }
        );


      if (!response.ok) {

        throw new Error(
          'Session request failed: ' +
          response.status
        );

      }


      const result =
        await response.json();


      console.log(
        'Checkout session:',
        result
      );


      /* =====================================================
         NOT LOGGED IN
      ===================================================== */

      if (!result.logged_in) {

        window.location.href =
          '../../register/Login.html';

        return false;

      }


      /* =====================================================
         DISPLAY USER NAME
      ===================================================== */

      if (usernameDisplay) {

        let fullName = '';


        /* FIRST NAME */

        if (result.first_name) {

          fullName =
            String(
              result.first_name
            ).trim();

        }


        /* LAST NAME */

        if (result.last_name) {

          if (fullName) {

            fullName += ' ';

          }

          fullName +=
            String(
              result.last_name
            ).trim();

        }


        /* OTHER POSSIBLE SESSION FIELDS */

        if (
          !fullName &&
          result.full_name
        ) {

          fullName =
            String(
              result.full_name
            ).trim();

        }


        if (
          !fullName &&
          result.name
        ) {

          fullName =
            String(
              result.name
            ).trim();

        }


        if (
          !fullName &&
          result.username
        ) {

          fullName =
            String(
              result.username
            ).trim();

        }


        if (
          !fullName &&
          result.email
        ) {

          fullName =
            String(
              result.email
            ).trim();

        }


        /* FINAL FALLBACK */

        if (!fullName) {

          fullName = 'User';

        }


        usernameDisplay.textContent =
          fullName;

      }


      return true;


    } catch (error) {

      console.error(
        'Unable to check login session:',
        error
      );


      window.location.href =
        '../../register/Login.html';


      return false;

    }

  }


  /* =========================================================
     LOAD CHECKOUT DATA
  ========================================================= */

  async function loadCheckout() {

    try {

      const response =
        await fetch(
          'get_checkout.php?address_id=' +
          encodeURIComponent(selectedAddress ? selectedAddress.address_id : 0),
          {
            method: 'GET',

            credentials: 'include',

            cache: 'no-store'
          }
        );


      if (!response.ok) {

        throw new Error(
          'Server returned ' +
          response.status
        );

      }


      const result =
        await response.json();


      console.log(
        'Checkout data:',
        result
      );


      /* =====================================================
         LOGIN CHECK
      ===================================================== */

      if (
        result.logged_in === false
      ) {

        window.location.href =
          '../../register/Login.html';

        return;

      }


      /* =====================================================
         SERVER ERROR
      ===================================================== */

      if (!result.success) {

        showCheckoutError(
          result.message ||
          'Unable to load checkout.'
        );

        return;

      }


      /* =====================================================
         ITEMS
      ===================================================== */

      const items =
        Array.isArray(result.items)
          ? result.items
          : [];


      if (items.length === 0) {

        showCheckoutError(
          'No items were selected for checkout.'
        );

        return;

      }


      /* =====================================================
         GROUP BY SELLER (each seller ships separately)
      ===================================================== */

      const shipments = {};

      (result.shipments || []).forEach(function (s) {
        shipments[s.vendor_id] = s;
      });

      const groupedItems =
        items.reduce(
          function (
            groups,
            item
          ) {

            const key =
              String(item.vendor_id);


            if (!groups[key]) {

              groups[key] =
                [];

            }


            groups[key].push(
              item
            );


            return groups;

          },
          {}
        );


      /* =====================================================
         RENDER ITEMS
      ===================================================== */

      let totalQuantity =
        0;


      let grandTotal =
        0;


      orderContainer.innerHTML =
        '';


      Object.entries(
        groupedItems
      ).forEach(
        function (
          [vendorId, vendorItems]
        ) {

          const vendor =
            vendorItems[0].vendor ||
            'Seller';

          const ship =
            shipments[vendorId] || {};

          let groupHtml = `

            <div class="order-block">

              <div class="order-heading">

                <div>
                  Product Order
                </div>

                <div class="text-center">
                  Unit Price
                </div>

                <div class="text-center">
                  Quantity
                </div>

                <div class="text-center">
                  Total Price
                </div>

              </div>

              <div class="company-row text-uppercase">
                ${escapeHTML(vendor)}
              </div>

          `;


          vendorItems.forEach(
            function (item) {

              const price =
                Number(item.price) || 0;


              const quantity =
                Number(item.quantity) || 0;


              const productTotal =
                Number(item.total) || 0;


              totalQuantity +=
                quantity;


              grandTotal +=
                productTotal;


              groupHtml += `

                <div class="product-row">

                  <div class="d-flex align-items-center gap-3">

                    <div class="product-image">

                      <img
                        src="${escapeHTML(item.image)}"
                        alt="${escapeHTML(item.name)}"
                        onerror="this.onerror=null; this.src='../products/no_photo.jpg';"
                      >

                    </div>

                    <div>

                      <p class="product-title">
                        ${escapeHTML(item.name)}
                      </p>

                    </div>

                  </div>


                  <div class="product-price">

                    ₱${price.toLocaleString(
                      'en-PH',
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }
                    )}

                  </div>


                  <div class="product-quantity">

                    ${quantity}

                  </div>


                  <div class="product-total">

                    ₱${productTotal.toLocaleString(
                      'en-PH',
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }
                    )}

                  </div>

                </div>

              `;

            }
          );


          groupHtml += `
              <div class="ship-line">
                <span>
                  <i class="fa-solid fa-truck-fast"></i>
                  Ships from <strong>${escapeHTML(ship.from || 'the seller')}</strong>
                  ${shipDistanceText(ship)}
                </span>
                <span class="ship-line__fee">
                  ${ship.fee == null ? 'Choose an address' : ship.free ? 'FREE' : formatPeso(ship.fee)}
                </span>
              </div>
              ${freeShipText(ship)}
            </div>
          `;


          orderContainer.insertAdjacentHTML(
            'beforeend',
            groupHtml
          );

        }
      );


      /* =====================================================
         DISPLAY TOTALS
      ===================================================== */

      // Items + each seller's shipping (the same total place_order.php charges)
      const subtotalEl =
        document.getElementById('checkoutSubtotal');

      if (subtotalEl) {
        subtotalEl.textContent = formatPeso(grandTotal);
      }

      const shippingTotal =
        Number(result.shipping_total) || 0;

      const shippingKnown =
        (result.shipments || []).every(function (s) { return s.fee != null; });

      const shippingEl =
        document.getElementById('checkoutShipping');

      if (shippingEl) {
        shippingEl.textContent = shippingKnown ? formatPeso(shippingTotal) : '—';
      }

      const breakdown =
        document.getElementById('shippingBreakdown');

      if (breakdown) {
        breakdown.innerHTML = (result.shipments || []).length > 1 && shippingKnown
          ? result.shipments.map(function (s) {
              return `<div class="shipping-breakdown__row"><span>${escapeHTML(s.vendor)}</span><span>${formatPeso(s.fee)}</span></div>`;
            }).join('')
          : '';
      }

      orderTotal =
        grandTotal + shippingTotal;

      orderTotalEl.textContent =
        formatPeso(orderTotal);

      updatePlaceOrderLabel();


      itemCountEl.textContent =
        totalQuantity;


      itemPluralEl.textContent =
        totalQuantity === 1
          ? ''
          : 's';


    } catch (error) {

      console.error(
        'Could not load checkout:',
        error
      );


      showCheckoutError(
        'Unable to connect to the checkout service.'
      );

    }

  }


  /* =========================================================
     DELIVERY ADDRESS (address book)
  ========================================================= */

  async function loadDeliveryAddress() {

    try {

      const addresses =
        await AddressBook.load();

      // Default address first; skip old free-text ones that need updating
      selectedAddress =
        addresses.find(function (a) { return a.is_default && a.city_code; }) ||
        addresses.find(function (a) { return a.city_code; }) ||
        null;

      renderDelivery(addresses.length);

    } catch (error) {

      console.error('Could not load addresses:', error);

      checkoutDelivery.innerHTML =
        '<span class="text-danger">Could not load your addresses. Please refresh the page.</span>';

    }

  }


  function renderDelivery(savedCount) {

    changeAddressBtn.hidden =
      false;

    if (!selectedAddress) {

      changeAddressBtn.textContent =
        savedCount ? 'Choose' : 'Add address';

      checkoutDelivery.innerHTML = `
        <div class="delivery-empty">
          <i class="fa-solid fa-circle-exclamation"></i>
          ${savedCount
            ? 'Choose a delivery address (or update your saved one) before placing your order.'
            : 'Add a delivery address before placing your order.'}
        </div>`;

      return;

    }

    changeAddressBtn.textContent =
      'Change';

    const a = selectedAddress;

    checkoutDelivery.innerHTML = `
      <div class="delivery-who">
        <strong>${escapeHTML(a.recipient_name)}</strong>
        <span>${escapeHTML(AddressBook.formatPhone(a.phone))}</span>
      </div>
      <div class="delivery-address">
        ${escapeHTML(a.full_address)}
        <span class="delivery-tag">${escapeHTML(a.label)}</span>
        ${a.is_default ? '<span class="delivery-tag delivery-tag--default">Default</span>' : ''}
      </div>`;

  }


  if (changeAddressBtn) {

    changeAddressBtn.addEventListener(
      'click',
      async function () {

        const chosen =
          await AddressBook.openPicker(
            selectedAddress ? selectedAddress.address_id : null
          );

        const before =
          selectedAddress ? selectedAddress.address_id : null;

        if (chosen) {

          selectedAddress =
            chosen;

          renderDelivery(1);

        } else {

          // Closed without choosing — addresses may still have been added/edited
          const list =
            await AddressBook.load();

          const kept =
            selectedAddress &&
            list.find(function (x) { return x.address_id === selectedAddress.address_id; });

          selectedAddress =
            kept ||
            list.find(function (a) { return a.is_default && a.city_code; }) ||
            list.find(function (a) { return a.city_code; }) ||
            null;

          renderDelivery(list.length);

        }

        // Shipping depends on the address → recalculate
        // (also when the same address was edited, e.g. a new map pin)
        if (selectedAddress || before) {
          loadCheckout();
        }

      }
    );

  }


  /* "· Same province" under each seller (how far the buyer is) */
  function shipDistanceText(ship) {

    if (ship.fee == null || !ship.zone) return '';

    return '· ' + escapeHTML(ship.zone);
  }

  /* The seller's free-shipping offer: reached, or how much more to add */
  function freeShipText(ship) {

    if (ship.free) {
      return `<div class="ship-free ship-free--ok"><i class="fa-solid fa-gift"></i>
        Free shipping from this shop${ship.regular_fee ? ` <s>${formatPeso(ship.regular_fee)}</s>` : ''}</div>`;
    }

    if (ship.add_for_free != null && ship.add_for_free > 0) {
      return `<div class="ship-free"><i class="fa-solid fa-gift"></i>
        Add <strong>${formatPeso(ship.add_for_free)}</strong> more from this shop for free shipping</div>`;
    }

    return '';
  }


  /* =========================================================
     PLACE ORDER
  ========================================================= */

  if (placeOrderBtn) {

    placeOrderBtn.addEventListener(
      'click',
      async function () {

        if (!selectedAddress) {

          changeAddressBtn.click();

          return;

        }


        if (placeOrderError) {
          placeOrderError.hidden = true;
        }

        const paymentMethod =
          selectedPaymentMethod();


        placeOrderBtn.disabled =
          true;


        placeOrderBtn.textContent =
          'PLACING ORDER...';


        try {

          const response =
            await fetch(
              'place_order.php',
              {
                method: 'POST',

                credentials: 'include',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify({
                    address_id:
                      selectedAddress.address_id,
                    payment_method:
                      paymentMethod
                  })
              }
            );


          if (!response.ok) {

            throw new Error(
              'Server returned ' +
              response.status
            );

          }


          const result =
            await response.json();


          console.log(
            'Place order response:',
            result
          );


          /* =================================================
             LOGIN CHECK
          ================================================= */

          if (
            result.logged_in === false
          ) {

            window.location.href =
              '../../register/Login.html';

            return;

          }


          /* =================================================
             TRANSACTION FAILED
          ================================================= */

          if (!result.success) {

            showPlaceOrderError(
              result.message ||
              'Could not place your order.'
            );

            placeOrderBtn.disabled = false;
            updatePlaceOrderLabel();

            return;

          }


          /* =================================================
             SUCCESS → confirmation page
             (online methods pay there)
          ================================================= */

          if (window.updateCartBadge) {
            window.updateCartBadge();
          }

          window.location.href =
            'CONFIRM.html?order_id=' +
            encodeURIComponent(result.order_id);


        } catch (error) {

          console.error(
            'Place order failed:',
            error
          );


          showPlaceOrderError(
            'Unable to place your order. Please check your connection and try again.'
          );

          placeOrderBtn.disabled = false;
          updatePlaceOrderLabel();

        }

      }
    );

  }


  /* =========================================================
     FORMAT DELIVERY DATE
  ========================================================= */

  function formatDeliveryDate(
    dateString
  ) {

    if (!dateString) {

      return 'Unknown';

    }


    const date =
      new Date(
        dateString +
        'T00:00:00'
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return dateString;

    }


    return date.toLocaleDateString(
      'en-PH',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }
    );

  }


  /* =========================================================
     SHOW CHECKOUT ERROR
  ========================================================= */

  function showCheckoutError(
    message
  ) {

    orderContainer.innerHTML = `

      <div class="section-card text-center p-5 mb-4">

        <h6 class="mb-2 fw-bold">
          Unable to Continue
        </h6>

        <p class="small text-muted mb-3">
          ${escapeHTML(message)}
        </p>

        <a
          href="CART.html"
          class="btn btn-checkout btn-sm"
        >
          Back to Cart
        </a>

      </div>

    `;


    orderTotalEl.textContent =
      '₱0.00';


    itemCountEl.textContent =
      '0';


    itemPluralEl.textContent =
      's';


    if (placeOrderBtn) {

      placeOrderBtn.disabled =
        true;

    }

  }


  /* =========================================================
     ESCAPE HTML
  ========================================================= */

  function escapeHTML(
    value
  ) {

    const div =
      document.createElement(
        'div'
      );


    div.textContent =
      value ?? '';


    return div.innerHTML;

  }


  /* =========================================================
     START CHECKOUT
  ========================================================= */

  async function startCheckout() {

    const isLoggedIn =
      await checkSession();


    if (!isLoggedIn) {

      return;

    }


    // Address first: the shipping fee depends on it
    await loadDeliveryAddress();

    await loadCheckout();

  }


  /* =========================================================
     START
  ========================================================= */

  startCheckout();

})();