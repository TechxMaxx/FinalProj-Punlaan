import { icon } from './admin-icons.js';

let BROADCASTS = [];
let ALL_USERS = null;


/* =========================================================
   LOAD BROADCAST HISTORY
========================================================= */

export async function loadNotifications() {

    try {

        const response =
            await fetch(
                'notification/get_broadcasts.php',
                {
                    credentials: 'include',
                    cache: 'no-store'
                }
            );


        if (!response.ok) {

            throw new Error(
                'Failed to load broadcasts.'
            );

        }


        BROADCASTS =
            await response.json();


        renderNotifications();


    } catch (err) {

        console.error(
            err
        );


        BROADCASTS = [];


        renderNotifications();

    }

}


/* =========================================================
   LOAD USERS
========================================================= */

async function ensureUsersLoaded() {

    if (ALL_USERS) {

        return;

    }


    try {

        const response =
            await fetch(
                'notification/get_all_users.php',
                {
                    credentials: 'include',
                    cache: 'no-store'
                }
            );


        if (!response.ok) {

            throw new Error(
                'Failed to load users.'
            );

        }


        ALL_USERS =
            await response.json();


        if (!Array.isArray(ALL_USERS)) {

            ALL_USERS = [];

        }


    } catch (err) {

        console.error(
            err
        );


        ALL_USERS = [];

    }

}


/* =========================================================
   AUDIENCES
========================================================= */

const AUDIENCES = [

    {
        key: 'All',
        label: 'All Users',
        icn: 'users'
    },

    // Saved as "Customers" in the database = accounts without the seller feature
    {
        key: 'Customers',
        label: 'Buyers Only',
        icn: 'user'
    },

    // Saved as "Vendors" = accounts with the seller feature
    {
        key: 'Vendors',
        label: 'Sellers Only',
        icn: 'building2'
    },

    {
        key: 'Specific',
        label: 'Specific User',
        icn: 'userCheck'
    }

];

const AUDIENCE_HINTS = {
    All: 'Everyone with an active account — buyers and sellers.',
    Customers: 'Only buyers who don\'t sell on Punlaan.',
    Vendors: 'Only sellers (accounts with the seller feature).',
    Specific: 'Only the one person you pick below.'
};


/* =========================================================
   PRIORITIES
========================================================= */

const PRIORITIES = [

    {
        key: 'Info',
        label: 'Info',
        cls: 'badge-live'
    },

    {
        key: 'Promo',
        label: 'Promo',
        cls: 'badge-pending'
    },

    {
        key: 'Urgent',
        label: 'Urgent',
        cls: 'badge-flagged'
    }

];


/* =========================================================
   STATE
========================================================= */

const state = {

    view: 'compose',

    filter: 'All',

    search: '',

    draftAudience: 'All',

    draftPriority: 'Info',

    draftUserId: null,

    draftUserName: ''

};


/* =========================================================
   PRIORITY META
========================================================= */

function priorityMeta(priority) {

    return (
        PRIORITIES.find(
            item =>
                item.key === priority
        ) ||
        PRIORITIES[0]
    );

}


/* =========================================================
   AUDIENCE LABEL
========================================================= */

function audienceLabel(broadcast) {

    if (
        broadcast.audience === 'Specific' &&
        broadcast.targetUserName
    ) {

        return (
            'To: ' +
            broadcast.targetUserName
        );

    }


    const found =
        AUDIENCES.find(
            audience =>
                audience.key ===
                broadcast.audience
        );


    return (
        found?.label ||
        broadcast.audience ||
        ''
    );

}


/* =========================================================
   FILTER HISTORY
========================================================= */

function filteredHistory() {

    const query =
        state.search.toLowerCase();


    return BROADCASTS.filter(
        broadcast => {

            const filterMatch =
                state.filter === 'All' ||
                broadcast.priority ===
                    state.filter;


            const searchMatch =
                !query ||
                String(
                    broadcast.title || ''
                )
                    .toLowerCase()
                    .includes(query) ||

                String(
                    broadcast.message || ''
                )
                    .toLowerCase()
                    .includes(query) ||

                String(
                    broadcast.targetUserName || ''
                )
                    .toLowerCase()
                    .includes(query);


            return (
                filterMatch &&
                searchMatch
            );

        }
    );

}


