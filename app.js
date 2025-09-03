const statusEl = document.getElementById('status');
const verifyBtn = document.getElementById('verifyBtn');
const updateBtn = document.getElementById('updateBtn');
const scoreEl = document.getElementById('score');
const loader = document.getElementById('loader');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');

const tg = window.Telegram.WebApp;

const API_BASE = 'https://mini-app-service.onrender.com';

tg.ready(); // Notify Telegram that we are ready

let initData = tg.initData;
let verified = false;

// Set dark/light theme based on Telegram
document.body.setAttribute('data-theme', tg.colorScheme);

// Display user info
const user = tg.initDataUnsafe?.user;
if (user) {
  userName.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
  // Use avatar fallback image since Telegram doesn't provide avatar URL
  userAvatar.src = `https://t.me/i/userpic/320/${user.username || 'unknown'}.jpg`;
}

// Loader control
const showLoader = () => loader.style.display = 'inline-block';
const hideLoader = () => loader.style.display = 'none';

// Verify user via initData
verifyBtn.onclick = async () => {
  try {
    showLoader();
    const resp = await fetch(`${API_BASE}/api/verify-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    const data = await resp.json();
    hideLoader();

    if (data.ok) {
      verified = true;
      statusEl.textContent = `✅ Verified as ${data.username || 'user'}!`;
      verifyBtn.style.display = 'none';
      updateBtn.style.display = '';
      statusEl.style.color = 'var(--status-ok)';
    } else {
      statusEl.textContent = 'Verification failed.';
      statusEl.style.color = 'var(--status-error)';
    }
  } catch (err) {
    hideLoader();
    console.error(err);
    statusEl.textContent = 'Verification error.';
    statusEl.style.color = 'var(--status-error)';
  }
};

// Fetch score
updateBtn.onclick = async () => {
  if (!verified) return;
  statusEl.textContent = 'Updating...';
  statusEl.style.color = 'var(--secondary-text)';
  showLoader();

  try {
    const resp = await fetch(`${API_BASE}/api/get-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    const data = await resp.json();
    hideLoader();

    if (data.ok) {
      scoreEl.textContent = `Current score: ${data.score}`;
      statusEl.textContent = '✅ Score updated!';
      statusEl.style.color = 'var(--status-ok)';
    } else {
      statusEl.textContent = 'Error retrieving score.';
      statusEl.style.color = 'var(--status-error)';
    }
  } catch (err) {
    hideLoader();
    console.error(err);
    statusEl.textContent = 'Error connecting to server.';
    statusEl.style.color = 'var(--status-error)';
  }
};
