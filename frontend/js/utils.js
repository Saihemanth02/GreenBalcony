// GreenBalcony — Shared Utilities & Helpers

// 1. Toast Notification System
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Custom icons based on toast type
  let icon = '🌿';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✗';
  if (type === 'warning') icon = '⚠';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove toast after 3.5s
  setTimeout(() => {
    toast.classList.remove('show');
    // Wait for transition to finish, then delete
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// 2. Fullscreen Loader Overlay
function showLoader() {
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'loader-overlay';
    loader.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loader);
  }
  setTimeout(() => loader.classList.add('show'), 10);
}

function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.classList.remove('show');
  }
}

// 3. Button Loading State Toggle
function setButtonLoading(buttonEl, isLoading, loadingText = 'Loading...') {
  if (!buttonEl) return;
  if (isLoading) {
    buttonEl.disabled = true;
    buttonEl.dataset.originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = `
      <div class="typing-indicator" style="display:inline-flex;">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
      <span style="margin-left:8px;">${loadingText}</span>
    `;
  } else {
    buttonEl.disabled = false;
    if (buttonEl.dataset.originalText) {
      buttonEl.innerHTML = buttonEl.dataset.originalText;
    }
  }
}

// 4. Custom Promise-based Confirm Modal
function confirmModal(message) {
  return new Promise((resolve) => {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';

    // Create modal body
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.transform = 'scale(1)';

    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>Confirm Action</h3>
        <button class="modal-close" id="confirm-modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <p>${message}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="confirm-modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="confirm-modal-ok" style="background-color: var(--accent); color: #000;">Confirm</button>
      </div>
    `;

    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);

    // Close handlers
    const cleanup = (value) => {
      overlay.style.opacity = '0';
      modalContent.style.transform = 'scale(0.95)';
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 200);
    };

    document.getElementById('confirm-modal-cancel').onclick = () => cleanup(false);
    document.getElementById('confirm-modal-ok').onclick = () => cleanup(true);
    document.getElementById('confirm-modal-close-btn').onclick = () => cleanup(false);
    
    // Fallback click on overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    };
  });
}

// 5. Render Empty State
function renderEmptyState(containerEl, message, icon = '🌱') {
  if (!containerEl) return;
  containerEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-text">${message}</div>
    </div>
  `;
}

// 6. Currency Formatter (Indian Rupee)
function formatCurrency(amount) {
  const value = parseFloat(amount);
  if (isNaN(value)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value);
}

// 7. Date Formatter (e.g. '15 Jun 2026')
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// DateTime Formatter (e.g. '15 Jun 2026, 02:45 PM')
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const datePart = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timePart = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return `${datePart}, ${timePart}`;
}

// 8. Decode JWT Payload safely (without verify signature)
function getTokenPayload() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return null;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    // Normalize Supabase specific JWT tokens
    if (parsed.user_metadata) {
      parsed.role = parsed.user_metadata.role || parsed.role;
      parsed.name = parsed.user_metadata.name || parsed.name;
    }
    parsed.user_id = parsed.sub || parsed.user_id;

    // Apply database overrides from local storage if synced
    const localUserText = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (localUserText) {
      try {
        const localUser = JSON.parse(localUserText);
        if (localUser.user_id === parsed.user_id) {
          parsed.role = localUser.role || parsed.role;
          parsed.name = localUser.name || parsed.name;
        }
      } catch (e) {}
    }

    return parsed;
  } catch (err) {
    console.error('Failed to decode JWT payload:', err);
    return null;
  }
}

// 9. Auth guard - Redirect if not logged in
function requireAuth() {
  const payload = getTokenPayload();
  if (!payload) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
    return null;
  }
  
  // Verify token expiry if available (exp in seconds)
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    showToast('Session expired. Please log in again.', 'warning');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
    return null;
  }
  
  return payload;
}

