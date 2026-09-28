(function () {

    'use strict';


    /* ==========================================
       SESSION CHECK
       Redirect if user is not logged in
    ========================================== */

    async function checkSession() {

        try {

            const response = await fetch(
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

            // Guests can browse too (guest-mode.js handles the header)
            if (!result.logged_in) {

                return true;

            }


            /* ==========================================
               GET USER NAME
            ========================================== */

            const usernameDisplay =
                document.getElementById(
                    'usernameDisplay'
                );


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


            // Still show the products
            return true;

        }

    }


    /* ==========================================
       CATEGORY NAMES
    ========================================== */

    const titleMap = {

        'all-products':
            'All Products',

        'fertilizers-soil':
            'Fertilizers & Soil',

        'tools-pots':
            'Garden Tools & Pots',

        'veg-seedlings':
            'Vegetable Seedlings',

        'fruit-seedlings':
            'Fruit Seedlings',

        'herb-seedlings':
            'Herb & Culinary Seedlings',

        'flowering-bushes':
            'Flowering Bushes',

        'ornamental-bushes':
            'Ornamental Bushes',

        'landscaping-bushes':
            'Landscaping Bushes',

        'fruit-saplings':
            'Fruit Tree Saplings',

        'native-saplings':
            'Native Tree Saplings',

        'shade-saplings':
            'Shade & Ornamental Tree Saplings'

    };


    /* ==========================================
       DATABASE SUBCATEGORY NAMES
    ========================================== */

    const subcategoryMap = {

        /* "All" and the supply categories are handled by get_products.php */
        'all-products':
            'All',

        'fertilizers-soil':
            'Fertilizers & Soil',

        'tools-pots':
            'Garden Tools & Pots',

        'veg-seedlings':
            'Vegetable Seedlings',

        'fruit-seedlings':
            'Fruit Seedlings',

        'herb-seedlings':
            'Herb & Culinary Seedlings',

        'flowering-bushes':
            'Flowering Bushes',

        'ornamental-bushes':
            'Ornamental Bushes',

        'landscaping-bushes':
            'Landscaping Bushes',

        'fruit-saplings':
            'Fruit Tree Saplings',

        'native-saplings':
            'Native Tree Saplings',

        'shade-saplings':
            'Shade & Ornamental Tree Saplings'

    };


    /* ==========================================
       CATEGORIES FROM THE DATABASE
       (Admin → Categories & Taxonomy). The lists
       above are only a fallback if loading fails.
       queryMap: sidebar key → get_products.php query
    ========================================== */

    const queryMap = {};

    async function buildSidebar() {

        let categories;

        try {
            const response = await fetch('get_categories.php', { cache: 'no-store' });
            categories = (await response.json()).categories;
        } catch (error) {
            return;   // keep the built-in sidebar
        }

        if (!Array.isArray(categories) || !categories.length) return;

        const nav = document.getElementById('sidebarNav');
        if (!nav) return;

        let html = `
            <li class="sidebar-category">
                <button class="parent-btn" data-group="all">All Products</button>
            </li>`;

        categories.forEach(function (main) {

            titleMap[main.slug] = main.name;
            queryMap[main.slug] = 'category=' + encodeURIComponent(main.name);
            groupToGrid[main.slug] = main.slug;

            html += `
                <li class="sidebar-category">
                    <button class="parent-btn" data-group="${escapeHTML(main.slug)}">${escapeHTML(main.name)}</button>
                    ${main.children.length ? `
                    <ul class="sidebar-subnav">
                        ${main.children.map(function (sub) {
                            titleMap[sub.slug] = sub.name;
                            queryMap[sub.slug] = 'subcategory=' + encodeURIComponent(sub.name);
                            return `<li><button class="sub-btn" data-target="${escapeHTML(sub.slug)}">${escapeHTML(sub.name)}</button></li>`;
                        }).join('')}
                    </ul>` : ''}
                </li>`;
        });

        nav.innerHTML = html;
    }


    /* ==========================================
       PARENT CATEGORY → FIRST SUBCATEGORY
    ========================================== */

    const groupToGrid = {

        all:
            'all-products',

        supplies:
            'fertilizers-soil',

        seedlings:
            'veg-seedlings',

        bushes:
            'flowering-bushes',

        saplings:
            'fruit-saplings'

    };


    /* ==========================================
       SEARCH ELEMENTS
    ========================================== */

    const searchForm =
        document.querySelector(
            '.header-search'
        );


    const searchInput =
        document.querySelector(
            '.header-search input'
        );


    /* ==========================================
       ESCAPE HTML
    ========================================== */

    function escapeHTML(value) {

        const div =
            document.createElement(
                'div'
            );


        div.textContent =
            value ?? '';


        return div.innerHTML;

    }


    /* ==========================================
       POST TIME
    ========================================== */

    function formatPostTime(dateString) {

        if (!dateString) {

            return '';

        }


        const date =
            new Date(
                dateString.replace(
                    ' ',
                    'T'
                )
            );


        if (isNaN(date.getTime())) {

            return '';

        }


        const now =
            new Date();


        const seconds =
            Math.floor(
                (now - date) / 1000
            );


        if (seconds < 60) {

            return 'Just now';

        }


        const minutes =
            Math.floor(
                seconds / 60
            );


        if (minutes < 60) {

            return minutes +
                ' min ago';

        }


        const hours =
            Math.floor(
                minutes / 60
            );


        if (hours < 24) {

            return hours +
                (
                    hours === 1
                        ? ' hour ago'
                        : ' hours ago'
                );

        }


        const days =
            Math.floor(
                hours / 24
            );


        if (days < 30) {

            return days +
                (
                    days === 1
                        ? ' day ago'
                        : ' days ago'
                );

        }


        const months =
            Math.floor(
                days / 30
            );


        return months +
            (
                months === 1
                    ? ' month ago'
                    : ' months ago'
            );

    }


    /* ==========================================
       LOAD PRODUCTS BY CATEGORY
    ========================================== */

    async function loadProducts(
        gridId,
        productGrid
    ) {

        const subcategory =
            subcategoryMap[gridId];

        const query =
            queryMap[gridId] ||
            (subcategory ? 'subcategory=' + encodeURIComponent(subcategory) : '');


        if (!query) {

            return;

        }


        productGrid.innerHTML = `
            <p style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 40px;
                color: #777;
            ">
                Loading products...
            </p>
        `;


        try {

            const response =
                await fetch(
                    'get_products.php?' + query
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
                'Products returned:',
                result
            );


            if (!result.success) {

                productGrid.innerHTML = `
                    <p style="
                        grid-column: 1 / -1;
                        text-align: center;
                        padding: 40px;
                        color: #777;
                    ">
                        ${escapeHTML(
                            result.message
                        )}
                    </p>
                `;

                return;

            }


            if (
                !result.products ||
                result.products.length === 0
            ) {

                productGrid.innerHTML = `
                    <p style="
                        grid-column: 1 / -1;
                        text-align: center;
                        padding: 40px;
                        color: #777;
                    ">
                        No products available in this category.
                    </p>
                `;

                return;

            }


            productGrid.innerHTML = '';


            result.products.forEach(
                product => {

                    productGrid.appendChild(
                        createProductCard(
                            product
                        )
                    );

                }
            );


        } catch (error) {

            console.error(
                'Unable to load products:',
                error
            );


            productGrid.innerHTML = `
                <p style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 40px;
                    color: #b00020;
                ">
                    Unable to load products.
                    Please check your server connection.
                </p>
            `;

        }

    }


  /* ==========================================
   SEARCH PRODUCTS / VENDORS
   Searches:
   1. Product name
   2. Vendor store name
   3. Vendor first + last name
========================================== */

async function searchProducts(
    searchTerm,
    productGrid,
    activeTitle
) {

    const search =
        searchTerm.trim();


    if (!search) {

        return;

    }


    activeTitle.textContent =
        'Search Results for "' +
        search +
        '"';


    productGrid.innerHTML = `
        <p style="
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px;
            color: #777;
        ">
            Searching for "${escapeHTML(
                search
            )}"...
        </p>
    `;


    try {

        const response =
            await fetch(
                'get_products.php?q=' +
                encodeURIComponent(
                    search
                )
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
            'Search results:',
            result
        );


        if (!result.success) {

            productGrid.innerHTML = `
                <p style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 40px;
                    color: #777;
                ">
                    ${escapeHTML(
                        result.message
                    )}
                </p>
            `;

            return;

        }


        if (
            !result.products ||
            result.products.length === 0
        ) {

            productGrid.innerHTML = `
                <p style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 40px;
                    color: #777;
                ">
                    No products or vendors found for
                    "<strong>${escapeHTML(
                        search
                    )}</strong>".
                </p>
            `;

            return;

        }


        productGrid.innerHTML = '';


        result.products.forEach(
            product => {

                productGrid.appendChild(
                    createProductCard(
                        product
                    )
                );

            }
        );


    } catch (error) {

        console.error(
            'Product/vendor search failed:',
            error
        );


        productGrid.innerHTML = `
            <p style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 40px;
                color: #b00020;
            ">
                Unable to search products.
                Please check your server connection.
            </p>
        `;

    }

}
    /* ==========================================
       CREATE PRODUCT CARD
    ========================================== */

    function createProductCard(product) {

        const card =
            document.createElement(
                'a'
            );


        card.className =
            'product-card';


        card.href =
            'DETAIL.html?product_id=' +
            encodeURIComponent(
                product.product_id
            );


        /* ==========================================
           SELLER
        ========================================== */

        const seller =
            document.createElement(
                'div'
            );


        seller.className =
            'product-seller';


        // Shop name + photo open the shop page. The card itself is a link
        // (to the product), and links can't be nested — so this row acts
        // as its own link and stops the card's click.
        const shopUrl =
            'SHOP.html?vendor_id=' +
            encodeURIComponent(product.user_id);

        seller.setAttribute('role', 'link');
        seller.tabIndex = 0;
        seller.title = 'Visit shop';

        const openShop = function (event) {
            event.preventDefault();
            event.stopPropagation();
            window.location.href = shopUrl;
        };

        seller.addEventListener('click', openShop);
        seller.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') openShop(event);
        });


        const avatar =
            document.createElement(
                'div'
            );


        avatar.className =
            'seller-avatar';


        avatar.style.background =
            '#2e6930';


        // Seller's profile photo (stored relative to the project root)
        if (product.profile_picture) {

            const photo =
                document.createElement('img');

            photo.src =
                /^https?:\/\//i.test(product.profile_picture)
                    ? product.profile_picture
                    : '../' + product.profile_picture;

            photo.alt = '';

            photo.style.cssText =
                'width:100%;height:100%;border-radius:50%;object-fit:cover;';

            photo.onerror = function () {
                this.remove();
            };

            avatar.appendChild(photo);

        }


        const sellerMeta =
            document.createElement(
                'div'
            );


        sellerMeta.className =
            'seller-meta';


        const sellerName =
            document.createElement(
                'span'
            );


        sellerName.className =
            'seller-name';


        const sellerFirstName =
            product.first_name || '';


        const sellerLastName =
            product.last_name || '';


        const sellerFullName =
            (
                sellerFirstName +
                ' ' +
                sellerLastName
            ).trim();


        sellerName.textContent =
            product.store_name ||
            sellerFullName ||
            'Seller';


        const postTime =
            document.createElement(
                'span'
            );


        postTime.className =
            'post-time';


        postTime.textContent =
            formatPostTime(
                product.submitted_at
            );


        sellerMeta.appendChild(
            sellerName
        );


        sellerMeta.appendChild(
            postTime
        );


        seller.appendChild(
            avatar
        );


        seller.appendChild(
            sellerMeta
        );


        /* ==========================================
           PRODUCT IMAGE
        ========================================== */

        const imageWrap =
            document.createElement(
                'div'
            );


        imageWrap.className =
            'product-img-wrap';


        const image =
            document.createElement(
                'img'
            );


        image.src =
            product.product_image ||
            'products/no_photo.jpg';


        image.alt =
            product.product_name ||
            'Product';


        image.loading =
            'lazy';


        image.onerror =
            function () {

                this.onerror = null;

                this.src =
                    'products/no_photo.jpg';

            };


        imageWrap.appendChild(
            image
        );


        /* ==========================================
           PRODUCT INFO
        ========================================== */

        const info =
            document.createElement(
                'div'
            );


        info.className =
            'product-info';


        const name =
            document.createElement(
                'h3'
            );


        name.className =
            'product-name';


        name.textContent =
            product.product_name;


        const price =
            document.createElement(
                'div'
            );


        price.className =
            'product-price';


        price.textContent =
            '₱' +
            Number(
                product.price
            ).toLocaleString(
                'en-PH',
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        info.appendChild(
            name
        );


        // ★ 4.8 (12) — only when the product has reviews
        if (Number(product.review_count) > 0) {

            const rating =
                document.createElement('div');

            rating.className = 'product-rating';
            rating.style.cssText = 'font-size:0.8rem;color:#6b7c72;margin:2px 0 4px;';
            rating.innerHTML =
                '<span style="color:#f5a623">★</span> ' +
                Number(product.rating).toFixed(1) +
                ' <span>(' + Number(product.review_count) + ')</span>';

            info.appendChild(rating);

        }


        info.appendChild(
            price
        );


        /* ==========================================
           CARD
        ========================================== */

        card.appendChild(
            seller
        );


        card.appendChild(
            imageWrap
        );


        card.appendChild(
            info
        );


        return card;

    }


    /* ==========================================
       SHOW CATEGORY
    ========================================== */

    function showGrid(
        gridId,
        activeTitle,
        subButtons,
        productGrid
    ) {

        activeTitle.textContent =
            titleMap[gridId] ||
            gridId;


        subButtons.forEach(
            btn => {

                const target =
                    btn.getAttribute(
                        'data-target'
                    );


                btn.classList.toggle(
                    'active',
                    target === gridId
                );

            }
        );


        loadProducts(
            gridId,
            productGrid
        );

    }


    /* ==========================================
       CLEAR SEARCH
       Used when clicking a category
    ========================================== */

    function clearSearch() {

        const url =
            new URL(
                window.location.href
            );


        url.searchParams.delete(
            'q'
        );


        window.history.replaceState(
            {},
            '',
            url.pathname +
            url.hash
        );


        if (searchInput) {

            searchInput.value = '';

        }

    }


    /* ==========================================
       START MARKETPLACE
    ========================================== */

    async function startMarketplace() {

        const isLoggedIn =
            await checkSession();


        if (!isLoggedIn) {

            return;

        }


        // Sidebar from the categories table (before the buttons are wired up)
        await buildSidebar();


        /* ==========================================
           PAGE ELEMENTS
        ========================================== */

        const parentButtons =
            document.querySelectorAll(
                '.sidebar-category > .parent-btn'
            );


        const subButtons =
            document.querySelectorAll(
                '.sidebar-subnav .sub-btn'
            );


        const activeTitle =
            document.getElementById(
                'activeCategoryTitle'
            );


        const productGrid =
            document.getElementById(
                'productGrid'
            );


        /* ==========================================
           SEARCH BAR
        ========================================== */

        const url =
            new URL(
                window.location.href
            );


        const searchQuery =
            (
                url.searchParams.get(
                    'q'
                ) || ''
            ).trim();


        if (searchInput && searchQuery) {

            searchInput.value =
                searchQuery;

        }


        /* ==========================================
           SEARCH FORM SUBMIT
        ========================================== */

        if (searchForm) {

            searchForm.addEventListener(
                'submit',
                function (e) {

                    const search =
                        searchInput
                            ? searchInput.value.trim()
                            : '';


                    if (!search) {

                        e.preventDefault();

                        clearSearch();

                        return;

                    }

                    /*
                     * Let the form normally navigate to:
                     *
                     * MARKETPLACE.html?q=search
                     */

                }
            );

        }


        /* ==========================================
           PARENT CATEGORY BUTTONS
        ========================================== */

        parentButtons.forEach(
            button => {

                button.addEventListener(
                    'click',
                    function (e) {

                        e.stopPropagation();


                        clearSearch();


                        const groupKey =
                            this.getAttribute(
                                'data-group'
                            );


                        const gridId =
                            groupToGrid[
                                groupKey
                            ];


                        const subnav =
                            this.nextElementSibling;


                        const isCurrentlyActive =
                            this.classList.contains(
                                'active'
                            );


                        /* Close all subnavs */

                        document
                            .querySelectorAll(
                                '.sidebar-subnav'
                            )
                            .forEach(
                                el => {

                                    el.style.display =
                                        'none';

                                }
                            );


                        /* Remove active */

                        document
                            .querySelectorAll(
                                '.sidebar-category > .parent-btn'
                            )
                            .forEach(
                                el => {

                                    el.classList.remove(
                                        'active'
                                    );

                                }
                            );


                        if (!isCurrentlyActive) {

                            this.classList.add(
                                'active'
                            );


                            if (subnav) {

                                subnav.style.display =
                                    'block';

                            }

                        }


                        if (gridId) {

                            showGrid(
                                gridId,
                                activeTitle,
                                subButtons,
                                productGrid
                            );

                        }

                    }
                );

            }
        );


        /* ==========================================
           SUBCATEGORY BUTTONS
        ========================================== */

        subButtons.forEach(
            button => {

                button.addEventListener(
                    'click',
                    function (e) {

                        e.stopPropagation();


                        clearSearch();


                        const gridId =
                            this.getAttribute(
                                'data-target'
                            );


                        if (gridId) {

                            showGrid(
                                gridId,
                                activeTitle,
                                subButtons,
                                productGrid
                            );

                        }

                    }
                );

            }
        );


        /* ==========================================
           INITIAL CATEGORY
        ========================================== */

        const validCategories = [

            'all-products',

            'fertilizers-soil',

            'tools-pots',

            'veg-seedlings',

            'fruit-seedlings',

            'herb-seedlings',

            'flowering-bushes',

            'ornamental-bushes',

            'landscaping-bushes',

            'fruit-saplings',

            'native-saplings',

            'shade-saplings'

        ];


        let initialCategory =
            window.location.hash.substring(1);


        if (
            !validCategories.includes(initialCategory) &&
            !queryMap[initialCategory]
        ) {

            initialCategory =
                'all-products';

        }


        /* ==========================================
           RESET ACTIVE BUTTONS
        ========================================== */

        subButtons.forEach(
            btn => {

                btn.classList.remove(
                    'active'
                );

            }
        );


        parentButtons.forEach(
            btn => {

                btn.classList.remove(
                    'active'
                );

            }
        );


        /* ==========================================
           INITIAL CATEGORY BUTTON
        ========================================== */

        const initialSubButton =
            document.querySelector(
                '.sub-btn[data-target="' +
                initialCategory +
                '"]'
            );


        /* A whole main category (e.g. MARKETPLACE.html#seedlings) */
        const initialParentButton =
            document.querySelector(
                '.parent-btn[data-group="' + initialCategory + '"]'
            );

        if (initialParentButton) {

            initialParentButton.classList.add('active');

            const subnav = initialParentButton.nextElementSibling;
            if (subnav) subnav.style.display = 'block';

        }


        /* "All Products" is a parent button with no subcategories */
        if (initialCategory === 'all-products') {

            const allButton =
                document.querySelector(
                    '.parent-btn[data-group="all"]'
                );

            if (allButton) {

                allButton.classList.add(
                    'active'
                );

            }

        }


        if (initialSubButton) {

            initialSubButton.classList.add(
                'active'
            );


            const parentCategory =
                initialSubButton.closest(
                    '.sidebar-category'
                );


            if (parentCategory) {

                const parentButton =
                    parentCategory.querySelector(
                        '.parent-btn'
                    );


                const parentSubnav =
                    parentCategory.querySelector(
                        '.sidebar-subnav'
                    );


                if (parentButton) {

                    parentButton.classList.add(
                        'active'
                    );

                }


                if (parentSubnav) {

                    parentSubnav.style.display =
                        'block';

                }

            }

        }


        /* ==========================================
           SEARCH OR CATEGORY LOAD
        ========================================== */

        if (searchQuery) {

            await searchProducts(
                searchQuery,
                productGrid,
                activeTitle
            );

        } else {

            showGrid(
                initialCategory,
                activeTitle,
                subButtons,
                productGrid
            );

        }

    }


    /* ==========================================
       START
    ========================================== */

    startMarketplace();

})();