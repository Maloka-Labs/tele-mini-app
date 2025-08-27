const statusEl = document.getElementById('status');
const verifyBtn = document.getElementById('verifyBtn');
const updateBtn = document.getElementById('updateBtn');
const scoreEl  = document.getElementById('score');

const tg = window.Telegram.WebApp;
tg.ready(); // Notify Telegram we are ready

let initData = tg.initData; // Send this to server to verify user
let verified = false;

// Verify phone number
verifyBtn.onclick = async () => {
  try {
    const contact = await tg.requestContact(); // show native phone popup:contentReference[oaicite:3]{index=3}.
    // Send to server for validation
    const resp = await fetch('/api/verify-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, contact })
    });
    const data = await resp.json();
    if (data.ok) {
      verified = true;
      statusEl.textContent = 'Verified!';
      verifyBtn.style.display = 'none';
      updateBtn.style.display = '';
    } else {
      statusEl.textContent = 'Verification failed.';
    }
  } catch (err) {
    statusEl.textContent = 'Verification cancelled.';
  }
};

// Fetch score from server
updateBtn.onclick = async () => {
  if (!verified) return;
  statusEl.textContent = 'Updating...';
  const resp = await fetch('/api/get-score', {
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