// 10. Admin role guard - Redirect if not admin
function requireAdmin() {
  const payload = requireAuth();
  if (!payload) return null;

  if (payload.role !== 'Admin') {
    showToast('Access Denied. Administrator role required.', 'error');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
    return null;
  }

  return payload;
}

// Dynamic Navigation Loader (attaches navigation elements programmatically to simplify HTML layout)
function loadHeaderAndFooter() {
  const navContainer = document.getElementById('navbar-container');
  if (!navContainer) return;

  const payload = getTokenPayload();
  const isLoggedIn = !!payload;
  const isAdmin = isLoggedIn && payload.role === 'Admin';
  
  let navHtml = `
    <nav class="navbar">
      <a href="index.html" class="nav-brand">🌿 GreenBalcony</a>
      
      <button class="hamburger" id="nav-hamburger">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div class="nav-links" id="nav-links-menu">
        <a href="index.html" class="nav-link">Home</a>
  `;

  if (isLoggedIn) {
    if (isAdmin) {
      navHtml += `<a href="admin.html" class="nav-link">Admin Panel</a>`;
    } else {
      navHtml += `
        <a href="dashboard.html" class="nav-link">Dashboard</a>
        <a href="catalog.html" class="nav-link">Catalog</a>
        <a href="booking.html" class="nav-link">Book Service</a>
        <a href="maintenance.html" class="nav-link">Maintenance</a>
        <a href="payments.html" class="nav-link">Payments</a>
        <a href="feedback.html" class="nav-link">Feedback</a>
        <a href="ai-advisor.html" class="nav-link">🌿 AI Advisor</a>
      `;
    }
    
    // Add actions (notifications + logout)
    navHtml += `
      </div>
      <div class="nav-actions">
        <div class="bell-container" id="notif-bell-btn">
          <span>🔔</span>
          <span class="bell-badge" id="notif-count" style="display:none;">0</span>
        </div>
        <button class="btn btn-ghost" id="logout-nav-btn" style="min-height:36px; padding:6px 12px;">Logout</button>
      </div>
    `;
  } else {
    // Guest links
    navHtml += `
        <a href="login.html" class="nav-link">Login</a>
        <a href="register.html" class="nav-link">Register</a>
      </div>
      <div class="nav-actions">
        <a href="login.html" class="btn btn-primary" style="min-height:36px; padding:6px 16px; background-color: var(--accent); color: #000;">Get Started</a>
      </div>
    `;
  }

  navHtml += `
    </nav>
    <div class="notif-dropdown" id="notif-dropdown-box">
      <div class="notif-header">
        <h4>Notifications</h4>
        <span class="notif-clear" id="notif-read-all-btn">Mark all read</span>
      </div>
      <div class="notif-list" id="notif-list-container">
        <!-- populated by api -->
      </div>
    </div>
  `;

  navContainer.innerHTML = navHtml;

  // Hamburger Toggle
  const hamburger = document.getElementById('nav-hamburger');
  const menu = document.getElementById('nav-links-menu');
  if (hamburger && menu) {
    hamburger.onclick = () => {
      hamburger.classList.toggle('open');
      menu.classList.toggle('open');
    };
  }

  // Active Link Highlight
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath) {
      link.classList.add('active');
    }
  });

  // Logout Handler
  const logoutBtn = document.getElementById('logout-nav-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      const confirm = await confirmModal('Are you sure you want to log out?');
      if (confirm) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        showToast('Logged out successfully.', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      }
    };
  }

  // Notification Handling
  if (isLoggedIn) {
    setupNotificationSystem();
  }
}

const UTILS_SUPABASE_URL = 'https://lggyihahtgnxpnlhcoun.supabase.co';
const UTILS_SUPABASE_KEY = 'sb_publishable_HN3KtRz6UroG5tOJpBTzdg_57zUOR2s';

