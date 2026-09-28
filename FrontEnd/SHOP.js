/* SHOP.js — Vendor shop page (SHOP.html?vendor_id=123)
   Shows one vendor's shop info and all of their products. */

(function () {

    'use strict';

    const params = new URLSearchParams(window.location.search);
    const vendorId = params.get('vendor_id');

    const el = (id) => document.getElementById(id);

    let allProducts = [];
    let activeTab = 'all';


    /* ==========================================
       SESSION CHECK
       Same as the Marketplace: guests can browse too
    ========================================== */

    async function checkSession() {

        try {

            const response = await fetch('../register/session.php', {
                credentials: 'include',
                cache: 'no-store'
            });

            const result = await response.json();

            // Guest: guest-mode.js shows Log in / Register in the header
            if (!result.logged_in) {
                return true;
            }

            const fullName = [result.first_name, result.last_name]
                .filter(Boolean).join(' ').trim();

            el('usernameDisplay').textContent = fullName || 'User';

            return true;

        } catch (error) {

            console.error('Unable to check login session:', error);
            return true;

        }

    }


    /* ==========================================
       HELPERS
    ========================================== */

    function formatPrice(value) {
        return '₱' + Number(value).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatJoined(dateString) {
        const date = new Date(String(dateString).replace(' ', 'T'));
        if (isNaN(date)) return '—';
        return date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
    }

    function showMessage(iconClass, text, linkText, linkHref) {
        const box = el('shopMessage');
        box.innerHTML = '';

        const icon = document.createElement('i');
        icon.className = iconClass;

        const p = document.createElement('p');
        p.textContent = text;

        box.append(icon, p);

        if (linkText) {
            const a = document.createElement('a');
            a.href = linkHref;
            a.textContent = linkText;
            box.appendChild(a);
        }

        box.hidden = false;
    }


    /* ==========================================
       SHOP HEADER
    ========================================== */

    function renderShop(shop) {

        document.title = shop.store_name + ' | Punlaan';

        el('breadcrumbName').textContent = shop.store_name;

        // Photos are stored relative to the project root (uploads/…)
        const asset = (path) => !path ? '' : (/^https?:\/\//i.test(path) ? path : '../' + path);

        const avatar = el('shopAvatar');
        avatar.textContent = '';
        if (shop.avatar) {
            const img = document.createElement('img');
            img.src = asset(shop.avatar);
            img.alt = '';
            img.onerror = () => { avatar.textContent = shop.store_name.trim().charAt(0) || 'P'; };
            avatar.appendChild(img);
        } else {
            avatar.textContent = shop.store_name.trim().charAt(0) || 'P';
        }

        if (shop.banner) {
            el('shopBanner').style.backgroundImage = 'url("' + asset(shop.banner).replace(/"/g, '%22') + '")';
            el('shopBanner').classList.add('shop-banner--photo');
        }

        // Social / website links with their logos (link-icons.js)
        const linkBox = el('shopLinks');
        linkBox.innerHTML = '';
        (shop.links || []).forEach((link) => {
            const info = window.punlaanLinkInfo ? window.punlaanLinkInfo(link) : null;
            if (!info) return;
            const a = document.createElement('a');
            a.href = info.url;
            a.target = '_blank';
            a.rel = 'noopener nofollow';
            a.className = 'shop-link';
            a.title = info.label;
            a.setAttribute('aria-label', info.label);
            a.style.background = info.color;
            a.innerHTML = '<i class="' + info.icon + '"></i>';
            linkBox.appendChild(a);
        });
        linkBox.hidden = linkBox.children.length === 0;

        el('shopName').textContent = shop.store_name;
        el('shopOwner').textContent =
            shop.owner_name && shop.owner_name !== shop.store_name
                ? 'by ' + shop.owner_name
                : '';
        el('shopBio').textContent = shop.bio || '';

        el('statProducts').textContent = shop.product_count.toLocaleString('en-PH');
        el('statSold').textContent = shop.items_sold.toLocaleString('en-PH');
        el('statJoined').textContent = formatJoined(shop.joined);

        if (shop.location) {
            el('statLocation').textContent = shop.location;
            el('statLocationWrap').hidden = false;
        }

        el('shopHeader').hidden = false;
    }


    /* ==========================================
       CATEGORY TABS
       "All" + each subcategory this shop sells
    ========================================== */

    function renderTabs() {

        const counts = {};

        allProducts.forEach((p) => {
            const key = p.subcategory || p.category || 'Others';
            counts[key] = (counts[key] || 0) + 1;
        });

        const tabs = [['all', 'All', allProducts.length]]
            .concat(Object.keys(counts).sort().map((k) => [k, k, counts[k]]));

        const container = el('shopTabs');
        container.innerHTML = '';

        tabs.forEach(([key, label, count]) => {

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'shop-tab' + (key === activeTab ? ' active' : '');
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', key === activeTab ? 'true' : 'false');

            btn.append(label + ' ');

            const small = document.createElement('span');
            small.className = 'shop-tab__count';
            small.textContent = '(' + count + ')';
            btn.appendChild(small);

            btn.addEventListener('click', () => {
                activeTab = key;
                renderTabs();
                renderProducts();
            });

            container.appendChild(btn);
        });
    }


    /* ==========================================
       PRODUCT CARD
       Same markup/classes as the Marketplace card
    ========================================== */

    function createProductCard(product) {

        const card = document.createElement('a');
        card.className = 'product-card';
        card.href = 'DETAIL.html?product_id=' + encodeURIComponent(product.product_id);

        const imageWrap = document.createElement('div');
        imageWrap.className = 'product-img-wrap';

        const image = document.createElement('img');
        image.src = product.product_image || 'products/no_photo.jpg';
        image.alt = product.product_name || 'Product';
        image.loading = 'lazy';
        image.onerror = function () {
            this.onerror = null;
            this.src = 'products/no_photo.jpg';
        };

        imageWrap.appendChild(image);

        const info = document.createElement('div');
        info.className = 'product-info';

        const name = document.createElement('h3');
        name.className = 'product-name';
        name.textContent = product.product_name;

        const meta = document.createElement('div');
        meta.className = 'product-meta';

        const price = document.createElement('div');
        price.className = 'product-price';
        price.textContent = formatPrice(product.price);

        const sold = document.createElement('span');
        sold.className = 'product-sold';
        sold.textContent = product.sold > 0 ? product.sold + ' sold' : 'New';

        meta.append(price, sold);
        info.append(name, meta);

        if (product.location) {
            const loc = document.createElement('span');
            loc.className = 'product-location';
            loc.innerHTML = '<i class="fa-solid fa-location-dot"></i> ';
            loc.append(product.location);
            info.appendChild(loc);
        }

        card.append(imageWrap, info);

        return card;
    }


    /* ==========================================
       PRODUCT LIST (tab + search + sort)
    ========================================== */

    function renderProducts() {

        const query = el('shopSearch').value.trim().toLowerCase();
        const sort = el('shopSort').value;

        let list = allProducts.filter((p) => {
            const key = p.subcategory || p.category || 'Others';
            if (activeTab !== 'all' && key !== activeTab) return false;
            if (query && !String(p.product_name).toLowerCase().includes(query)) return false;
            return true;
        });

        const sorters = {
            'newest': (a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)),
            'best': (a, b) => b.sold - a.sold,
            'price-asc': (a, b) => a.price - b.price,
            'price-desc': (a, b) => b.price - a.price
        };

        list = list.slice().sort(sorters[sort] || sorters.newest);

        const grid = el('shopGrid');
        grid.innerHTML = '';
        list.forEach((p) => grid.appendChild(createProductCard(p)));

        el('shopResultCount').textContent =
            list.length + (list.length === 1 ? ' product' : ' products');

        const isEmpty = list.length === 0;
        el('shopEmpty').hidden = !isEmpty;
        el('shopEmptyText').textContent = allProducts.length === 0
            ? 'This shop has no products for sale right now.'
            : 'No products match your search.';
    }


    /* ==========================================
       LOAD SHOP
    ========================================== */

    async function loadShop() {

        if (!vendorId) {
            showMessage('fa-solid fa-store-slash', 'No shop was selected.',
                'Browse the Marketplace', 'MARKETPLACE.html');
            return;
        }

        try {

            const response = await fetch(
                'get_shop.php?vendor_id=' + encodeURIComponent(vendorId),
                { credentials: 'include' }
            );

            const result = await response.json();

            if (!result.success) {
                showMessage('fa-solid fa-store-slash',
                    result.message || 'This shop could not be found.',
                    'Browse the Marketplace', 'MARKETPLACE.html');
                return;
            }

            allProducts = (result.products || []).map((p) => ({
                ...p,
                price: Number(p.price) || 0,
                sold: Number(p.sold) || 0
            }));

            el('shopMessage').hidden = true;

            renderShop(result.shop);
            renderTabs();
            renderProducts();

            el('shopProducts').hidden = false;

        } catch (error) {

            console.error('Unable to load shop:', error);
            showMessage('fa-solid fa-triangle-exclamation',
                'Unable to load this shop. Please try again.');

        }
    }


    /* ==========================================
       START
    ========================================== */

    el('shopSearch').addEventListener('input', renderProducts);
    el('shopSort').addEventListener('change', renderProducts);

    checkSession().then((ok) => {
        if (ok) loadShop();
    });

})();