/* =========================================================
   SPECIFIC USER PICKER
========================================================= */

function specificUserPicker() {

    const options =
        (ALL_USERS || [])
            .map(
                user => `

                    <option value="${escapeAttribute(
                        user.name +
                        ' — ' +
                        user.email
                    )}"></option>

                `
            )
            .join('');


    return `

        <div class="form-group">

            <label class="form-label">
                Search User
            </label>


            <input
                class="form-input"
                id="bc-user-search"
                type="text"
                list="bc-user-datalist"
                placeholder="Type a name or email..."
                autocomplete="off"
                value="${escapeAttribute(
                    state.draftUserName
                )}"
            />


            <datalist
                id="bc-user-datalist"
            >
                ${options}
            </datalist>


            ${
                state.draftUserId

                    ? `
                        <p
                            class="form-hint"
                            style="color:var(--green-700)"
                        >
                            ${icon(
                                'checkSquare',
                                12
                            )}

                            Selected:

                            <strong>
                                ${escapeHtml(
                                    state.draftUserName
                                )}
                            </strong>
                        </p>
                      `

                    : `
                        <p class="form-hint">
                            Pick a user from the suggestions
                            to select them.
                        </p>
                      `
            }

        </div>

    `;

}


/* =========================================================
   COMPOSE VIEW
========================================================= */

function composeView() {

    return `

        <div
            class="settings-form"
            style="padding:var(--space-4)"
        >


            <div class="form-group">

                <label class="form-label">
                    Broadcast Title
                </label>


                <input
                    class="form-input"
                    id="bc-title"
                    type="text"
                    placeholder="e.g. Scheduled maintenance this weekend"
                    maxlength="120"
                />

            </div>


            <div class="form-group">

                <label class="form-label">
                    Message
                </label>


                <textarea
                    class="form-input"
                    id="bc-message"
                    rows="5"
                    placeholder="Write the notification message that will be sent..."
                    maxlength="500"
                    style="resize:vertical;font-family:inherit"
                ></textarea>


                <p class="form-hint">

                    <span id="bc-char-count">
                        0
                    </span>

                    /500 characters

                </p>

            </div>


            <div class="form-group">

                <label class="form-label">
                    Audience
                </label>


                <div
                    class="listing-filter-bar"
                    style="padding:0;border:none"
                >

                    ${AUDIENCES.map(
                        audience => `

                            <button
                                type="button"
                                class="listing-filter-btn ${
                                    state.draftAudience ===
                                    audience.key
                                        ? 'active'
                                        : ''
                                }"
                                data-audience="${
                                    audience.key
                                }"
                            >

                                ${icon(
                                    audience.icn,
                                    12
                                )}

                                ${audience.label}

                            </button>

                        `
                    ).join('')}

                </div>

                <p style="margin:8px 0 0;font-size:12px;color:#6b7c72">
                    ${AUDIENCE_HINTS[state.draftAudience] || ''}
                </p>

            </div>


            ${
                state.draftAudience ===
                'Specific'

                    ? specificUserPicker()

                    : ''
            }


            <div class="form-group">

                <label class="form-label">
                    Priority
                </label>


                <div
                    class="listing-filter-bar"
                    style="padding:0;border:none"
                >

                    ${PRIORITIES.map(
                        priority => `

                            <button
                                type="button"
                                class="listing-filter-btn ${
                                    state.draftPriority ===
                                    priority.key
                                        ? 'active'
                                        : ''
                                }"
                                data-priority="${
                                    priority.key
                                }"
                            >

                                <span
                                    class="listing-badge ${
                                        priority.cls
                                    }"
                                    style="margin-right:4px"
                                >
                                    ${priority.label}
                                </span>

                            </button>

                        `
                    ).join('')}

                </div>

            </div>


            <div class="settings-callout">

                ${icon(
                    'alertCircle',
                    14
                )}

                <p>

                    Broadcasts are sent immediately and
                    cannot be recalled once sent.
                    Double-check the audience before sending.

                </p>

            </div>


            <div class="form-actions">

                <button
                    class="btn-primary"
                    id="bc-send-btn"
                >

                    ${icon(
                        'bell',
                        14
                    )}

                    Send Broadcast

                </button>

            </div>


        </div>

    `;

}