async function setupNotificationSystem() {
  const bellBtn = document.getElementById('notif-bell-btn');
  const dropdown = document.getElementById('notif-dropdown-box');
  const listContainer = document.getElementById('notif-list-container');
  const countBadge = document.getElementById('notif-count');
  const readAllBtn = document.getElementById('notif-read-all-btn');

  if (!bellBtn || !dropdown || !listContainer) return;

  // Toggle Dropdown
  bellBtn.onclick = (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  };

  document.onclick = (e) => {
    if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  };

  // Fetch Notifications
  const fetchNotifs = async () => {
    try {
      const payload = getTokenPayload();
      if (!payload || !payload.user_id) return;
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'apikey': UTILS_SUPABASE_KEY,
        'Authorization': `Bearer ${token || UTILS_SUPABASE_KEY}`
      };

      const response = await fetch(`${UTILS_SUPABASE_URL}/rest/v1/notifications?user_id=eq.${payload.user_id}&order=notification_id.desc`, {
        headers
      });
      const notifications = await response.json();
      
      if (Array.isArray(notifications)) {
        const unread = notifications.filter(n => !n.is_read);
        
        if (unread.length > 0) {
          countBadge.textContent = unread.length;
          countBadge.style.display = 'block';
        } else {
          countBadge.style.display = 'none';
        }

        if (notifications.length === 0) {
          listContainer.innerHTML = '<div style="padding:16px; text-align:center; font-size:12px; color:var(--text-muted);">No notifications</div>';
          return;
        }

        listContainer.innerHTML = notifications.map(notif => `
          <div class="notif-item ${notif.is_read ? '' : 'unread'}" data-id="${notif.notification_id}" data-link="${notif.link_url || ''}">
            <div>${notif.message}</div>
            <div class="notif-time">${formatDate(notif.notification_date)}</div>
          </div>
        `).join('');

        // Attach click triggers to notification items
        document.querySelectorAll('.notif-item').forEach(item => {
          item.onclick = async (evt) => {
            const id = item.dataset.id;
            const link = item.dataset.link;
            
            try {
              // Mark read
              await fetch(`${UTILS_SUPABASE_URL}/rest/v1/notifications?notification_id=eq.${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ is_read: true })
              });
              
              // Refresh
              fetchNotifs();

              if (link) {
                window.location.href = link;
              }
            } catch (err) {
              console.error(err);
            }
          };
        });
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  // Clear All
  if (readAllBtn) {
    readAllBtn.onclick = async () => {
      try {
        const payload = getTokenPayload();
        if (!payload || !payload.user_id) return;
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          'apikey': UTILS_SUPABASE_KEY,
          'Authorization': `Bearer ${token || UTILS_SUPABASE_KEY}`
        };

        await fetch(`${UTILS_SUPABASE_URL}/rest/v1/notifications?user_id=eq.${payload.user_id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ is_read: true })
        });
        
        showToast('All notifications marked as read', 'success');
        fetchNotifs();
      } catch (err) {
        console.error(err);
      }
    };
  }

  // Load immediately and poll every 30s
  fetchNotifs();
  setInterval(fetchNotifs, 30000);
}

// Initialize AI Voice Assistant dynamically on all pages
function initVoiceAssistant() {
  // Load assistant.css stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/assistant.css';
  document.head.appendChild(link);

  // Load assistant.js script module
  const script = document.createElement('script');
  script.src = 'js/assistant.js';
  script.type = 'module';
  document.body.appendChild(script);
}

// Initialize OmniDimension Web Widget dynamically on the home page
function initOmniDimensionWidget() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPath === 'index.html') {
    const script = document.createElement('script');
    script.id = 'omnidimension-web-widget';
    script.src = 'https://omnidim.io/web_widget.js?secret_key=94cca58e979930f59089da6b6422ecf3';
    script.async = true;
    document.body.appendChild(script);
  }
}

// Auto load header, footer, and voice assistant when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  loadHeaderAndFooter();
  initVoiceAssistant();
  initOmniDimensionWidget();
});
