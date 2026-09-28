/* ============================================================
   Punlaan Admin — User Management
   Verification / All Users / Blocked Users
   ============================================================ */

import { icon } from './admin-icons.js';

const isSuperAdmin = () =>
    Number(window.ADMIN_USER?.is_superadmin) === 1;

/* ============================================================
   HELPERS
   ============================================================ */

function avatarColor(name) {
    const c = [
        '#2d6a4f',
        '#1d4ed8',
        '#9333ea',
        '#b45309',
        '#0891b2',
        '#dc2626'
    ];

    let h = 0;

    for (let i = 0; i < (name || '').length; i++) {
        h = (h * 31 + name.charCodeAt(i)) % c.length;
    }

    return c[h];
}

function avatarInitials(name) {
    return (name || '?')
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();
}

async function postJSON(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        credentials: 'same-origin'
    });

    return response.json();
}

/* ============================================================
   VERIFICATION
   ============================================================ */

let VERIFICATIONS = [];
const vState = {
    filter: 'Pending',
    search: ''
};

function verificationStatusMeta(s) {
    return {
        Pending: { cls: 'badge-pending' },
        Approved: { cls: 'badge-live' },
        Rejected: { cls: 'badge-flagged' }
    }[s] || { cls: '' };
}

export async function loadVerifications() {
    try {
        const response = await fetch('get_verifications.php');

        if (!response.ok) {
            throw new Error('Failed to load verifications.');
        }

        VERIFICATIONS = await response.json();

    } catch (err) {
        console.error(err);
        VERIFICATIONS = [];
    }

    renderVerifications();
}

