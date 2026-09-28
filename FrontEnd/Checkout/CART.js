(function () {

  'use strict';


  let cartItems = [];

  /*
    Cart items already shown on the page. Items not seen before
    (first load, or newly added) start selected, like Shopee;
    items the user unticked stay unticked.
  */
  let renderedIds = new Set();


  /* =========================================================
     DOM ELEMENTS
  ========================================================= */

  const cartContainer =
    document.getElementById('cartContainer');

  const checkoutSection =
    document.getElementById('checkoutSection');

  const tableHeader =
    document.getElementById('tableHeader');

  const selectAllCheckbox =
    document.getElementById('selectAll');

  const bottomItemCount =
    document.getElementById('bottomItemCount');

  const bottomItemPlural =
    document.getElementById('bottomItemPlural');

  const bottomTotal =
    document.getElementById('bottomTotal');

  const checkoutBtn =
    document.getElementById('checkoutBtn');

  const deleteSelectedBtn =
    document.getElementById('deleteSelectedBtn');

  const usernameDisplay =
    document.getElementById('usernameDisplay');


  /* =========================================================
     SESSION CHECK
     CART is inside FrontEnd/Checkout
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
        'Cart session:',
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


        if (result.first_name) {

          fullName =
            String(
              result.first_name
            ).trim();

        }


        if (result.last_name) {

          if (fullName) {

            fullName += ' ';

          }

          fullName +=
            String(
              result.last_name
            ).trim();

        }


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
     LOAD CART FROM DATABASE
  ========================================================= */

  async function loadCartFromDatabase() {

    try {

      const response =
        await fetch(
          'get_cart.php',
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
        'Database cart:',
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

        throw new Error(
          result.message ||
          'Could not load your cart.'
        );

      }


      /* =====================================================
         STORE DATABASE ITEMS
      ===================================================== */

      cartItems =
        Array.isArray(result.items)
          ? result.items
          : [];


      renderCart();


      if (window.updateCartBadge) {
        window.updateCartBadge(cartItems.length);
      }


    } catch (error) {

      console.error(
        'Could not load cart:',
        error
      );


      cartItems = [];


      tableHeader.style.display =
        'none';

      checkoutSection.style.display =
        'none';


      cartContainer.innerHTML = `
        <div class="empty-cart-container">

          <i class="bi bi-exclamation-circle empty-cart-icon"></i>

          <h5 class="empty-cart-title">
            Unable to Load Cart
          </h5>

          <p class="empty-cart-text">
            We could not connect to your cart.
            Please check your server connection.
          </p>

        </div>
      `;

    }

  }


  /* =========================================================
     RENDER CART
  ========================================================= */

  function renderCart() {

    /* =======================================================
       EMPTY CART
    ======================================================= */

    if (cartItems.length === 0) {

      tableHeader.style.display =
        'none';

      checkoutSection.style.display =
        'none';


      cartContainer.innerHTML = `
        <div class="empty-cart-container">

          <i class="bi bi-cart-x empty-cart-icon"></i>

          <h5 class="empty-cart-title">
            Your Cart is Empty
          </h5>

          <p class="empty-cart-text">
            Looks like you haven't added any items yet.
            Start shopping to fill your cart!
          </p>

          <a
            href="../MARKETPLACE.html"
            class="start-shopping-btn"
          >

            <i class="bi bi-bag-plus me-2"></i>

            Start Shopping

          </a>

        </div>
      `;

      return;

    }


    /* =======================================================
       CART HAS ITEMS
    ======================================================= */

    tableHeader.style.display =
      'block';

    checkoutSection.style.display =
      'block';


    /* =======================================================
       REMEMBER SELECTION
       (the cart is re-rendered after every quantity change)
    ======================================================= */

    const checkedIds =
      new Set(
        Array.from(
          document.querySelectorAll('.item-checkbox:checked')
        ).map(function (checkbox) {
          const row = checkbox.closest('.cart-item');
          return row ? row.getAttribute('data-id') : null;
        })
      );


    /* =======================================================
       GROUP BY SELLER
    ======================================================= */

    const groups = {};


    cartItems.forEach(
      function (item) {

        const company =
          item.company ||
          'Seller';


        if (!groups[company]) {

          groups[company] = [];

        }


        groups[company].push(
          item
        );

      }
    );


    /* =======================================================
       BUILD HTML
    ======================================================= */

    let html = '';


    for (
      const [company, items]
      of Object.entries(groups)
    ) {

      html += `
        <div
          class="cart-group-card"
          data-company="${escapeHTML(company)}"
        >

          <div class="company-row">

            <div class="col-product">
              <a
                href="../SHOP.html?vendor_id=${Number(items[0].vendor_id)}"
                class="company-link"
                title="Visit shop"
              >
                <i class="bi bi-shop me-1"></i>${escapeHTML(company)}<i class="bi bi-chevron-right ms-1"></i>
              </a>
            </div>

            <div class="col-price"></div>
            <div class="col-qty"></div>
            <div class="col-total"></div>
            <div class="col-action"></div>

          </div>
      `;


      items.forEach(
        function (item) {

          const price =
            Number(item.price) || 0;


          const quantity =
            Number(item.quantity) || 0;


          const totalPrice =
            price * quantity;


          html += `
            <div
              class="cart-item"
              data-id="${Number(item.cart_item_id)}"
              data-product-id="${Number(item.product_id)}"
              data-price="${price}"
            >

              <div class="col-product">

                <div class="product-left">

                  <input
                    type="checkbox"
                    class="custom-checkbox item-checkbox"
                    aria-label="Select ${escapeHTML(item.name)}"
                    ${
                      checkedIds.has(String(item.cart_item_id)) ||
                      !renderedIds.has(String(item.cart_item_id))
                        ? 'checked'
                        : ''
                    }
                  />

                  <img
                    src="${escapeHTML(item.image)}"
                    alt="${escapeHTML(item.name)}"
                    class="product-img"
                    onerror="this.onerror=null; this.src='../products/no_photo.jpg';"
                  />

                  <div class="product-info">

                    <span class="product-title">
                      ${escapeHTML(item.name)}
                    </span>

                    <span class="product-company">
                      ${escapeHTML(company)}
                    </span>

                  </div>

                </div>

              </div>


              <div class="col-price text-center">

                <span class="price-value">

                  ₱${price.toLocaleString(
                    'en-PH',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )}

                </span>

              </div>


              <div class="col-qty text-center">

                <div class="qty-control">

                  <button
                    class="qty-btn qty-minus"
                    type="button"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <span class="qty-val">
                    ${quantity}
                  </span>

                  <button
                    class="qty-btn qty-plus"
                    type="button"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>

                </div>

              </div>


              <div class="col-total text-center">

                <span class="total-value">

                  ₱${totalPrice.toLocaleString(
                    'en-PH',
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )}

                </span>

              </div>


              <div class="col-action text-center">

                <button
                  class="delete-btn item-delete"
                  type="button"
                >

                  <i class="bi bi-trash3 me-1"></i>

                  Remove

                </button>

              </div>

            </div>
          `;

        }
      );


      html += `
        </div>
      `;

    }


    cartContainer.innerHTML =
      html;


    renderedIds =
      new Set(
        cartItems.map(function (item) {
          return String(item.cart_item_id);
        })
      );


    updateTotals();

  }


  /* =========================================================
     UPDATE TOTALS
  ========================================================= */

  function updateTotals() {

    let selectedCount = 0;

    let selectedTotal = 0;


    document
      .querySelectorAll(
        '.item-checkbox:checked'
      )
      .forEach(
        function (checkbox) {

          const itemDiv =
            checkbox.closest(
              '.cart-item'
            );


          if (!itemDiv) {

            return;

          }


          const price =
            Number(
              itemDiv.getAttribute(
                'data-price'
              )
            );


          const quantityElement =
            itemDiv.querySelector(
              '.qty-val'
            );


          const quantity =
            quantityElement
              ? Number(
                  quantityElement.textContent
                )
              : 0;


          selectedCount +=
            quantity;


          selectedTotal +=
            price * quantity;

        }
      );


    bottomItemCount.textContent =
      selectedCount;


    bottomItemPlural.textContent =
      selectedCount === 1
        ? ''
        : 's';


    bottomTotal.textContent =
      '₱' +
      selectedTotal.toLocaleString(
        'en-PH',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );


    /* =======================================================
       SELECT ALL STATE
    ======================================================= */

    const totalCheckboxes =
      document.querySelectorAll(
        '.item-checkbox'
      ).length;


    const checkedCheckboxes =
      document.querySelectorAll(
        '.item-checkbox:checked'
      ).length;


    selectAllCheckbox.checked =
      totalCheckboxes > 0 &&
      totalCheckboxes ===
        checkedCheckboxes;

  }


  /* =========================================================
     GET SELECTED ITEMS
  ========================================================= */

  function getSelectedItems() {

    const selected = [];


    document
      .querySelectorAll(
        '.item-checkbox:checked'
      )
      .forEach(
        function (checkbox) {

          const itemDiv =
            checkbox.closest(
              '.cart-item'
            );


          if (!itemDiv) {

            return;

          }


          const cartItemId =
            Number(
              itemDiv.getAttribute(
                'data-id'
              )
            );


          const item =
            cartItems.find(
              function (item) {

                return Number(
                  item.cart_item_id
                ) === cartItemId;

              }
            );


          if (item) {

            selected.push({
              ...item
            });

          }

        }
      );


    return selected;

  }


  /* =========================================================
     CART CLICK EVENTS
  ========================================================= */

  cartContainer.addEventListener(
    'click',
    async function (event) {

      const target =
        event.target;


      /* =====================================================
         DECREASE
      ===================================================== */

      if (
        target.classList.contains(
          'qty-minus'
        )
      ) {

        const itemDiv =
          target.closest(
            '.cart-item'
          );


        if (!itemDiv) {

          return;

        }


        const cartItemId =
          Number(
            itemDiv.getAttribute(
              'data-id'
            )
          );


        const currentQuantity =
          Number(
            itemDiv.querySelector(
              '.qty-val'
            ).textContent
          );


        if (
          currentQuantity <= 1
        ) {

          return;

        }


        await updateCartItem(
          cartItemId,
          currentQuantity - 1
        );


        return;

      }


      /* =====================================================
         INCREASE
      ===================================================== */

      if (
        target.classList.contains(
          'qty-plus'
        )
      ) {

        const itemDiv =
          target.closest(
            '.cart-item'
          );


        if (!itemDiv) {

          return;

        }


        const cartItemId =
          Number(
            itemDiv.getAttribute(
              'data-id'
            )
          );


        const currentQuantity =
          Number(
            itemDiv.querySelector(
              '.qty-val'
            ).textContent
          );


        const currentItem =
          cartItems.find(
            function (item) {

              return Number(
                item.cart_item_id
              ) === cartItemId;

            }
          );


        if (!currentItem) {

          return;

        }


        const stock =
          Number(
            currentItem.stock
          );


        if (
          stock > 0 &&
          currentQuantity >= stock
        ) {

          alert(
            'You cannot add more than the available stock.'
          );

          return;

        }


        await updateCartItem(
          cartItemId,
          currentQuantity + 1
        );


        return;

      }


      /* =====================================================
         REMOVE ITEM
      ===================================================== */

      if (
        target.closest(
          '.item-delete'
        )
      ) {

        const deleteButton =
          target.closest(
            '.item-delete'
          );


        const itemDiv =
          deleteButton.closest(
            '.cart-item'
          );


        if (!itemDiv) {

          return;

        }


        const cartItemId =
          Number(
            itemDiv.getAttribute(
              'data-id'
            )
          );


        const productName =
          itemDiv.querySelector(
            '.product-title'
          )?.textContent ||
          'this item';


        const confirmed =
          confirm(
            `Are you sure you want to remove ${productName} from your cart?`
          );


        if (!confirmed) {

          return;

        }


        await removeCartItems([
          cartItemId
        ]);


        return;

      }

    }
  );


  /* =========================================================
     UPDATE CART ITEM
  ========================================================= */

  async function updateCartItem(
    cartItemId,
    newQuantity
  ) {

    try {

      const response =
        await fetch(
          'update_cart.php',
          {
            method: 'POST',

            credentials: 'include',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                cart_item_id:
                  Number(cartItemId),

                quantity:
                  Number(newQuantity)

              })

          }
        );


      const result =
        await response.json();


      console.log(
        'Update cart response:',
        result
      );


      if (
        result.logged_in === false
      ) {

        window.location.href =
          '../../register/Login.html';

        return false;

      }


      if (!result.success) {

        alert(
          result.message ||
          'Could not update your cart.'
        );

        return false;

      }


      await loadCartFromDatabase();

      return true;


    } catch (error) {

      console.error(
        'Could not update cart:',
        error
      );


      alert(
        'Unable to update your cart.'
      );


      return false;

    }

  }


  /* =========================================================
     REMOVE CART ITEMS
  ========================================================= */

  async function removeCartItems(
    cartItemIds
  ) {

    if (
      !Array.isArray(cartItemIds) ||
      cartItemIds.length === 0
    ) {

      return false;

    }


    try {

      const response =
        await fetch(
          'remove_cart.php',
          {
            method: 'POST',

            credentials: 'include',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({

                cart_item_ids:
                  cartItemIds.map(
                    Number
                  )

              })

          }
        );


      const result =
        await response.json();


      console.log(
        'Remove cart response:',
        result
      );


      if (
        result.logged_in === false
      ) {

        window.location.href =
          '../../register/Login.html';

        return false;

      }


      if (!result.success) {

        alert(
          result.message ||
          'Could not remove cart item(s).'
        );

        return false;

      }


      await loadCartFromDatabase();

      return true;


    } catch (error) {

      console.error(
        'Could not remove cart items:',
        error
      );


      alert(
        'Unable to remove the selected item(s).'
      );


      return false;

    }

  }


  /* =========================================================
     CHECKBOX CHANGES
  ========================================================= */

  cartContainer.addEventListener(
    'change',
    function (event) {

      if (
        event.target.classList.contains(
          'item-checkbox'
        )
      ) {

        updateTotals();

      }

    }
  );


  /* =========================================================
     SELECT ALL
  ========================================================= */

  selectAllCheckbox.addEventListener(
    'change',
    function () {

      const isChecked =
        this.checked;


      document
        .querySelectorAll(
          '.item-checkbox'
        )
        .forEach(
          function (checkbox) {

            checkbox.checked =
              isChecked;

          }
        );


      updateTotals();

    }
  );


  /* =========================================================
     DELETE SELECTED
  ========================================================= */

  deleteSelectedBtn.addEventListener(
    'click',
    async function () {

      const selectedItems =
        getSelectedItems();


      if (
        selectedItems.length === 0
      ) {

        alert(
          'Please select items to delete.'
        );

        return;

      }


      const selectedIds =
        selectedItems.map(
          function (item) {

            return Number(
              item.cart_item_id
            );

          }
        );


      const confirmed =
        confirm(
          `Are you sure you want to delete ${selectedIds.length} selected item(s)?`
        );


      if (!confirmed) {

        return;

      }


      deleteSelectedBtn.disabled =
        true;


      deleteSelectedBtn.textContent =
        'DELETING...';


      try {

        await removeCartItems(
          selectedIds
        );


      } finally {

        deleteSelectedBtn.disabled =
          false;


        deleteSelectedBtn.innerHTML =
          '<i class="bi bi-trash me-1"></i> Delete Selected';

      }

    }
  );


  /* =========================================================
     CHECKOUT
  ========================================================= */

  checkoutBtn.addEventListener(
    'click',
    async function () {

      const selectedItems =
        getSelectedItems();


      if (
        selectedItems.length === 0
      ) {

        alert(
          'Please select at least one item to checkout.'
        );

        return;

      }


      const cartItemIds =
        selectedItems.map(
          function (item) {

            return Number(
              item.cart_item_id
            );

          }
        );


      checkoutBtn.disabled =
        true;


      checkoutBtn.textContent =
        'LOADING...';


      try {

        const response =
          await fetch(
            'set_checkout.php',
            {
              method: 'POST',

              credentials: 'include',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({

                  cart_item_ids:
                    cartItemIds

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
          'Checkout selection:',
          result
        );


        if (
          result.logged_in === false
        ) {

          window.location.href =
            '../../register/Login.html';

          return;

        }


        if (!result.success) {

          alert(
            result.message ||
            'Could not continue to checkout.'
          );

          return;

        }


        window.location.href =
          'CHECKOUT.html';


      } catch (error) {

        console.error(
          'Could not start checkout:',
          error
        );


        alert(
          'Unable to continue to checkout.'
        );


      } finally {

        checkoutBtn.disabled =
          false;


        checkoutBtn.innerHTML =
          '<i class="bi bi-lock me-2"></i> CHECKOUT';

      }

    }
  );


  /* =========================================================
     HTML ESCAPE
  ========================================================= */

  function escapeHTML(value) {

    const div =
      document.createElement(
        'div'
      );


    div.textContent =
      value ?? '';


    return div.innerHTML;

  }


  /* =========================================================
     START CART
  ========================================================= */

  async function startCart() {

    const isLoggedIn =
      await checkSession();


    if (!isLoggedIn) {

      return;

    }


    await loadCartFromDatabase();

  }


  /* =========================================================
     START
  ========================================================= */

  startCart();

})();