/* =========================================================
   HISTORY VIEW
========================================================= */

function historyView() {

    const rows =
        filteredHistory();


    const FILTERS = [

        {
            key: 'All',
            label:
                `All (${BROADCASTS.length})`
        },

        ...PRIORITIES.map(
            priority => ({
                key: priority.key,

                label:
                    `${
                        priority.label
                    } (${
                        BROADCASTS.filter(
                            broadcast =>
                                broadcast.priority ===
                                priority.key
                        ).length
                    })`
            })
        )

    ];


    return `

        <div class="table-toolbar">

            <div class="toolbar-tabs">

                ${FILTERS.map(
                    filter => `

                        <button
                            class="toolbar-tab ${
                                state.filter ===
                                filter.key
                                    ? 'active'
                                    : ''
                            }"
                            data-history-filter="${
                                filter.key
                            }"
                        >
                            ${filter.label}
                        </button>

                    `
                ).join('')}

            </div>


            <div class="toolbar-search">

                ${icon(
                    'search'
                )}


                <input
                    id="notif-search"
                    type="text"
                    placeholder="Search broadcasts..."
                    value="${escapeAttribute(
                        state.search
                    )}"
                />

            </div>

        </div>


        <div class="table-scroll">

            <table class="orders-table">

                <thead>

                    <tr>

                        <th>
                            Title
                        </th>

                        <th>
                            Audience
                        </th>

                        <th>
                            Priority
                        </th>

                        <th>
                            Recipients
                        </th>

                        <th>
                            Sent By
                        </th>

                        <th>
                            Sent At
                        </th>

                        <th>
                            Action
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${
                        rows.length === 0

                            ? `
                                <tr>
                                    <td
                                        colspan="7"
                                        class="empty-row"
                                    >
                                        No broadcasts sent yet.
                                    </td>
                                </tr>
                              `

                            : rows
                                .map(
                                    broadcast => {

                                        const meta =
                                            priorityMeta(
                                                broadcast.priority
                                            );


                                        return `

                                            <tr>

                                                <td>

                                                    <p
                                                        style="
                                                            font-weight:600;
                                                            color:var(--gray-800);
                                                            font-size:13px
                                                        "
                                                    >
                                                        ${escapeHtml(
                                                            broadcast.title
                                                        )}
                                                    </p>


                                                    <p
                                                        style="
                                                            font-size:11px;
                                                            color:var(--gray-400);
                                                            max-width:280px;
                                                            overflow:hidden;
                                                            text-overflow:ellipsis;
                                                            white-space:nowrap
                                                        "
                                                    >
                                                        ${escapeHtml(
                                                            broadcast.message
                                                        )}
                                                    </p>

                                                </td>


                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${escapeHtml(
                                                        audienceLabel(
                                                            broadcast
                                                        )
                                                    )}
                                                </td>


                                                <td>

                                                    <span
                                                        class="listing-badge ${
                                                            meta.cls
                                                        }"
                                                    >
                                                        ${meta.label}
                                                    </span>

                                                </td>


                                                <td
                                                    class="cell-bold"
                                                >
                                                    ${Number(
                                                        broadcast.recipients ||
                                                        0
                                                    ).toLocaleString()}
                                                </td>


                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${escapeHtml(
                                                        broadcast.sentBy ||
                                                        'Administrator'
                                                    )}
                                                </td>


                                                <td
                                                    class="cell-muted"
                                                    style="font-size:13px"
                                                >
                                                    ${escapeHtml(
                                                        broadcast.sentAt ||
                                                        ''
                                                    )}
                                                </td>


                                                <td>

                                                    <div class="action-cell">

                                                        <button
                                                            class="action-link view"
                                                            type="button"
                                                        >
                                                            ${icon(
                                                                'eye',
                                                                12
                                                            )}
                                                            View
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        `;

                                    }
                                )
                                .join('')
                    }

                </tbody>

            </table>

        </div>

    `;

}