function renderVerifications() {
    const content = document.getElementById('content');

    const pending =
        VERIFICATIONS.filter(v => v.status === 'Pending');

    const approved =
        VERIFICATIONS.filter(v => v.status === 'Approved');

    const rejected =
        VERIFICATIONS.filter(v => v.status === 'Rejected');

    const filterMap = {
        All: VERIFICATIONS,
        Pending: pending,
        Approved: approved,
        Rejected: rejected
    };

    const q = vState.search.toLowerCase();

    const rows =
        (filterMap[vState.filter] || VERIFICATIONS)
            .filter(v =>
                !q ||
                (v.name || '').toLowerCase().includes(q) ||
                (v.email || '').toLowerCase().includes(q)
            );

    const FILTERS = [
        {
            key: 'All',
            label: `All (${VERIFICATIONS.length})`
        },
        {
            key: 'Pending',
            label: `Pending (${pending.length})`
        },
        {
            key: 'Approved',
            label: `Approved (${approved.length})`
        },
        {
            key: 'Rejected',
            label: `Rejected (${rejected.length})`
        }
    ];

    content.innerHTML = `
        <div class="page-container">

            <h1 class="page-title">
                Admin Side:
                <span class="accent">VENDOR VERIFICATION</span>
            </h1>

            <div class="stat-grid-3" style="margin-bottom:var(--space-5)">

                <div class="stat-card-icon">
                    <div>
                        <p class="stat-card-title">
                            Pending Verification
                        </p>

                        <p class="stat-card-value">
                            ${pending.length}
                        </p>

                        <p class="stat-sub" style="font-size:12px">
                            Awaiting Review
                        </p>
                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--yellow-50)"
                    >
                        <span style="color:var(--yellow-500)">
                            ${icon('shieldCheck', 22)}
                        </span>
                    </div>
                </div>

                <div class="stat-card-icon">
                    <div>
                        <p class="stat-card-title">
                            Approved
                        </p>

                        <p class="stat-card-value">
                            ${approved.length}
                        </p>

                        <p class="stat-sub" style="font-size:12px">
                            Verified Vendors
                        </p>
                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--green-50)"
                    >
                        <span style="color:var(--green-600)">
                            ${icon('userCheck', 22)}
                        </span>
                    </div>
                </div>

                <div class="stat-card-icon">
                    <div>
                        <p class="stat-card-title">
                            Rejected
                        </p>

                        <p class="stat-card-value">
                            ${rejected.length}
                        </p>

                        <p class="stat-sub" style="font-size:12px">
                            Did Not Qualify
                        </p>
                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--red-50)"
                    >
                        <span style="color:var(--red-500)">
                            ${icon('ban', 22)}
                        </span>
                    </div>
                </div>

            </div>

            <div class="order-table-wrap">

                <div class="table-toolbar">

                    <div class="toolbar-tabs">

                        ${FILTERS.map(f => `
                            <button
                                class="toolbar-tab ${
                                    vState.filter === f.key
                                        ? 'active'
                                        : ''
                                }"
                                data-verify-filter="${f.key}"
                            >
                                ${f.label}
                            </button>
                        `).join('')}

                    </div>

                    <div class="toolbar-search">
                        ${icon('search')}

                        <input
                            id="verify-search"
                            type="text"
                            placeholder="Search name, email..."
                            value="${vState.search}"
                        >
                    </div>

                </div>

                <div class="table-scroll">

                    <table class="orders-table">

                        <thead>
                            <tr>
                                <th>Vendor</th>
                                <th>Email</th>
                                <th>Documents</th>
                                <th>Submitted</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>

                            ${
                                rows.length === 0
                                    ? `
                                        <tr>
                                            <td
                                                colspan="6"
                                                class="empty-row"
                                            >
                                                No verification requests match
                                                your filters.
                                            </td>
                                        </tr>
                                    `
                                    : rows.map(v => {

                                        const meta =
                                            verificationStatusMeta(
                                                v.status
                                            );

                                        const bg =
                                            avatarColor(v.name);

                                        return `
                                            <tr>

                                                <td>
                                                    <div class="user-cell">

                                                        <div
                                                            class="user-avatar-sm"
                                                            style="background:${bg}"
                                                        >
                                                            ${avatarInitials(v.name)}
                                                        </div>

                                                        <div>

                                                            <p
                                                                style="
                                                                    font-size:13px;
                                                                    font-weight:600;
                                                                    color:var(--gray-800)
                                                                "
                                                            >
                                                                ${v.name || '—'}
                                                            </p>

                                                            <span
                                                                class="type-pill company"
                                                            >
                                                                ${v.type || 'Vendor'}
                                                            </span>

                                                        </div>

                                                    </div>
                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${v.email || '—'}
                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="
                                                        font-size:13px;
                                                        max-width:220px
                                                    "
                                                >
                                                    ${
                                                        (v.doc_files || []).length
                                                            ? v.doc_files
                                                                .map(d => `
                                                                    <a
                                                                        href="${d.url}"
                                                                        target="_blank"
                                                                        rel="noopener"
                                                                        style="
                                                                            color:var(--green-600);
                                                                            text-decoration:underline;
                                                                            display:block
                                                                        "
                                                                    >
                                                                        ${d.type}
                                                                    </a>
                                                                `)
                                                                .join('')
                                                            : 'No documents submitted'
                                                    }
                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${
                                                        v.submitted
                                                            ? new Date(
                                                                v.submitted
                                                            ).toLocaleDateString(
                                                                'en-US',
                                                                {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric'
                                                                }
                                                            )
                                                            : '—'
                                                    }
                                                </td>

                                                <td>
                                                    <span
                                                        class="listing-badge ${meta.cls}"
                                                    >
                                                        ${v.status}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div class="action-cell">

                                                        ${
                                                            v.status === 'Pending'
                                                                ? `
                                                                    <button
                                                                        class="action-link approve"
                                                                        data-verify-approve="${v.user_id}"
                                                                    >
                                                                        Approve
                                                                    </button>

                                                                    <span class="action-divider">
                                                                        |
                                                                    </span>

                                                                    <button
                                                                        class="action-link reject"
                                                                        data-verify-reject="${v.user_id}"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                `
                                                                : `
                                                                    <button
                                                                        class="action-link view"
                                                                    >
                                                                        ${icon('eye', 12)}
                                                                        View
                                                                    </button>
                                                                `
                                                        }

                                                    </div>
                                                </td>

                                            </tr>
                                        `;
                                    }).join('')
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    `;

    attachVerificationEvents();
}

