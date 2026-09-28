(function () {
  'use strict';

  const notificationList = document.getElementById('notificationList');
  const emptyState = document.getElementById('emptyNotifications');
  const markAllBtn = document.getElementById('markAllRead');
  const unreadTextBadge = document.getElementById('unreadTextBadge');
  const usernameDisplay = document.getElementById('usernameDisplay');
  const bellBadge = document.getElementById('notificationBellBadge');

  let notifications = [];

  async function getJson(response) {
    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      throw new Error(
        'Invalid server response (' +
        response.status +
        '): ' +
        text.substring(0, 300)
      );
    }

    if (!response.ok) {
      throw new Error(
        result.message ||
        'Server returned HTTP ' + response.status
      );
    }

    return result;
  }

  async function checkSession() {
    try {
      const response = await fetch('../register/current_user.php', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });

      const result = await getJson(response);
      console.log('Notification session:', result);

      if (!result.logged_in) {
        window.location.replace('../register/Login.html');
        return false;
      }

      const user = result.user || result;

      if (usernameDisplay) {
        const firstName = String(user.first_name || '').trim();
        const lastName = String(user.last_name || '').trim();
        const name = [firstName, lastName].filter(Boolean).join(' ');

        usernameDisplay.textContent = name || 'User';
      }

      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      window.location.replace('../register/Login.html');
      return false;
    }
  }

  async function loadNotifications() {
    try {
      const response = await fetch('notification/get_notifications.php', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });

      const result = await getJson(response);
      console.log('Notifications API:', result);

      if (result.logged_in === false) {
        window.location.replace('../register/Login.html');
        return;
      }

      if (!result.success) {
        throw new Error(
          result.message ||
          'Could not load notifications.'
        );
      }

      if (Array.isArray(result.notifications)) {
        notifications = result.notifications;
      } else if (Array.isArray(result)) {
        notifications = result;
      } else {
        notifications = [];
      }

      renderNotifications();
    } catch (error) {
      console.error('Could not load notifications:', error);
      showError(error.message);
    }
  }

  function showError(message) {
    notificationList.style.display = 'block';
    emptyState.style.display = 'none';

    notificationList.innerHTML = `
      <div class="error-notifications">
        <i class="fa-regular fa-bell-slash"></i>
        <h3>Unable to Load Notifications</h3>
        <p>${escapeHTML(message || 'Please check your connection and try again.')}</p>
      </div>
    `;
  }

  function renderNotifications() {
    updateUnreadBadge();

    if (!notifications.length) {
      notificationList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    notificationList.style.display = 'flex';
    emptyState.style.display = 'none';

    notificationList.innerHTML = notifications
      .map(createNotificationHTML)
      .join('');

    attachNotificationEvents();
  }

  function createNotificationHTML(notification) {
    const id = Number(notification.notification_id);
    const isUnread = Number(notification.is_read) === 0;
    const priority = String(notification.priority || 'Info');

    const isSystem = notification.kind === 'system';

    return `
      <div class="notification-item ${isUnread ? 'unread' : 'read'}" data-id="${id}"
           ${notification.link || !isSystem ? 'style="cursor:pointer" title="Open"' : ''}>
        <div class="icon-wrapper ${isSystem ? 'green' : getIconColor(priority)}">
          <i class="${isSystem ? systemIcon(notification.title) : getIconClass(priority)}"></i>
        </div>
        <div class="content">
          <div class="message">
            <strong>${escapeHTML(notification.title)}</strong>
            ${escapeHTML(notification.message)}
          </div>
          <span class="time">${formatNotificationTime(notification.created_at)}</span>
        </div>
        <div class="unread-dot"></div>
        <button class="dismiss-btn" type="button" data-id="${id}" aria-label="Dismiss notification">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  }

  // Automatic notifications: an icon that matches the event
  function systemIcon(title) {
    const t = String(title || '').toLowerCase();
    if (t.includes('cancel')) return 'fa-solid fa-ban';
    if (t.includes('refund') || t.includes('return') || t.includes('dispute')) return 'fa-solid fa-rotate-left';
    if (t.includes('payment') || t.includes('payout')) return 'fa-solid fa-wallet';
    if (t.includes('courier') || t.includes('on the way') || t.includes('ship')) return 'fa-solid fa-truck-fast';
    if (t.includes('delivered') || t.includes('received')) return 'fa-solid fa-box-open';
    if (t.includes('review') || t.includes('rating')) return 'fa-solid fa-star';
    if (t.includes('message')) return 'fa-regular fa-comment-dots';
    return 'fa-solid fa-box';
  }

  function getIconClass(priority) {
    if (priority === 'Urgent') {
      return 'fa-solid fa-triangle-exclamation';
    }

    if (priority === 'Promo') {
      return 'fa-solid fa-tag';
    }

    return 'fa-regular fa-circle-check';
  }

  function getIconColor(priority) {
    if (priority === 'Urgent') {
      return 'red';
    }

    if (priority === 'Promo') {
      return 'orange';
    }

    return 'green';
  }

  function attachNotificationEvents() {
    notificationList.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', event => {
        if (event.target.closest('.dismiss-btn')) {
          return;
        }

        const id = Number(item.dataset.id);
        const notification = notifications.find(
          item => Number(item.notification_id) === id
        );

        const go = () => {
          if (!notification) return;
          // Order updates etc. open their page (link is relative to the site root)
          if (notification.link) {
            window.location.href = '../' + String(notification.link).replace(/^\/+/, '');
          } else if (notification.kind !== 'system' && window.showAnnouncement) {
            // Admin announcement → read it in a popup
            window.showAnnouncement(notification);
          }
        };

        if (notification && Number(notification.is_read) === 0) {
          markAsRead(id).then(go);
        } else {
          go();
        }
      });
    });

    notificationList.querySelectorAll('.dismiss-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        dismissNotification(Number(button.dataset.id));
      });
    });
  }

  async function markAsRead(notificationId) {
    try {
      const response = await fetch(
        'notification/mark_notification_read.php',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notification_id: notificationId
          })
        }
      );

      const result = await getJson(response);

      if (result.logged_in === false) {
        window.location.replace('../register/Login.html');
        return;
      }

      if (!result.success) {
        throw new Error(
          result.message ||
          'Could not mark notification as read.'
        );
      }

      const notification = notifications.find(
        item => Number(item.notification_id) === Number(notificationId)
      );

      if (notification) {
        notification.is_read = 1;
        notification.read_at = new Date().toISOString();
      }

      renderNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async function markAllAsRead() {
    const unreadCount = notifications.filter(
      notification => Number(notification.is_read) === 0
    ).length;

    if (!unreadCount) {
      return;
    }

    try {
      const response = await fetch(
        'notification/mark_all_notifications_read.php',
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      const result = await getJson(response);

      if (result.logged_in === false) {
        window.location.replace('../register/Login.html');
        return;
      }

      if (!result.success) {
        throw new Error(
          result.message ||
          'Could not mark notifications as read.'
        );
      }

      notifications.forEach(notification => {
        notification.is_read = 1;
      });

      renderNotifications();
    } catch (error) {
      console.error('Mark all failed:', error);
    }
  }

  async function dismissNotification(notificationId) {
    try {
      const response = await fetch(
        'notification/dismiss_notification.php',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notification_id: notificationId
          })
        }
      );

      const result = await getJson(response);

      if (result.logged_in === false) {
        window.location.replace('../register/Login.html');
        return;
      }

      if (!result.success) {
        throw new Error(
          result.message ||
          'Could not dismiss notification.'
        );
      }

      notifications = notifications.filter(
        notification =>
          Number(notification.notification_id) !== Number(notificationId)
      );

      renderNotifications();
    } catch (error) {
      console.error('Dismiss failed:', error);
    }
  }

  function updateUnreadBadge() {
    const unreadCount = notifications.filter(
      notification => Number(notification.is_read) === 0
    ).length;

    if (unreadTextBadge) {
      unreadTextBadge.textContent = unreadCount + ' unread';
    }

    if (bellBadge) {
      bellBadge.textContent = unreadCount;
      bellBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
  }

  function formatNotificationTime(value) {
    if (!value) {
      return '';
    }

    const normalized = String(value).replace(' ', 'T');
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
      return 'Just now';
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return minutes + (minutes === 1 ? ' min ago' : ' mins ago');
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
      return days + (days === 1 ? ' day ago' : ' days ago');
    }

    return date.toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }

  async function start() {
    const loggedIn = await checkSession();

    if (!loggedIn) {
      return;
    }

    await loadNotifications();
  }

  if (markAllBtn) {
    markAllBtn.addEventListener('click', markAllAsRead);
  }

  start();
})();