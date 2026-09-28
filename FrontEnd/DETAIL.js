/* =========================================================
   DETAIL.JS
   Database-driven Product Detail Page
========================================================= */

'use strict';


/* =========================================================
   PRODUCT DATA
========================================================= */

let product = {
    id: null,
    name: '',
    price: 0,
    stock: 0,
    seller_name: '',
    quantity: 1
};


let quantity = 1;


/* =========================================================
   HTML ELEMENTS
========================================================= */

const productImage =
    document.getElementById('productImage');

const productName =
    document.getElementById('productName');

const productPrice =
    document.getElementById('productPrice');

const productLocation =
    document.getElementById('productLocation');

const productDescription =
    document.getElementById('productDescription');

const sellerName =
    document.getElementById('sellerName');

const stockUnits =
    document.getElementById('stockUnits');

const stockStatus =
    document.getElementById('stockStatus');

const qtyNumber =
    document.getElementById('qtyNumber');

const qtyMinus =
    document.getElementById('qtyMinus');

const qtyPlus =
    document.getElementById('qtyPlus');

const addToCartBtn =
    document.getElementById('addToCart');

const buyNowBtn =
    document.getElementById('buyNow');

const favoriteBtn =
    document.getElementById('favoriteBtn');

const usernameDisplay =
    document.getElementById('usernameDisplay');


/* =========================================================
   GET PRODUCT ID
========================================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const productId =
    urlParams.get('product_id');


/* =========================================================
   SESSION CHECK
   Guests can view the product; Add to Cart, Buy Now and
   Save send them to Login first (then back here).
========================================================= */

let isGuest = false;