function attachVerificationEvents() {

    document
        .querySelectorAll('[data-verify-filter]')
        .forEach(b => {

            b.addEventListener('click', () => {

                vState.filter =
                    b.dataset.verifyFilter;

                renderVerifications();
            });
        });

    const si =
        document.getElementById('verify-search');

    if (si) {

        si.addEventListener('input', e => {

            vState.search =
                e.target.value;

            renderVerifications();

            const n =
                document.getElementById('verify-search');

            if (n) {

                n.focus();

                n.setSelectionRange(
                    vState.search.length,
                    vState.search.length
                );
            }
        });
    }

    document
        .querySelectorAll('[data-verify-approve]')
        .forEach(b => {

            b.addEventListener('click', async () => {

                const result = await postJSON(
                    'approve_vendor.php',
                    {
                        user_id:
                            b.dataset.verifyApprove
                    }
                );

                if (result.success) {
                    loadVerifications();
                } else {
                    alert(
                        result.message ||
                        'Failed to approve vendor.'
                    );
                }
            });
        });

    document
        .querySelectorAll('[data-verify-reject]')
        .forEach(b => {

            b.addEventListener('click', async () => {

                if (
                    !confirm(
                        'Reject this vendor verification request?'
                    )
                ) {
                    return;
                }

                const result = await postJSON(
                    'reject_vendor.php',
                    {
                        user_id:
                            b.dataset.verifyReject
                    }
                );

                if (result.success) {
                    loadVerifications();
                } else {
                    alert(
                        result.message ||
                        'Failed to reject vendor.'
                    );
                }
            });
        });
}

/* ============================================================
   ALL USER ACCOUNTS
   ============================================================ */

let ALL_USERS = [];

const uState = {
    filter: 'All',
    search: ''
};

function userStatusMeta(s) {
    return {
        Active: {
            cls: 'badge-live'
        },

        Suspended: {
            cls: 'badge-pending'
        }
    }[s] || {
        cls: ''
    };
}

export async function loadAllUsers() {

    try {

        const response =
            await fetch('get_all_users.php');

        if (!response.ok) {
            throw new Error(
                'Failed to load users.'
            );
        }

        ALL_USERS =
            await response.json();

    } catch (err) {

        console.error(err);

        ALL_USERS = [];
    }

    renderAllUsers();
}

