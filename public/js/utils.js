// public/js/utils.js - Shared utilities

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `show ${type}`;
  setTimeout(() => { toast.className = ''; }, 3500);
}

// Format price as ZAR
function formatPrice(amount) {
  return `R ${parseFloat(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Render star rating HTML
function renderStars(rating, max = 5) {
  let html = '';
  for (let i = 1; i <= max; i++) {
    html += `<span class="${i <= Math.round(rating) ? 'stars' : 'star-empty'}">★</span>`;
  }
  return html;
}

// Render a listing card
function renderListingCard(listing) {
  return `
    <div class="card listing-card" onclick="window.location='/listing/${listing.id}'">
      <img class="card-image" src="${listing.image_url || '/images/default-listing.png'}"
           alt="${listing.title}" onerror="this.src='/images/default-listing.png'">
      <div class="card-body">
        <div class="card-title">${listing.title}</div>
        <div class="card-price">${formatPrice(listing.price)}</div>
        <div class="card-meta">
          <span class="condition-badge condition-${listing.condition}">${listing.condition}</span>
          <span>${listing.category_icon || ''} ${listing.category_name || ''}</span>
        </div>
        <div class="card-meta" style="margin-top:0.4rem">
          <a href="/profile/${listing.seller_id}" style="color:var(--text-muted);font-size:0.78rem;text-decoration:none" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-muted)'">👤 ${listing.seller_name || 'Student'}</a>
          <span style="color:var(--text-muted);font-size:0.78rem">${formatDate(listing.created_at)}</span>
        </div>
      </div>
    </div>`;
}

// Register service worker + subscribe to push notifications
async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // Get VAPID public key from server
    const keyRes = await fetch('/api/push/vapid-public-key');
    const { publicKey } = await keyRes.json();

    // Convert base64 VAPID key to Uint8Array
    const convert = base64 => {
      const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
      return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
    };

    // Check existing subscription or create new one
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convert(publicKey)
      });
    }
    // Send subscription to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON())
    });
  } catch (e) {
    console.warn('Push registration failed:', e);
  }
}

// Check session and update navbar
async function initNavbar() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    const guestLinks = document.getElementById('guest-links');
    const userLinks = document.getElementById('user-links');
    const userNameEl = document.getElementById('nav-username');

    if (data.loggedIn) {
      if (guestLinks) guestLinks.style.display = 'none';
      if (userLinks) userLinks.style.display = 'contents';
      if (userNameEl) userNameEl.textContent = data.userName.split(' ')[0];

      // Register push notifications for this user
      registerPush();

      // Show profile picture avatar in navbar
      try {
        const userRes = await fetch('/api/users/me');
        const userData = await userRes.json();
        if (userData.success && userNameEl) {
          const pic = userData.user.profile_picture || '/images/default-avatar.png';
          const firstName = data.userName.split(' ')[0];

          // Build once, never re-run if already built
          if (!document.getElementById('nav-avatar')) {
            userNameEl.innerHTML = '';
            const img = document.createElement('img');
            img.id = 'nav-avatar';
            img.alt = 'avatar';
            img.src = pic;
            img.onerror = () => { img.src = '/images/default-avatar.png'; };
            img.style.cssText = 'width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;border:2px solid rgba(255,255,255,0.5);margin-right:0.4rem;flex-shrink:0';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = firstName;
            userNameEl.appendChild(img);
            userNameEl.appendChild(nameSpan);
          } else {
            document.getElementById('nav-avatar').src = pic;
          }
        }
      } catch (e) {
        if (userNameEl) userNameEl.textContent = data.userName.split(' ')[0];
      }

      // Unread message badge
      const badgeEl = document.getElementById('msg-badge');
      if (badgeEl) {
        const msgRes = await fetch('/api/messages/unread/count');
        const msgData = await msgRes.json();
        if (msgData.count > 0) {
          badgeEl.textContent = msgData.count;
          badgeEl.style.display = 'inline-flex';
        }
      }

      // Notification bell badge (navbar)
      const notifBellEl = document.getElementById('nav-notif-badge');
      if (notifBellEl) {
        const nRes = await fetch('/api/notifications/unread/count');
        const nData = await nRes.json();
        if (nData.count > 0) {
          notifBellEl.textContent = nData.count;
          notifBellEl.style.display = 'inline-flex';
        } else {
          notifBellEl.style.display = 'none';
        }
      }
    } else {
      if (guestLinks) guestLinks.style.display = 'contents';
      if (userLinks) userLinks.style.display = 'none';
    }
  } catch (e) { console.error('Navbar init error', e); }
}

// Logout
async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

// Init chatbot widget (included on all pages)
function initChatbot() {
  const btn = document.getElementById('chatbot-btn');
  const panel = document.getElementById('chatbot-panel');
  const closeBtn = document.getElementById('chatbot-close');
  const input = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send');
  const messages = document.getElementById('chatbot-messages');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => panel.classList.toggle('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('open'));

  function appendMessage(text, type) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendListings(listings) {
    listings.forEach(l => {
      const el = document.createElement('div');
      el.className = 'chat-listing-mini';
      el.innerHTML = `<strong>${l.title}</strong>${formatPrice(l.price)} · ${l.condition}`;
      el.onclick = () => window.location = `/listing/${l.id}`;
      messages.appendChild(el);
    });
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    appendMessage(text, 'user');

    const thinking = document.createElement('div');
    thinking.className = 'chat-bubble bot';
    thinking.textContent = '...';
    messages.appendChild(thinking);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      thinking.remove();
      appendMessage(data.text || 'Sorry, I could not understand that.', 'bot');
      if (data.listings && data.listings.length > 0) appendListings(data.listings);
    } catch {
      thinking.remove();
      appendMessage('Connection error. Please try again.', 'bot');
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initChatbot();
});