async function checkSession() {

    try {

        const response =
            await fetch(
                '../register/session.php',
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
            'Session result:',
            result
        );


        /* ==========================================
           NOT LOGGED IN
        ========================================== */

        if (!result.logged_in) {

            isGuest = true;

            return true;

        }


        /* ==========================================
           DISPLAY USER NAME
        ========================================== */

        if (usernameDisplay) {

            let fullName = '';


            /* First name */
            if (result.first_name) {

                fullName =
                    String(
                        result.first_name
                    ).trim();

            }


            /* Last name */
            if (result.last_name) {

                if (fullName) {

                    fullName += ' ';

                }

                fullName +=
                    String(
                        result.last_name
                    ).trim();

            }


            /* Other possible session fields */

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


            /* Final fallback */

            if (!fullName) {

                fullName =
                    'User';

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


        // Still show the product
        isGuest = true;

        return true;

    }

}


/* =========================================================
   CHECK FAVORITE STATUS
========================================================= */

async function loadFavoriteStatus(
    id
) {

    if (!favoriteBtn) {

        return;

    }


    try {

        const response =
            await fetch(
                '../MyAccount/customer_php/get_saved_status.php?product_id=' +
                encodeURIComponent(id),
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
            'Favorite status:',
            result
        );


        if (
            result.logged_in === false
        ) {

            return;

        }


        if (!result.success) {

            return;

        }


        setFavoriteButton(
            result.saved === true
        );


    } catch (error) {

        console.error(
            'Unable to check favorite status:',
            error
        );

    }

}


/* =========================================================
   UPDATE FAVORITE BUTTON
========================================================= */

function setFavoriteButton(
    saved
) {

    if (!favoriteBtn) {

        return;

    }


    const icon =
        favoriteBtn.querySelector('i');


    if (!icon) {

        return;

    }


    if (saved) {

        favoriteBtn.classList.add(
            'saved'
        );


        favoriteBtn.setAttribute(
            'aria-label',
            'Remove from Saved Plants'
        );


        favoriteBtn.setAttribute(
            'title',
            'Remove from Saved Plants'
        );


        icon.classList.remove(
            'fa-regular'
        );


        icon.classList.add(
            'fa-solid'
        );

    } else {

        favoriteBtn.classList.remove(
            'saved'
        );


        favoriteBtn.setAttribute(
            'aria-label',
            'Save plant'
        );


        favoriteBtn.setAttribute(
            'title',
            'Save plant'
        );


        icon.classList.remove(
            'fa-solid'
        );


        icon.classList.add(
            'fa-regular'
        );

    }

}


/* =========================================================
   FETCH PRODUCT FROM DATABASE
========================================================= */

async function loadProduct(
    id
) {

    try {

        const response =
            await fetch(
                'get_product.php?product_id=' +
                encodeURIComponent(id)
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
            'Product detail:',
            result
        );


        /* ==========================================
           CHECK RESPONSE
        ========================================== */

        if (!result.success) {

            alert(
                result.message ||
                'Product could not be found.'
            );

            return;

        }


        const productData =
            result.product;


        if (!productData) {

            alert(
                'No product data was returned.'
            );

            return;

        }


        /* ==========================================
           STORE PRODUCT
        ========================================== */

        product = {

            id:
                Number(
                    productData.product_id
                ),

            name:
                productData.product_name ||
                '',

            price:
                Number(
                    productData.price
                ) || 0,

            stock:
                Number(
                    productData.stock
                ) || 0,

            seller_name:
                productData.seller_name ||
                'Seller',

            quantity: 1

        };


        quantity = 1;


        /* ==========================================
           PRODUCT NAME
        ========================================== */

        if (productName) {

            productName.textContent =
                productData.product_name ||
                'Unnamed Product';

        }


        /* ==========================================
           PRODUCT PRICE
        ========================================== */

        if (productPrice) {

            productPrice.textContent =
                'PHP ' +
                product.price.toLocaleString(
                    'en-PH',
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );

        }


        /* ==========================================
           LOCATION
        ========================================== */

        if (productLocation) {

            productLocation.textContent =
                productData.location ||
                'Location not specified';

        }


        /* ==========================================
           DESCRIPTION
        ========================================== */

        if (productDescription) {

            productDescription.textContent =
                productData.description ||
                'No description available.';

        }


        /* ==========================================
           SELLER
        ========================================== */

        if (sellerName) {

            sellerName.textContent =
                productData.seller_name ||
                'Seller';

        }


        // Seller's profile photo in the circle
        const sellerAvatar =
            document.querySelector('.seller-avatar');

        if (sellerAvatar && productData.profile_picture) {

            const photo =
                document.createElement('img');

            photo.src =
                /^https?:\/\//i.test(productData.profile_picture)
                    ? productData.profile_picture
                    : '../' + productData.profile_picture;

            photo.alt = '';

            photo.style.cssText =
                'width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;';

            photo.onload = function () {
                sellerAvatar.innerHTML = '';
                sellerAvatar.appendChild(photo);
            };

        }


        /* ==========================================
           VISIT SHOP → this seller's shop page
        ========================================== */

        const visitShopBtn =
            document.querySelector('.btn-visit-shop');

        if (visitShopBtn && productData.user_id) {

            visitShopBtn.href =
                'SHOP.html?vendor_id=' +
                encodeURIComponent(
                    productData.user_id
                );

        }


        /* ==========================================
           STOCK
        ========================================== */

        if (stockUnits) {

            stockUnits.textContent =
                '(' +
                product.stock +
                ' units)';

        }


        if (stockStatus) {

            stockStatus.textContent =
                product.stock > 0
                    ? 'IN STOCK'
                    : 'OUT OF STOCK';

        }


        /* ==========================================
           PRODUCT IMAGE
        ========================================== */

        if (productImage) {

            productImage.src =
                productData.product_image ||
                'products/no_photo.jpg';


            productImage.alt =
                productData.product_name ||
                'Product image';


            productImage.onerror =
                function () {

                    this.onerror = null;

                    this.src =
                        'products/no_photo.jpg';

                };


            renderPhotoThumbs(
                productData.images || [],
                productData.product_name || 'Product'
            );

        }


        /* ==========================================
           PAGE TITLE
        ========================================== */

        document.title =
            product.name +
            ' — Punlaan';


        /* ==========================================
           QUANTITY BUTTONS
        ========================================== */

        updateQuantityButtons();


        /* ==========================================
           FAVORITE STATUS
        ========================================== */

        loadFavoriteStatus(
            product.id
        );

    } catch (error) {

        console.error(
            'Unable to load product:',
            error
        );


        alert(
            'Unable to load product.'
        );

    }

}


/* =========================================================
   QUANTITY BUTTONS
========================================================= */

function updateQuantityButtons() {

    if (qtyNumber) {

        qtyNumber.textContent =
            quantity;

    }


    if (qtyMinus) {

        qtyMinus.disabled =
            quantity <= 1;

    }


    if (qtyPlus) {

        qtyPlus.disabled =
            product.stock <= 0 ||
            quantity >= product.stock;

    }

}


/* =========================================================
   MINUS BUTTON
========================================================= */

if (qtyMinus) {

    qtyMinus.addEventListener(
        'click',
        function () {

            if (quantity > 1) {

                quantity--;

                product.quantity =
                    quantity;

                updateQuantityButtons();

            }

        }
    );

}


/* =========================================================
   PLUS BUTTON
========================================================= */

if (qtyPlus) {

    qtyPlus.addEventListener(
        'click',
        function () {

            if (
                product.stock > 0 &&
                quantity < product.stock
            ) {

                quantity++;

                product.quantity =
                    quantity;

                updateQuantityButtons();

            }

        }
    );

}


/* =========================================================
   ADD TO CART
========================================================= */

// Guests: Login (or Register) first, then come back to this product
function goToLogin() {

    if (window.requireLogin) {
        window.requireLogin();
    } else {
        window.location.href =
            '../register/Login.html';
    }
}


if (addToCartBtn) {

    addToCartBtn.addEventListener(
        'click',
        async function () {

            if (isGuest) {
                goToLogin();
                return;
            }


            if (!product.id) {

                alert(
                    'Product information is not available.'
                );

                return;

            }


            if (product.stock <= 0) {

                alert(
                    'This product is currently out of stock.'
                );

                return;

            }


            if (
                quantity <= 0 ||
                quantity > product.stock
            ) {

                alert(
                    'Please select a valid quantity.'
                );

                return;

            }


            addToCartBtn.disabled =
                true;


            addToCartBtn.textContent =
                'ADDING...';


            try {

                const response =
                    await fetch(
                        'add_to_cart.php',
                        {
                            method: 'POST',

                            credentials:
                                'include',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({
                                    product_id:
                                        Number(
                                            product.id
                                        ),

                                    quantity:
                                        Number(
                                            quantity
                                        )
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
                    'Add to cart response:',
                    result
                );


                if (
                    result.logged_in === false
                ) {

                    goToLogin();

                    return;

                }


                if (!result.success) {

                    alert(
                        result.message ||
                        'Could not add the product to your cart.'
                    );

                    return;

                }


                if (window.updateCartBadge) {
                    window.updateCartBadge();
                }


                alert(
                    result.message ||
                    product.name +
                    ' has been added to your cart.'
                );


            } catch (error) {

                console.error(
                    'Add to cart failed:',
                    error
                );


                alert(
                    'Unable to add this product to your cart.'
                );


            } finally {

                addToCartBtn.disabled =
                    false;


                addToCartBtn.textContent =
                    'ADD TO CART';

            }

        }
    );

}


/* =========================================================
   PHOTO THUMBNAILS
   Click a thumbnail to show it as the main photo
========================================================= */

function renderPhotoThumbs(images, name) {

    const strip =
        document.getElementById('productThumbs');

    if (!strip || !productImage) {
        return;
    }

    strip.innerHTML = '';
    strip.hidden = images.length < 2;

    if (images.length < 2) {
        return;
    }

    images.forEach(function (src, index) {

        const btn =
            document.createElement('button');

        btn.type = 'button';
        btn.className = 'product-thumb' + (index === 0 ? ' product-thumb--active' : '');
        btn.setAttribute('aria-label', 'Show photo ' + (index + 1) + ' of ' + images.length);

        const img =
            document.createElement('img');

        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function () { btn.remove(); };

        btn.appendChild(img);

        btn.addEventListener('click', function () {

            productImage.src = src;
            productImage.alt = name + ' — photo ' + (index + 1);

            strip.querySelectorAll('.product-thumb').forEach(function (b) {
                b.classList.toggle('product-thumb--active', b === btn);
            });

        });

        strip.appendChild(btn);
    });
}


/* =========================================================
   BUY NOW
========================================================= */

if (buyNowBtn) {

    buyNowBtn.addEventListener(
        'click',
        async function () {

            if (isGuest) {
                goToLogin();
                return;
            }


            if (!product.id) {

                alert(
                    'Product information is not available.'
                );

                return;

            }


            if (product.stock <= 0) {

                alert(
                    'This product is currently out of stock.'
                );

                return;

            }


            if (
                quantity <= 0 ||
                quantity > product.stock
            ) {

                alert(
                    'Please select a valid quantity.'
                );

                return;

            }


            /*
              Checkout only reads items selected on the server,
              so: put this item in the cart with the exact quantity,
              select only it for checkout, then open checkout.
            */

            buyNowBtn.disabled =
                true;

            buyNowBtn.textContent =
                'PLEASE WAIT...';


            try {

                const cartResponse =
                    await fetch(
                        'add_to_cart.php',
                        {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body:
                                JSON.stringify({
                                    product_id:
                                        Number(product.id),
                                    quantity:
                                        Number(quantity),
                                    mode:
                                        'buy_now'
                                })
                        }
                    );

                const cartResult =
                    await cartResponse.json();


                if (cartResult.logged_in === false) {

                    goToLogin();

                    return;

                }


                if (!cartResult.success) {

                    alert(
                        cartResult.message ||
                        'Could not start checkout.'
                    );

                    return;

                }


                const checkoutResponse =
                    await fetch(
                        'Checkout/set_checkout.php',
                        {
                            method: 'POST',
                            credentials: 'include',
                            headers: {
                                'Content-Type':
                                    'application/json'
                            },
                            body:
                                JSON.stringify({
                                    cart_item_ids: [
                                        cartResult.cart_item_id
                                    ]
                                })
                        }
                    );

                const checkoutResult =
                    await checkoutResponse.json();


                if (!checkoutResult.success) {

                    alert(
                        checkoutResult.message ||
                        'Could not start checkout.'
                    );

                    return;

                }


                window.location.href =
                    'Checkout/CHECKOUT.html';

            } catch (error) {

                console.error(
                    'Buy now failed:',
                    error
                );

                alert(
                    'Unable to start checkout. Please try again.'
                );

            } finally {

                buyNowBtn.disabled =
                    false;

                buyNowBtn.textContent =
                    'BUY NOW';

            }

        }
    );

}


/* =========================================================
   TOGGLE FAVORITE
========================================================= */

if (favoriteBtn) {

    favoriteBtn.addEventListener(
        'click',
        async function () {

            if (isGuest) {
                goToLogin();
                return;
            }


            if (!product.id) {

                alert(
                    'Product information is not available.'
                );

                return;

            }


            favoriteBtn.disabled =
                true;


            try {

                const formData =
                    new FormData();


                formData.append(
                    'product_id',
                    Number(
                        product.id
                    )
                );


                const response =
                    await fetch(
                        '../MyAccount/customer_php/toggle_saved_plant.php',
                        {
                            method: 'POST',

                            credentials:
                                'include',

                            body:
                                formData
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
                    'Favorite response:',
                    result
                );


                if (
                    result.logged_in === false
                ) {

                    goToLogin();

                    return;

                }


                if (!result.success) {

                    throw new Error(
                        result.message ||
                        'Could not update Saved Plants.'
                    );

                }


                setFavoriteButton(
                    result.saved === true
                );


                alert(
                    result.message ||
                    (
                        result.saved
                            ? 'Added to Saved Plants.'
                            : 'Removed from Saved Plants.'
                    )
                );


            } catch (error) {

                console.error(
                    'Favorite update failed:',
                    error
                );


                alert(
                    error.message ||
                    'Unable to update Saved Plants.'
                );


            } finally {

                favoriteBtn.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   START DETAIL PAGE
========================================================= */

async function startDetailPage() {

    /* ==========================================
       CHECK SESSION FIRST
    ========================================== */

    const isLoggedIn =
        await checkSession();


    if (!isLoggedIn) {

        return;

    }


    /* ==========================================
       CHECK PRODUCT ID
    ========================================== */

    if (!productId) {

        alert(
            'No product was selected.'
        );

        return;

    }


    /* ==========================================
       LOAD PRODUCT
    ========================================== */

    await loadProduct(
        productId
    );

}


/* =========================================================
   START
========================================================= */

startDetailPage();