function renderAllUsers() {

    const content =
        document.getElementById('content');

    const customers =
        ALL_USERS.filter(
            u => u.type === 'Customer'
        );

    const vendors =
        ALL_USERS.filter(
            u => u.type === 'Vendor'
        );

    const admins =
        ALL_USERS.filter(
            u => u.type === 'Admin'
        );

    const active =
        ALL_USERS.filter(
            u => u.status === 'Active'
        );

    const suspended =
        ALL_USERS.filter(
            u => u.status === 'Suspended'
        );

    const filterMap = {
        All: ALL_USERS,
        Customer: customers,
        Vendor: vendors,
        Admin: admins,
        Suspended: suspended
    };

    const q =
        uState.search.toLowerCase();

    const rows =
        (filterMap[uState.filter] || ALL_USERS)
            .filter(u =>
                !q ||
                (u.name || '')
                    .toLowerCase()
                    .includes(q) ||
                (u.email || '')
                    .toLowerCase()
                    .includes(q)
            );

    const FILTERS = [
        {
            key: 'All',
            label: `All (${ALL_USERS.length})`
        },

        {
            key: 'Customer',
            label: `Customers (${customers.length})`
        },

        {
            key: 'Vendor',
            label: `Vendors (${vendors.length})`
        },

        {
            key: 'Admin',
            label: `Admins (${admins.length})`
        },

        {
            key: 'Suspended',
            label: `Suspended (${suspended.length})`
        }
    ];

    content.innerHTML = `

        <div class="page-container">

            <div class="page-title-row">

                <h1 class="page-title">
                    Admin Side:
                    <span class="accent">
                        ALL USER ACCOUNTS
                    </span>
                </h1>

                ${
                    isSuperAdmin()
                        ? `
                            <button
                                type="button"
                                class="create-admin-btn"
                                id="createAdminBtn"
                            >
                                ${icon('userPlus', 16)}
                                Create Admin Account
                            </button>
                        `
                        : ''
                }

            </div>

            <div
                class="stat-grid-3"
                style="margin-bottom:var(--space-5)"
            >

                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Total Users
                        </p>

                        <p class="stat-card-value">
                            ${ALL_USERS.length}
                        </p>

                        <p
                            class="stat-sub"
                            style="font-size:12px"
                        >
                            Customers, Vendors &amp; Admins
                        </p>

                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--blue-50)"
                    >
                        <span style="color:var(--blue-600)">
                            ${icon('users', 22)}
                        </span>
                    </div>

                </div>

                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Active Accounts
                        </p>

                        <p class="stat-card-value">
                            ${active.length}
                        </p>

                        <p
                            class="stat-sub"
                            style="font-size:12px"
                        >
                            In Good Standing
                        </p>

                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--green-50)"
                    >
                        <span style="color:var(--green-600)">
                            ${icon('userCheck', 22)}
                        </span>
                    </div>

                </div>

                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Suspended
                        </p>

                        <p class="stat-card-value">
                            ${suspended.length}
                        </p>

                        <p
                            class="stat-sub"
                            style="font-size:12px"
                        >
                            Temporarily Restricted
                        </p>

                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--yellow-50)"
                    >
                        <span style="color:var(--yellow-500)">
                            ${icon('alertTriangle', 22)}
                        </span>
                    </div>

                </div>

            </div>

            <div class="order-table-wrap">

                <div class="table-toolbar">

                    <div class="toolbar-tabs">

                        ${FILTERS.map(f => `
                            <button
                                class="toolbar-tab ${
                                    uState.filter === f.key
                                        ? 'active'
                                        : ''
                                }"
                                data-user-filter="${f.key}"
                            >
                                ${f.label}
                            </button>
                        `).join('')}

                    </div>

                    <div class="toolbar-search">

                        ${icon('search')}

                        <input
                            id="user-search"
                            type="text"
                            placeholder="Search name, email..."
                            value="${uState.search}"
                        >

                    </div>

                </div>

                <div class="table-scroll">

                    <table class="orders-table">

                        <thead>

                            <tr>
                                <th>
                                    <input type="checkbox">
                                </th>

                                <th>User</th>
                                <th>Email</th>
                                <th>Type</th>
                                <th>Joined</th>
                                <th>Orders</th>
                                <th>Spent</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${
                                rows.length === 0
                                    ? `
                                        <tr>
                                            <td
                                                colspan="9"
                                                class="empty-row"
                                            >
                                                No users match
                                                your filters.
                                            </td>
                                        </tr>
                                    `
                                    : rows.map(u => {

                                        const meta =
                                            userStatusMeta(
                                                u.status
                                            );

                                        const bg =
                                            avatarColor(u.name);

                                        const typeIcon =
                                            u.type === 'Vendor'
                                                ? 'building2'
                                                : u.type === 'Admin'
                                                    ? 'shieldCheck'
                                                    : 'user';

                                        const typeClass =
                                            u.type === 'Vendor'
                                                ? 'company'
                                                : u.type === 'Admin'
                                                    ? 'admin'
                                                    : 'individual';

                                        const isOwnAccount =
                                            Number(u.user_id) ===
                                            Number(
                                                window.ADMIN_USER?.user_id
                                            );

                                        /*
                                         * Admin accounts:
                                         * - Normal Admin cannot manage them.
                                         * - Super Admin can manage other admins.
                                         * - Nobody can manage their own account.
                                         */
                                        const protectedAccount =
                                            (
                                                u.type === 'Admin' &&
                                                !isSuperAdmin()
                                            ) ||
                                            isOwnAccount;

                                        return `

                                            <tr>

                                                <td>
                                                    <input type="checkbox">
                                                </td>

                                                <td>

                                                    <div class="user-cell">

                                                        <div
                                                            class="user-avatar-sm"
                                                            style="background:${bg}"
                                                        >
                                                            ${avatarInitials(u.name)}
                                                        </div>

                                                        <p
                                                            style="
                                                                font-size:13px;
                                                                font-weight:600;
                                                                color:var(--gray-800)
                                                            "
                                                        >
                                                            ${u.name || '—'}
                                                        </p>

                                                    </div>

                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${u.email || '—'}
                                                </td>

                                                <td>

                                                    <span
                                                        class="type-pill ${typeClass}"
                                                    >
                                                        ${icon(typeIcon, 10)}
                                                        ${u.type === 'Admin' ? (Number(u.is_superadmin) === 1 ? 'Super Admin' : 'Moderator') : u.type}
                                                    </span>

                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${u.joined || '—'}
                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${u.orders ?? 0}
                                                </td>

                                                <td class="cell-bold">
                                                    ${u.spent || '₱0.00'}
                                                </td>

                                                <td>
                                                    <span
                                                        class="listing-badge ${meta.cls}"
                                                    >
                                                        ${u.status}
                                                    </span>
                                                </td>

                                                <td>

                                                    <div class="action-cell">

                                                        ${
                                                            protectedAccount
                                                                ? `
                                                                    <span
                                                                        class="cell-muted"
                                                                    >
                                                                        ${
                                                                            isOwnAccount
                                                                                ? 'Your Account'
                                                                                : 'Protected'
                                                                        }
                                                                    </span>
                                                                `
                                                                : `
                                                                    ${
                                                                        u.status === 'Active'
                                                                            ? `
                                                                                <button
                                                                                    class="action-link reject"
                                                                                    data-user-suspend="${u.user_id}"
                                                                                >
                                                                                    Suspend
                                                                                </button>
                                                                            `
                                                                            : `
                                                                                <button
                                                                                    class="action-link approve"
                                                                                    data-user-reinstate="${u.user_id}"
                                                                                >
                                                                                    Reinstate
                                                                                </button>
                                                                            `
                                                                    }

                                                                    <span class="action-divider">
                                                                        |
                                                                    </span>

                                                                    <button
                                                                        class="action-link reject"
                                                                        data-user-block="${u.user_id}"
                                                                    >
                                                                        Block
                                                                    </button>

                                                                    ${u.type === 'Admin' ? `
                                                                        <span class="action-divider">|</span>
                                                                        <button
                                                                            class="action-link approve"
                                                                            data-user-role="${u.user_id}"
                                                                            data-role="${Number(u.is_superadmin) === 1 ? 'moderator' : 'super'}"
                                                                        >
                                                                            ${Number(u.is_superadmin) === 1 ? 'Make Moderator' : 'Make Super Admin'}
                                                                        </button>
                                                                    ` : ''}
                                                                `
                                                        }

                                                    </div>

                                                </td>

                                            </tr>

                                        `;
                                    }).join('')
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    `;

    document
        .getElementById('createAdminBtn')
        ?.addEventListener(
            'click',
            openCreateAdminModal
        );

    // Super Admin only: switch another admin between Super Admin and Moderator
    document.querySelectorAll('[data-user-role]').forEach(b => {
        b.addEventListener('click', async () => {
            const toSuper = b.dataset.role === 'super';
            const question = toSuper
                ? 'Make this admin a Super Admin? They will be able to manage admins, payouts and settings.'
                : 'Make this admin a Moderator? They will lose access to admins, payouts and settings.';
            if (!confirm(question)) return;

            const result = await postJSON('superadmin/set_admin_role.php', {
                user_id: b.dataset.userRole,
                role: b.dataset.role
            });
            if (result.success) loadAllUsers();
            else alert(result.message || 'Could not change the role.');
        });
    });

    attachAllUsersEvents();
}