/* =========================================================
   MAIN RENDER
========================================================= */

export function renderNotifications() {

    const content =
        document.getElementById(
            'content'
        );


    const totalSent =
        BROADCASTS.length;


    const totalReached =
        BROADCASTS.reduce(
            (
                sum,
                broadcast
            ) =>
                sum +
                Number(
                    broadcast.recipients ||
                    0
                ),
            0
        );


    const lastSent =
        BROADCASTS[0]?.sentAt ||
        'No broadcasts yet';


    content.innerHTML = `

        <div class="page-container">

            <h1 class="page-title">

                Admin Side:

                <span class="accent">
                    NOTIFICATION BROADCAST
                </span>

            </h1>


            <div
                class="stat-grid-3"
                style="margin-bottom:var(--space-5)"
            >


                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Total Broadcasts Sent
                        </p>

                        <p class="stat-card-value">
                            ${totalSent}
                        </p>

                        <p
                            class="stat-sub"
                            style="font-size:12px"
                        >
                            All Time
                        </p>

                    </div>


                    <div
                        class="stat-icon-box"
                        style="background:var(--green-50)"
                    >

                        <span
                            style="color:var(--green-600)"
                        >
                            ${icon(
                                'bell',
                                22
                            )}
                        </span>

                    </div>

                </div>


                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Total Recipients Reached
                        </p>

                        <p class="stat-card-value">
                            ${totalReached.toLocaleString()}
                        </p>

                        <p
                            class="stat-sub"
                            style="font-size:12px"
                        >
                            Across All Broadcasts
                        </p>

                    </div>


                    <div
                        class="stat-icon-box"
                        style="background:var(--blue-50)"
                    >

                        <span
                            style="color:var(--blue-600)"
                        >
                            ${icon(
                                'users',
                                22
                            )}
                        </span>

                    </div>

                </div>


                <div class="stat-card-icon">

                    <div>

                        <p class="stat-card-title">
                            Last Broadcast
                        </p>

                        <p
                            class="stat-card-value"
                            style="font-size:16px"
                        >
                            ${escapeHtml(
                                lastSent
                            )}
                        </p>

                    </div>


                    <div
                        class="stat-icon-box"
                        style="background:var(--yellow-50)"
                    >

                        <span
                            style="color:var(--yellow-500)"
                        >
                            ${icon(
                                'clipboardList',
                                22
                            )}
                        </span>

                    </div>

                </div>

            </div>


            <div class="order-body">


                <div class="order-table-wrap">


                    <div class="view-toggle-bar">


                        <button
                            class="view-toggle-btn ${
                                state.view ===
                                'compose'
                                    ? 'active'
                                    : ''
                            }"
                            data-view="compose"
                        >
                            Compose New
                        </button>


                        <button
                            class="view-toggle-btn ${
                                state.view ===
                                'history'
                                    ? 'active'
                                    : ''
                            }"
                            data-view="history"
                        >
                            Broadcast History
                        </button>


                    </div>


                    ${
                        state.view ===
                        'compose'

                            ? composeView()

                            : historyView()
                    }


                </div>


                <div class="order-log-panel">


                    <div class="card card-pad-sm">


                        <div class="panel-header">

                            ${icon(
                                'bell'
                            )}

                            <p class="panel-title">
                                RECENT BROADCASTS
                            </p>

                        </div>


                        <div class="order-log-list">


                            ${
                                BROADCASTS.length === 0

                                    ? `
                                        <p
                                            class="form-hint"
                                            style="margin:0"
                                        >
                                            Nothing sent yet.
                                        </p>
                                      `

                                    : BROADCASTS
                                        .slice(
                                            0,
                                            5
                                        )
                                        .map(
                                            broadcast => `

                                                <div
                                                    class="order-log-item"
                                                >

                                                    <span
                                                        class="order-log-dot"
                                                        style="
                                                            background:${
                                                                broadcast.priority ===
                                                                'Urgent'

                                                                    ? 'var(--red-500)'

                                                                    : broadcast.priority ===
                                                                      'Promo'

                                                                    ? 'var(--yellow-400)'

                                                                    : 'var(--green-500)'
                                                            }
                                                        "
                                                    ></span>


                                                    <div>

                                                        <p
                                                            style="
                                                                font-size:12px;
                                                                font-weight:600;
                                                                color:var(--gray-800)
                                                            "
                                                        >
                                                            ${escapeHtml(
                                                                broadcast.title
                                                            )}
                                                        </p>


                                                        <p
                                                            style="
                                                                font-size:11px;
                                                                color:var(--gray-400)
                                                            "
                                                        >
                                                            ${escapeHtml(
                                                                audienceLabel(
                                                                    broadcast
                                                                )
                                                            )}

                                                            ·

                                                            ${escapeHtml(
                                                                broadcast.sentAt ||
                                                                ''
                                                            )}
                                                        </p>

                                                    </div>

                                                </div>

                                            `
                                        )
                                        .join('')
                            }

                        </div>

                    </div>


                    <div
                        class="card card-pad-sm"
                        style="margin-top:var(--space-3)"
                    >

                        <div class="panel-header">

                            ${icon(
                                'alertCircle'
                            )}

                            <p class="panel-title">
                                BROADCAST TIPS
                            </p>

                        </div>


                        <ul class="requirements-list">

                            <li>

                                <span class="req-check">
                                    ${icon(
                                        'checkSquare',
                                        13
                                    )}
                                </span>

                                Keep titles under 60 characters

                            </li>


                            <li>

                                <span class="req-check">
                                    ${icon(
                                        'checkSquare',
                                        13
                                    )}
                                </span>

                                Reserve "Urgent" for time-sensitive issues

                            </li>


                            <li>

                                <span class="req-check">
                                    ${icon(
                                        'checkSquare',
                                        13
                                    )}
                                </span>

                                Use Specific User for one-on-one follow-ups

                            </li>

                        </ul>

                    </div>


                </div>


            </div>

        </div>

    `;


    attachNotificationEvents();

}


