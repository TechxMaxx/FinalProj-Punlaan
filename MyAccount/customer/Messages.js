/* =========================================================
   MESSAGES — chat between buyers and sellers
   (../chat_php/chat.php)

   Messages.html                     → list of chats
   Messages.html?vendor_id=5&product_id=12 → chat with a shop about a product
   Messages.html?customer_id=7       → seller chats with one of their buyers
   Messages.html?c=3                 → open chat #3

   New messages are checked every 4 seconds while a chat is open
   (every 15 seconds for the list).
========================================================= */

const CHAT_API = '../chat_php/chat.php';

let conversations = [];
let activeId = null;
let lastMessageId = 0;
let pendingProduct = null;      // product card sent with the next message
let pollTimer = null;
let listTimer = null;

document.addEventListener('DOMContentLoaded', async () => {

  const user = await getCurrentUser();

  if (!user) {
    window.location.replace('../../register/Login.html?next=' + encodeURIComponent(location.pathname + location.search));
    return;
  }

  document.getElementById('app').innerHTML = renderLayout('messages');
  document.getElementById('pageContent').innerHTML = `
    <div class="chat" id="chat">
      <aside class="chat__list">
        <div class="chat__list-head">Chats</div>
        <div id="chatList"><div class="loading">Loading…</div></div>
      </aside>
      <section class="chat__thread" id="chatThread">
        <div class="chat__empty">
          <div class="chat__empty-icon">💬</div>
          <p>Choose a chat, or tap <strong>Chat with seller</strong> on any product page.</p>
        </div>
      </section>
    </div>
    <div id="modalRoot"></div>`;

  const params = new URLSearchParams(location.search);

  // Opened from a product / shop / order → start (or reopen) that chat
  if (params.get('vendor_id') || params.get('customer_id')) {
    const result = await postJson(CHAT_API, {
      action: 'start',
      vendor_id: Number(params.get('vendor_id')) || 0,
      customer_id: Number(params.get('customer_id')) || 0,
      product_id: Number(params.get('product_id')) || 0
    });

    if (result.success) {
      activeId = result.conversation_id;
      pendingProduct = result.product;
      history.replaceState(null, '', 'Messages.html?c=' + activeId);
    } else {
      showToast(result.message || 'Could not open the chat.', true);
    }
  } else if (params.get('c')) {
    activeId = Number(params.get('c'));
  }

  await loadList();
  if (activeId) openConversation(activeId);

  listTimer = setInterval(() => { if (!document.hidden) loadList(); }, 15000);
});


/* ---------- helpers ---------- */

function asset(path) {
  if (!path) return '';
  return /^https?:\/\//i.test(path) ? path : '../../' + path;
}

function productImg(path) {
  if (!path) return '../../FrontEnd/products/no_photo.jpg';
  return /^(https?:|\/|\.\.\/)/.test(path) ? path : '../../FrontEnd/' + path;
}

function avatarHtml(name, path, cls) {
  return path
    ? `<img class="${cls}" src="${escapeHtml(asset(path))}" alt="">`
    : `<span class="${cls} ${cls}--letter">${escapeHtml(String(name || '?').charAt(0).toUpperCase())}</span>`;
}

function timeLabel(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T'));
  if (isNaN(d)) return '';
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}


/* ---------- list of chats ---------- */

async function loadList() {
  try {
    const response = await fetch(CHAT_API + '?action=list', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    conversations = result.conversations || [];
    renderList();
  } catch (err) {
    document.getElementById('chatList').innerHTML = `<div class="empty-state">${escapeHtml(err.message || 'Could not load chats.')}</div>`;
  }
}

function renderList() {
  const box = document.getElementById('chatList');

  if (!conversations.length) {
    box.innerHTML = '<div class="empty-state">No chats yet.</div>';
    return;
  }

  box.innerHTML = conversations.map(c => `
    <button type="button" class="chat__item${c.conversation_id === activeId ? ' is-active' : ''}" onclick="openConversation(${c.conversation_id})">
      ${avatarHtml(c.other_name, c.other_avatar, 'chat__avatar')}
      <span class="chat__item-text">
        <span class="chat__item-top">
          <span class="chat__item-name">${escapeHtml(c.other_name)}</span>
          <span class="chat__item-time">${timeLabel(c.last_message_at)}</span>
        </span>
        <span class="chat__item-sub">
          <span class="chat__role">${c.role === 'vendor' ? 'Buyer' : 'Shop'}</span>
          ${c.last_body ? (c.last_mine ? 'You: ' : '') + escapeHtml(c.last_body.slice(0, 60)) : 'No messages yet'}
        </span>
      </span>
      ${c.unread ? `<span class="sidebar__badge">${c.unread}</span>` : ''}
    </button>`).join('');
}


/* ---------- one chat ---------- */

function openConversation(id) {
  const c = conversations.find(x => x.conversation_id === id);
  if (!c) return;

  if (activeId !== id) pendingProduct = null;
  activeId = id;
  lastMessageId = 0;
  history.replaceState(null, '', 'Messages.html?c=' + id);

  const shopLink = c.role === 'customer'
    ? `<a class="btn btn--ghost" href="../../FrontEnd/SHOP.html?vendor_id=${c.other_id}" target="_blank" rel="noopener">Visit shop</a>`
    : '';

  document.getElementById('chat').classList.add('chat--open');
  document.getElementById('chatThread').innerHTML = `
    <div class="chat__head">
      <button type="button" class="chat__back" onclick="closeThread()" aria-label="Back to chats">‹</button>
      ${avatarHtml(c.other_name, c.other_avatar, 'chat__avatar')}
      <div class="chat__head-text">
        <div class="chat__head-name">${escapeHtml(c.other_name)}</div>
        <div class="chat__head-sub">${c.role === 'vendor' ? 'Your buyer' : 'Seller on Punlaan'}</div>
      </div>
      ${shopLink}
    </div>
    <div class="chat__messages" id="chatMessages"><div class="loading">Loading…</div></div>
    <div id="chatProduct"></div>
    <form class="chat__compose" id="chatForm">
      <textarea id="chatInput" rows="1" maxlength="2000" placeholder="Write a message…" aria-label="Message"></textarea>
      <button type="submit" class="btn btn--primary" id="chatSend">Send</button>
    </form>`;

  renderPendingProduct();

  const input = document.getElementById('chatInput');
  input.addEventListener('keydown', (e) => {
    // Enter sends, Shift+Enter = new line
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });
  document.getElementById('chatForm').addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
  input.focus();

  renderList();
  loadThread(true);

  clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (!document.hidden) loadThread(false); }, 4000);
}