/* ============================================================
   CREATE ADMIN MODAL
   ============================================================ */

function openCreateAdminModal() {

    document
        .getElementById('createAdminModal')
        ?.remove();

    document.body.insertAdjacentHTML(
        'beforeend',
        `
            <div
                class="admin-modal-overlay"
                id="createAdminModal"
            >

                <div class="admin-modal">

                    <div class="admin-modal-header">

                        <div>

                            <h2>
                                Create Admin Account
                            </h2>

                            <p>
                                Create a new Punlaan administrator account.
                            </p>

                        </div>

                        <button
                            type="button"
                            class="admin-modal-close"
                            id="closeCreateAdmin"
                        >
                            ×
                        </button>

                    </div>

                    <form id="createAdminForm">

                        <div class="admin-form-grid">

                            <div class="admin-form-field">

                                <label for="adminFirstName">
                                    First Name
                                </label>

                                <input
                                    type="text"
                                    id="adminFirstName"
                                    name="first_name"
                                    required
                                >

                            </div>

                            <div class="admin-form-field">

                                <label for="adminLastName">
                                    Last Name
                                </label>

                                <input
                                    type="text"
                                    id="adminLastName"
                                    name="last_name"
                                    required
                                >

                            </div>

                        </div>

                        <div class="admin-form-field">

                            <label for="adminEmail">
                                Email
                            </label>

                            <input
                                type="email"
                                id="adminEmail"
                                name="email"
                                placeholder="admin@punlaan.com"
                                required
                            >

                        </div>

                        <div class="admin-form-field">

                            <label for="adminPassword">
                                Password
                            </label>

                            <input
                                type="password"
                                id="adminPassword"
                                name="password"
                                minlength="8"
                                required
                            >

                        </div>

                        <div
                            class="admin-form-error"
                            id="createAdminError"
                        ></div>

                        <div class="admin-modal-actions">

                            <button
                                type="button"
                                class="admin-cancel-btn"
                                id="cancelCreateAdmin"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                class="admin-submit-btn"
                                id="submitCreateAdmin"
                            >
                                Create Admin
                            </button>

                        </div>

                    </form>

                </div>

            </div>
        `
    );

    const modal =
        document.getElementById(
            'createAdminModal'
        );

    const form =
        document.getElementById(
            'createAdminForm'
        );

    const closeModal =
        () => modal?.remove();

    document
        .getElementById('closeCreateAdmin')
        ?.addEventListener(
            'click',
            closeModal
        );

    document
        .getElementById('cancelCreateAdmin')
        ?.addEventListener(
            'click',
            closeModal
        );

    modal?.addEventListener(
        'click',
        e => {

            if (e.target === modal) {
                closeModal();
            }
        }
    );

    form?.addEventListener(
        'submit',
        async e => {

            e.preventDefault();

            const errorEl =
                document.getElementById(
                    'createAdminError'
                );

            const submitBtn =
                document.getElementById(
                    'submitCreateAdmin'
                );

            errorEl.textContent = '';

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            try {

                const response =
                    await fetch(
                        'superadmin/create_admin.php',
                        {
                            method: 'POST',
                            credentials: 'same-origin',
                            body: new FormData(form)
                        }
                    );

                if (!response.ok) {

                    throw new Error(
                        `Server returned HTTP ${response.status}`
                    );
                }

                const result =
                    await response.json();

                if (!result.success) {

                    errorEl.textContent =
                        result.message ||
                        'Could not create admin account.';

                    return;
                }

                alert(
                    'Admin account created successfully.'
                );

                closeModal();

                await loadAllUsers();

            } catch (error) {

                console.error(
                    'Create admin failed:',
                    error
                );

                errorEl.textContent =
                    error.message ||
                    'Unable to connect to the server.';

            } finally {

                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Admin';
            }
        }
    );
}

