// Notification System - Simple toast notifications
// Replaces alert() with touch-friendly, standardized notifications

const NotificationManager = {
  container: null,
  queue: [],
  isShowing: false,

  init() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', duration = 4000) {
    this.init();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');

    const icon = this.getIcon(type);
    notification.innerHTML = `
      <div class="notification-content">
        <i class="${icon}" aria-hidden="true"></i>
        <span class="notification-message">${this.escapeHtml(message)}</span>
      </div>
      <button class="notification-close" aria-label="Fechar notificação" type="button">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    const closeNotification = () => {
      this.hide(notification);
    };

    closeBtn.addEventListener('click', closeNotification);
    notification._closeHandler = closeNotification;

    this.container.appendChild(notification);

    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          this.hide(notification);
        }
      }, duration);
    }

    return notification;
  },

  hide(notification) {
    if (!notification || !notification.parentNode) return;

    notification.classList.remove('show');
    notification.classList.add('hide');

    setTimeout(() => {
      if (notification.parentNode) {
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn && notification._closeHandler) {
          closeBtn.removeEventListener('click', notification._closeHandler);
        }
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  },

  getIcon(type) {
    const icons = {
      success: 'fa-solid fa-check-circle',
      error: 'fa-solid fa-exclamation-circle',
      warning: 'fa-solid fa-triangle-exclamation',
      info: 'fa-solid fa-info-circle'
    };
    return icons[type] || icons.info;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  success(message, duration) {
    return this.show(message, 'success', duration);
  },

  error(message, duration) {
    return this.show(message, 'error', duration);
  },

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  },

  info(message, duration) {
    return this.show(message, 'info', duration);
  },

  // Show notification with user avatar and name (for WebSocket activity notifications)
  showUserActivity(message, userName, userAvatarUrl, type = 'info', duration = 5000) {
    this.init();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');

    // Use existing getInitials function (from auth.js or calculations.js)
    const getInitialsFunc = typeof getInitials === 'function' ? getInitials : (name) => {
      if (!name) return '?';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    const userInitials = userName ? getInitialsFunc(userName) : '?';
    const escapedUserName = this.escapeHtml(userName || 'Usuário');
    const escapedMessage = this.escapeHtml(message);
    
    // Format avatar URL if needed - use existing getApiBaseUrl from utils.js
    let avatarUrl = userAvatarUrl;
    if (avatarUrl && !avatarUrl.startsWith('http')) {
      const apiBaseUrl = typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : (() => {
        const isLocalhost = window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname === '';
        return isLocalhost ? 'http://localhost:3000' : '';
      })();
      avatarUrl = `${apiBaseUrl}${avatarUrl}`;
    }

    // Sanitize avatar URL for CSS - escape single quotes and parentheses
    const sanitizeCssUrl = (url) => {
      if (!url) return '';
      // Escape single quotes and parentheses that could break CSS
      return url.replace(/'/g, "\\'").replace(/\)/g, '\\)');
    };

    const sanitizedAvatarUrl = avatarUrl ? sanitizeCssUrl(avatarUrl) : null;
    const escapedInitials = this.escapeHtml(userInitials);

    const userBadgeHtml = sanitizedAvatarUrl
      ? `<div class="notification-user-badge" title="${escapedUserName}" style="background-image: url('${sanitizedAvatarUrl}'); background-size: cover; background-position: center; background-color: transparent; color: transparent;">${escapedInitials}</div>`
      : `<div class="notification-user-badge" title="${escapedUserName}">${escapedInitials}</div>`;

    notification.innerHTML = `
      <div class="notification-content">
        ${userBadgeHtml}
        <div class="notification-message-wrapper">
          <span class="notification-message">${escapedMessage}</span>
          <span class="notification-user-name">${escapedUserName}</span>
        </div>
      </div>
      <button class="notification-close" aria-label="Fechar notificação" type="button">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    `;

    const closeBtn = notification.querySelector('.notification-close');
    const closeNotification = () => {
      this.hide(notification);
    };

    closeBtn.addEventListener('click', closeNotification);
    notification._closeHandler = closeNotification;

    this.container.appendChild(notification);

    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          this.hide(notification);
        }
      }, duration);
    }

    return notification;
  }
};