function closeThread() {
  clearInterval(pollTimer);
  activeId = null;
  document.getElementById('chat').classList.remove('chat--open');
  history.replaceState(null, '', 'Messages.html');
  renderList();
}

function renderPendingProduct() {
  const box = document.getElementById('chatProduct');
  if (!box) return;
  box.innerHTML = pendingProduct ? `
    <div class="chat__attach">
      <img src="${escapeHtml(productImg(pendingProduct.image))}" alt="">
      <span>Asking about <strong>${escapeHtml(pendingProduct.name)}</strong> · ${formatPeso(pendingProduct.price)}</span>
      <button type="button" onclick="pendingProduct=null;renderPendingProduct()" aria-label="Don't attach">×</button>
    </div>` : '';
}

async function loadThread(first) {
  const id = activeId;
  try {
    const response = await fetch(`${CHAT_API}?action=thread&id=${id}&after=${lastMessageId}`, { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    if (id !== activeId) return;              // switched chats meanwhile
    if (!result.success) throw new Error(result.message);

    const box = document.getElementById('chatMessages');
    if (first) box.innerHTML = '';

    if (first && !result.messages.length) {
      box.innerHTML = '<div class="chat__hint">Say hello 👋 — ask about the plant, delivery, or care tips.</div>';
    }

    if (result.messages.length) {
      box.querySelector('.chat__hint')?.remove();
      const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      box.insertAdjacentHTML('beforeend', result.messages.map(messageHtml).join(''));
      lastMessageId = result.messages[result.messages.length - 1].message_id;
      if (first || nearBottom) box.scrollTop = box.scrollHeight;

      // They were unread → refresh badges
      const c = conversations.find(x => x.conversation_id === id);
      if (c && c.unread) { c.unread = 0; renderList(); refreshSidebarBadges(); }
    }

    // "Seen" under my last message
    box.querySelectorAll('.chat__seen').forEach(el => el.remove());
    const mine = box.querySelectorAll('.chat__msg--mine');
    const lastMine = mine[mine.length - 1];
    if (lastMine && Number(lastMine.dataset.id) <= result.other_read_id) {
      lastMine.insertAdjacentHTML('afterend', '<div class="chat__seen">Seen</div>');
    }
  } catch (err) {
    if (first) document.getElementById('chatMessages').innerHTML = `<div class="empty-state">${escapeHtml(err.message || 'Could not load messages.')}</div>`;
  }
}

function messageHtml(m) {
  const product = m.product ? `
    <a class="chat__product" href="../../FrontEnd/DETAIL.html?product_id=${m.product.product_id}" target="_blank" rel="noopener">
      <img src="${escapeHtml(productImg(m.product.image))}" alt="">
      <span><strong>${escapeHtml(m.product.name)}</strong><br>${formatPeso(m.product.price)}</span>
    </a>` : '';

  return `
    <div class="chat__msg${m.mine ? ' chat__msg--mine' : ''}" data-id="${m.message_id}">
      ${product}
      <div class="chat__bubble">${escapeHtml(m.body).replace(/\n/g, '<br>')}</div>
      <div class="chat__time">${timeLabel(m.created_at)}</div>
    </div>`;
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSend');
  const body = input.value.trim();
  if (!body || btn.disabled) return;

  btn.disabled = true;
  try {
    const result = await postJson(CHAT_API, {
      action: 'send',
      conversation_id: activeId,
      body,
      product_id: pendingProduct ? pendingProduct.product_id : 0
    });
    if (!result.success) throw new Error(result.message);
    input.value = '';
    input.style.height = 'auto';
    pendingProduct = null;
    renderPendingProduct();
    await loadThread(false);
    document.getElementById('chatMessages').scrollTop = 1e9;
    loadList();
  } catch (err) {
    showToast(err.message || 'Message not sent.', true);
  } finally {
    btn.disabled = false;
    input.focus();
  }
}