/* ============================================================
   ALL USERS EVENTS
   ============================================================ */

function attachAllUsersEvents() {

    document
        .querySelectorAll('[data-user-filter]')
        .forEach(b => {

            b.addEventListener(
                'click',
                () => {

                    uState.filter =
                        b.dataset.userFilter;

                    renderAllUsers();
                }
            );
        });

    const si =
        document.getElementById(
            'user-search'
        );

    if (si) {

        si.addEventListener(
            'input',
            e => {

                uState.search =
                    e.target.value;

                renderAllUsers();

                const n =
                    document.getElementById(
                        'user-search'
                    );

                if (n) {

                    n.focus();

                    n.setSelectionRange(
                        uState.search.length,
                        uState.search.length
                    );
                }
            }
        );
    }

    document
        .querySelectorAll('[data-user-suspend]')
        .forEach(b => {

            b.addEventListener(
                'click',
                async () => {

                    if (
                        !confirm(
                            'Suspend this user account?'
                        )
                    ) {
                        return;
                    }

                    const result =
                        await postJSON(
                            'suspend_user.php',
                            {
                                user_id:
                                    b.dataset.userSuspend
                            }
                        );

                    if (result.success) {
                        loadAllUsers();
                    } else {
                        alert(
                            result.message ||
                            'Failed to suspend user.'
                        );
                    }
                }
            );
        });

    document
        .querySelectorAll('[data-user-reinstate]')
        .forEach(b => {

            b.addEventListener(
                'click',
                async () => {

                    const result =
                        await postJSON(
                            'reinstate_user.php',
                            {
                                user_id:
                                    b.dataset.userReinstate
                            }
                        );

                    if (result.success) {
                        loadAllUsers();
                    } else {
                        alert(
                            result.message ||
                            'Failed to reinstate user.'
                        );
                    }
                }
            );
        });

    document
        .querySelectorAll('[data-user-block]')
        .forEach(b => {

            b.addEventListener(
                'click',
                async () => {

                    if (
                        !confirm(
                            'Block this user? They will lose access to the platform.'
                        )
                    ) {
                        return;
                    }

                    const result =
                        await postJSON(
                            'block_user.php',
                            {
                                user_id:
                                    b.dataset.userBlock
                            }
                        );

                    if (result.success) {
                        loadAllUsers();
                    } else {
                        alert(
                            result.message ||
                            'Failed to block user.'
                        );
                    }
                }
            );
        });
}

