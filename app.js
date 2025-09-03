const statusEl = document.getElementById('status');
const verifyBtn = document.getElementById('verifyBtn');
const updateBtn = document.getElementById('updateBtn');
const scoreEl  = document.getElementById('score');
const tg = window.Telegram.WebApp;

const API_BASE = 'https://mini-app-service.onrender.com';

tg.ready(); // Notify Telegram we are ready

let initData = tg.initData; // Signed payload from Telegram
let verified = false;

// Verify user via initData (no phone number)
verifyBtn.onclick = async () => {
  try {
    const resp = await fetch(`${API_BASE}/api/verify-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });

    const data = await resp.json();

    if (data.ok) {
      verified = true;
      statusEl.textContent = `Verified as ${data.username || 'user'}!`;
      verifyBtn.style.display = 'none';
      updateBtn.style.display = '';
    } else {
      statusEl.textContent = 'Verification failed.';
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Verification error.';
  }
};

// Fetch score from server
updateBtn.onclick = async () => {
  if (!verified) return;
  statusEl.textContent = 'Updating...';
  const resp = await fetch(`${API_BASE}/api/get-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });

  const data = await resp.json();
  if (data.ok) {
    scoreEl.textContent = `Current score: ${data.score}`;
    statusEl.textContent = 'Score updated!';
  } else {
    statusEl.textContent = 'Error retrieving score.';
  }
};