/* =========================================================
   EVENTS
========================================================= */

function attachNotificationEvents() {


    document
        .querySelectorAll(
            '[data-view]'
        )
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        state.view =
                            button.dataset.view;

                        renderNotifications();

                    }
                );

            }
        );


    if (
        state.view ===
        'compose'
    ) {


        document
            .querySelectorAll(
                '[data-audience]'
            )
            .forEach(
                asyncButton => {

                    asyncButton.addEventListener(
                        'click',
                        async () => {

                            state.draftAudience =
                                asyncButton.dataset.audience;


                            if (
                                state.draftAudience ===
                                'Specific'
                            ) {

                                await ensureUsersLoaded();

                            }


                            renderNotifications();

                        }
                    );

                }
            );


        document
            .querySelectorAll(
                '[data-priority]'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            state.draftPriority =
                                button.dataset.priority;

                            renderNotifications();

                        }
                    );

                }
            );


        const msgInput =
            document.getElementById(
                'bc-message'
            );


        const charCount =
            document.getElementById(
                'bc-char-count'
            );


        if (
            msgInput &&
            charCount
        ) {

            msgInput.addEventListener(
                'input',
                () => {

                    charCount.textContent =
                        msgInput.value.length;

                }
            );

        }


        const userSearch =
            document.getElementById(
                'bc-user-search'
            );


        if (userSearch) {

            userSearch.addEventListener(
                'input',
                event => {

                    const value =
                        event.target.value;


                    const match =
                        (
                            ALL_USERS || []
                        ).find(
                            user =>
                                `${user.name} — ${user.email}` ===
                                value
                        );


                    if (match) {

                        state.draftUserId =
                            Number(
                                match.user_id
                            );


                        state.draftUserName =
                            `${match.name} — ${match.email}`;

                    } else {

                        state.draftUserId =
                            null;


                        state.draftUserName =
                            value;

                    }


                    const hint =
                        userSearch
                            .parentElement
                            .querySelector(
                                '.form-hint'
                            );


                    if (hint) {

                        hint.innerHTML =
                            match

                                ? `
                                    ${icon(
                                        'checkSquare',
                                        12
                                    )}

                                    Selected:

                                    <strong>
                                        ${escapeHtml(
                                            state.draftUserName
                                        )}
                                    </strong>
                                  `

                                : `
                                    Pick a user from
                                    the suggestions
                                    to select them.
                                  `;


                        hint.style.color =
                            match
                                ? 'var(--green-700)'
                                : '';

                    }

                }
            );

        }


        const sendBtn =
            document.getElementById(
                'bc-send-btn'
            );


        if (sendBtn) {

            sendBtn.addEventListener(
                'click',
                async () => {

                    const title =
                        document
                            .getElementById(
                                'bc-title'
                            )
                            ?.value
                            .trim() ||
                        '';


                    const message =
                        document
                            .getElementById(
                                'bc-message'
                            )
                            ?.value
                            .trim() ||
                        '';


                    if (
                        !title ||
                        !message
                    ) {

                        alert(
                            'Please fill in both a title and a message before sending.'
                        );

                        return;

                    }


                    if (
                        state.draftAudience ===
                        'Specific' &&
                        !state.draftUserId
                    ) {

                        alert(
                            'Please select a specific user from the suggestions before sending.'
                        );

                        return;

                    }


                    const audienceDescription =
                        state.draftAudience ===
                        'Specific'

                            ? state.draftUserName

                            : state.draftAudience;


                    const confirmed =
                        confirm(
                            `Send this broadcast to "${audienceDescription}"? This cannot be undone.`
                        );


                    if (!confirmed) {

                        return;

                    }


                    sendBtn.disabled =
                        true;


                    sendBtn.textContent =
                        'Sending...';


                    try {

                        const response =
                            await fetch(
                                'notification/send_broadcast.php',
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

                                            title,

                                            message,

                                            audience:
                                                state.draftAudience,

                                            priority:
                                                state.draftPriority,

                                            targetUserId:
                                                state.draftAudience ===
                                                'Specific'

                                                    ? state.draftUserId

                                                    : null

                                        })

                                }
                            );


                        const result =
                            await response.json();


                        if (
                            result.success
                        ) {

                            alert(
                                result.message ||
                                'Broadcast sent successfully.'
                            );


                            state.view =
                                'history';


                            state.draftUserId =
                                null;


                            state.draftUserName =
                                '';


                            await loadNotifications();


                        } else {

                            alert(
                                result.message ||
                                'Failed to send broadcast.'
                            );


                            sendBtn.disabled =
                                false;


                            sendBtn.textContent =
                                'Send Broadcast';

                        }


                    } catch (err) {

                        console.error(
                            err
                        );


                        alert(
                            'Something went wrong while sending the broadcast.'
                        );


                        sendBtn.disabled =
                            false;


                        sendBtn.textContent =
                            'Send Broadcast';

                    }

                }
            );

        }


    } else {


        document
            .querySelectorAll(
                '[data-history-filter]'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            state.filter =
                                button.dataset
                                    .historyFilter;


                            renderNotifications();

                        }
                    );

                }
            );


        const searchInput =
            document.getElementById(
                'notif-search'
            );


        if (searchInput) {

            searchInput.addEventListener(
                'input',
                event => {

                    state.search =
                        event.target.value;


                    renderNotifications();


                    const newInput =
                        document.getElementById(
                            'notif-search'
                        );


                    if (newInput) {

                        newInput.focus();


                        newInput.setSelectionRange(
                            state.search.length,
                            state.search.length
                        );

                    }

                }
            );

        }

    }

}


/* =========================================================
   HTML HELPERS
========================================================= */

function escapeHtml(value) {

    const div =
        document.createElement(
            'div'
        );


    div.textContent =
        value ?? '';


    return div.innerHTML;

}


function escapeAttribute(value) {

    return escapeHtml(
        value
    );

}