/* ============================================================
   BLOCKED USERS
   ============================================================ */

let BLOCKED_USERS = [];

const bState = {
    search: ''
};

export async function loadBlockedUsers() {

    try {

        const response =
            await fetch(
                'get_blocked_users.php'
            );

        if (!response.ok) {
            throw new Error(
                'Failed to load blocked users.'
            );
        }

        BLOCKED_USERS =
            await response.json();

    } catch (err) {

        console.error(err);

        BLOCKED_USERS = [];
    }

    renderBlockedUsers();
}

function renderBlockedUsers() {

    const content =
        document.getElementById(
            'content'
        );

    const q =
        bState.search.toLowerCase();

    const rows =
        BLOCKED_USERS.filter(u =>
            !q ||
            (u.name || '')
                .toLowerCase()
                .includes(q) ||
            (u.email || '')
                .toLowerCase()
                .includes(q)
        );

    const totalAppeals =
        BLOCKED_USERS.reduce(
            (sum, u) =>
                sum + (u.appeals || 0),
            0
        );

    const vendorCount =
        BLOCKED_USERS.filter(
            u => u.type === 'Vendor'
        ).length;

    content.innerHTML = `

        <div class="page-container">

            <h1 class="page-title">
                Admin Side:
                <span class="accent">
                    BLOCKED USERS
                </span>
            </h1>

            <div
                class="stat-grid-3"
                style="margin-bottom:var(--space-5)"
            >

                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Total Blocked
                        </p>

                        <p class="stat-card-value">
                            ${BLOCKED_USERS.length}
                        </p>

                        <p
                            class="stat-sub"
                            style="font-size:12px"
                        >
                            Restricted Accounts
                        </p>

                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--red-50)"
                    >
                        <span style="color:var(--red-500)">
                            ${icon('ban', 22)}
                        </span>
                    </div>

                </div>

                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Blocked Vendors
                        </p>

                        <p class="stat-card-value">
                            ${vendorCount}
                        </p>

                        <p
                            class="stat-sub"
                            style="font-size:12px"
                        >
                            Of Total Blocked
                        </p>

                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--yellow-50)"
                    >
                        <span style="color:var(--yellow-500)">
                            ${icon('building2', 22)}
                        </span>
                    </div>

                </div>

                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Pending Appeals
                        </p>

                        <p class="stat-card-value">
                            ${totalAppeals}
                        </p>

                        <p
                            class="stat-sub"
                            style="font-size:12px"
                        >
                            Awaiting Review
                        </p>

                    </div>

                    <div
                        class="stat-icon-box"
                        style="background:var(--blue-50)"
                    >
                        <span style="color:var(--blue-600)">
                            ${icon('alertCircle', 22)}
                        </span>
                    </div>

                </div>

            </div>

            <div class="order-table-wrap">

                <div class="table-toolbar">

                    <div
                        class="toolbar-search"
                        style="margin:var(--space-3) var(--space-4)"
                    >
                        ${icon('search')}

                        <input
                            id="blocked-search"
                            type="text"
                            placeholder="Search name, email..."
                            value="${bState.search}"
                        >
                    </div>

                </div>

                <div class="table-scroll">

                    <table class="orders-table">

                        <thead>

                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Type</th>
                                <th>Blocked Date</th>
                                <th>Reason</th>
                                <th>Blocked By</th>
                                <th>Appeals</th>
                                <th>Action</th>
                            </tr>

                        </thead>

                        <tbody>

                            ${
                                rows.length === 0
                                    ? `
                                        <tr>
                                            <td
                                                colspan="8"
                                                class="empty-row"
                                            >
                                                No blocked users right now.
                                            </td>
                                        </tr>
                                    `
                                    : rows.map(u => {

                                        const bg =
                                            avatarColor(
                                                u.name
                                            );

                                        const typeIcon =
                                            u.type === 'Vendor'
                                                ? 'building2'
                                                : u.type === 'Admin'
                                                    ? 'shieldCheck'
                                                    : 'user';

                                        const typeClass =
                                            u.type === 'Vendor'
                                                ? 'company'
                                                : u.type === 'Admin'
                                                    ? 'admin'
                                                    : 'individual';

                                        const isOwnAccount =
                                            Number(u.user_id) ===
                                            Number(
                                                window.ADMIN_USER?.user_id
                                            );

                                        const protectedAccount =
                                            (
                                                u.type === 'Admin' &&
                                                !isSuperAdmin()
                                            ) ||
                                            isOwnAccount;

                                        return `

                                            <tr>

                                                <td>

                                                    <div class="user-cell">

                                                        <div
                                                            class="user-avatar-sm"
                                                            style="background:${bg}"
                                                        >
                                                            ${avatarInitials(u.name)}
                                                        </div>

                                                        <p
                                                            style="
                                                                font-size:13px;
                                                                font-weight:600;
                                                                color:var(--gray-800)
                                                            "
                                                        >
                                                            ${u.name || '—'}
                                                        </p>

                                                    </div>

                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${u.email || '—'}
                                                </td>

                                                <td>

                                                    <span
                                                        class="type-pill ${typeClass}"
                                                    >
                                                        ${icon(typeIcon, 10)}
                                                        ${u.type}
                                                    </span>

                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${u.blockedDate || '—'}
                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${u.reason || '—'}
                                                </td>

                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${u.blockedBy || '—'}
                                                </td>

                                                <td
                                                    style="
                                                        color:${
                                                            u.appeals > 0
                                                                ? 'var(--orange-500)'
                                                                : 'var(--gray-400)'
                                                        };
                                                        font-weight:${
                                                            u.appeals > 0
                                                                ? 600
                                                                : 400
                                                        }
                                                    "
                                                >
                                                    ${u.appeals || 0}
                                                </td>

                                                <td>

                                                    <div class="action-cell">

                                                        ${
                                                            protectedAccount
                                                                ? `
                                                                    <span
                                                                        class="cell-muted"
                                                                    >
                                                                        ${
                                                                            isOwnAccount
                                                                                ? 'Your Account'
                                                                                : 'Protected'
                                                                        }
                                                                    </span>
                                                                `
                                                                : `
                                                                    <button
                                                                        class="action-link approve"
                                                                        data-user-unblock="${u.user_id}"
                                                                    >
                                                                        Unblock
                                                                    </button>
                                                                `
                                                        }

                                                    </div>

                                                </td>

                                            </tr>

                                        `;
                                    }).join('')
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    `;

    attachBlockedUsersEvents();
}

function attachBlockedUsersEvents() {

    const si =
        document.getElementById(
            'blocked-search'
        );

    if (si) {

        si.addEventListener(
            'input',
            e => {

                bState.search =
                    e.target.value;

                renderBlockedUsers();

                const n =
                    document.getElementById(
                        'blocked-search'
                    );

                if (n) {

                    n.focus();

                    n.setSelectionRange(
                        bState.search.length,
                        bState.search.length
                    );
                }
            }
        );
    }

    document
        .querySelectorAll('[data-user-unblock]')
        .forEach(b => {

            b.addEventListener(
                'click',
                async () => {

                    const result =
                        await postJSON(
                            'unblock_user.php',
                            {
                                user_id:
                                    b.dataset.userUnblock
                            }
                        );

                    if (result.success) {

                        loadBlockedUsers();

                    } else {

                        alert(
                            result.message ||
                            'Failed to unblock user.'
                        );
                    }
                }
            );
        });
}