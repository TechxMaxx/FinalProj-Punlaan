/* =========================================================
   HOME.JS
   Public HOME.html page functionality
========================================================= */

/* =========================================================
   SESSION
   Guests can browse; guest-mode.js shows Log in / Register
   in the header and handles account-only links.
========================================================= */

window.punlaanSession.then(result => {

    if (!result.logged_in) {
        return;
    }

    // Update profile name
    const usernameSpan =
        document.querySelector(".profile-container span");

    if (usernameSpan && result.first_name) {
        usernameSpan.textContent =
            result.first_name;
    }
});

/* =========================================================
   POPULAR GOODS
========================================================= */

const tabs =
    document.querySelectorAll("#goodsTabs .tab");

const groups =
    document.querySelectorAll(".goods-group");

const viewAll =
    document.querySelector(".view-all");

/* =========================================================
   HOME CATEGORY → DATABASE SUBCATEGORY
========================================================= */

const categoryMap = {
    "vegetable-seedlings":
        "Vegetable Seedlings",
    "flowering-bushes":
        "Flowering Bushes",
    "fruit-tree-saplings":
        "Fruit Tree Saplings"
};

/* =========================================================
   LOAD POPULAR PRODUCTS FROM DATABASE
========================================================= */

async function loadPopularProducts(categoryId) {
    const subcategory =
        categoryMap[categoryId];

    if (!subcategory) {
        console.error(
            "No database category mapped for:",
            categoryId
        );
        return;
    }

    const group =
        document.getElementById(categoryId);

    if (!group) {
        console.error(
            "Product group not found:",
            categoryId
        );
        return;
    }

    // Show loading message
    group.innerHTML = `
        <p style="
            width: 100%;
            text-align: center;
            padding: 30px;
            color: #777;
        ">
            Loading products...
        </p>
    `;

    try {
        const response =
            await fetch(
                "get_products.php?subcategory=" +
                encodeURIComponent(subcategory)
            );

        if (!response.ok) {
            throw new Error(
                "Server returned " +
                response.status
            );
        }

        const result =
            await response.json();

        console.log(
            "Popular products:",
            result
        );

        if (!result.success) {
            group.innerHTML = `
                <p style="
                    width: 100%;
                    text-align: center;
                    padding: 30px;
                    color: #777;
                ">
                    ${result.message}
                </p>
            `;
            return;
        }

        if (
            !result.products ||
            result.products.length === 0
        ) {
            group.innerHTML = `
                <p style="
                    width: 100%;
                    text-align: center;
                    padding: 30px;
                    color: #777;
                ">
                    No products available.
                </p>
            `;
            return;
        }

        // Clear loading message
        group.innerHTML = "";

        // Display first 5 products
        result.products
            .slice(0, 5)
            .forEach(product => {
                group.appendChild(
                    createPopularProductCard(product)
                );
            });

    } catch (error) {
        console.error(
            "Unable to load popular products:",
            error
        );

        group.innerHTML = `
            <p style="
                width: 100%;
                text-align: center;
                padding: 30px;
                color: #b00020;
            ">
                Unable to load products.
            </p>
        `;
    }
}

/* =========================================================
   CREATE POPULAR PRODUCT CARD
========================================================= */

function createPopularProductCard(product) {
    const card =
        document.createElement("a");

    card.className =
        "category-card";

    // Send user to product detail page
    card.href =
        "DETAIL.html?product_id=" +
        encodeURIComponent(
            product.product_id
        );

    /* ================= IMAGE ================= */
    const image =
        document.createElement("img");

    image.src =
        product.product_image ||
        "products/no_photo.jpg";

    image.alt =
        product.product_name;

    image.loading =
        "lazy";

    // Fallback if image doesn't exist
    image.onerror =
        function () {
            this.onerror = null;
            this.src =
                "products/no_photo.jpg";
        };

    /* ================= LABEL ================= */
    const label =
        document.createElement("div");

    label.className =
        "card-label";

    const name =
        document.createElement("h3");

    name.textContent =
        product.product_name;

    label.appendChild(
        name
    );

    /* ================= CARD ================= */
    card.appendChild(
        image
    );
    card.appendChild(
        label
    );

    return card;
}

/* =========================================================
   TAB SWITCHING
========================================================= */

tabs.forEach(tab => {
    tab.addEventListener(
        "click",
        function () {
            const target =
                this.dataset.target;

            /* -------------------------
               Active tab
            ------------------------- */
            tabs.forEach(item => {
                item.classList.remove(
                    "active"
                );
            });

            this.classList.add(
                "active"
            );

            /* -------------------------
               Show selected group
            ------------------------- */
            groups.forEach(group => {
                if (
                    group.id === target
                ) {
                    group.removeAttribute(
                        "hidden"
                    );
                } else {
                    group.setAttribute(
                        "hidden",
                        ""
                    );
                }
            });

            /* -------------------------
               Update View All
            ------------------------- */
            const label =
                this.textContent.trim();

            if (viewAll) {
                viewAll.textContent =
                    'View All "' +
                    label +
                    '" ›';

                // Make View All go to the correct Marketplace category
                const marketplaceCategory = {
                    "vegetable-seedlings":
                        "veg-seedlings",
                    "flowering-bushes":
                        "flowering-bushes",
                    "fruit-tree-saplings":
                        "fruit-saplings"
                };
                viewAll.href =
                    "MARKETPLACE.html#" +
                    marketplaceCategory[target];
            }

            /* -------------------------
               Load products
            ------------------------- */
            loadPopularProducts(
                target
            );
        }
    );
});

/* =========================================================
   INITIAL LOAD
========================================================= */

loadPopularProducts(
    "vegetable-seedlings"
);

/* =========================================================
   MODAL LOGIN/SIGNUP FUNCTIONALITY
   (Added from HOME2.html)
========================================================= */

// Get modal elements
const modal = document.getElementById('loginModal');
const modalClose = document.getElementById('modalClose');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginContainer = document.getElementById('loginFormContainer');
const signupContainer = document.getElementById('signupFormContainer');
const showSignupLink = document.getElementById('showSignupLink');
const showLoginLink = document.getElementById('showLoginLink');
const profileNav = document.getElementById('profileNav');

// Show login form
function showLogin() {
    loginContainer.classList.remove('hidden');
    signupContainer.classList.remove('active');
}

// Show signup form
function showSignup() {
    loginContainer.classList.add('hidden');
    signupContainer.classList.add('active');
}

// Open modal
function openModal(showForm = 'login') {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (showForm === 'signup') {
        showSignup();
    } else {
        showLogin();
    }

    // Clear all inputs
    document.querySelectorAll('.modal-box input').forEach(input => input.value = '');
}

// Close modal
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Event listeners
if (modalClose) {
    modalClose.addEventListener('click', closeModal);
}

if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

if (showSignupLink) {
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSignup();
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });
}

// Login form submit
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }

        alert('Welcome back, ' + email + '! You are now signed in.');
        closeModal();
    });
}

// Signup form submit
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;

        if (!name || !email || !password || !confirm) {
            alert('Please fill in all fields.');
            return;
        }

        if (password !== confirm) {
            alert('Passwords do not match. Please try again.');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }

        alert('Welcome to Punlaan, ' + name + '! Your account has been created.');
        closeModal();
    });
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});