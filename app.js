/* ═══════════════════════════════════════════════
   GOOD VIBES — App Logic
   Telegram Mini App | Maloka
   ═══════════════════════════════════════════════ */

/* ─── Telegram Init ─── */
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  document.body.setAttribute('data-tg-theme', tg.colorScheme ?? 'dark');
}

const tgUser    = tg?.initDataUnsafe?.user;
const initData  = tg?.initData ?? '';  // passed to backend for auth

const API_BASE = 'https://mini-app-service-production.up.railway.app';

/* ─── Reward Toast ─── */
const rewardToast      = document.getElementById('rewardToast');
const rewardToastPts   = document.getElementById('rewardToastPts');
const rewardToastLabel = document.getElementById('rewardToastLabel');
let toastTimer = null;

function showRewardToast(points, label) {
  if (toastTimer) clearTimeout(toastTimer);
  rewardToastPts.textContent   = `+${points} pts`;
  rewardToastLabel.textContent = label;
  rewardToast.classList.remove('hidden', 'hide');
  rewardToast.classList.add('show');

  toastTimer = setTimeout(() => {
    rewardToast.classList.remove('show');
    rewardToast.classList.add('hide');
    toastTimer = setTimeout(() => {
      rewardToast.classList.add('hidden');
      rewardToast.classList.remove('hide');
    }, 350);
  }, 3000);
}

/* ─── Daily Login Reward (called on app start) ─── */
async function claimDailyLogin() {
  if (!initData) return;   // not inside Telegram, skip
  try {
    const res  = await fetch(`${API_BASE}/api/daily-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });
    const data = await res.json();
    if (data.ok && !data.already_claimed && data.points_earned > 0) {
      showRewardToast(data.points_earned, `Daily Login Bonus! 🔥 ${data.streak}-day streak`);
    }
  } catch (e) {
    console.warn('[daily-login]', e);
  }
}

claimDailyLogin();

/* ─── Activity Reward ─── */
const ACTIVITY_LABELS = {
  breathing:   { label: 'Box Breathing Complete!', pts: 15 },
  meditation:  { label: 'Meditation Complete!',    pts: 20 },
  affirmation: { label: 'Daily Affirmation!',      pts: 5  },
  mood_check:  { label: 'Mood Check Done!',         pts: 5  },
};

async function claimActivityReward(activity) {
  if (!initData) return;
  try {
    const res  = await fetch(`${API_BASE}/api/activity-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, activity }),
    });
    const data = await res.json();
    if (data.ok && !data.already_claimed && data.points_earned > 0) {
      const info = ACTIVITY_LABELS[activity];
      showRewardToast(data.points_earned, info.label);
      // Mark badge as claimed
      const badgeMap = { breathing: 'badgeBreathing', meditation: 'badgeMeditation', affirmation: 'badgeAffirmation', mood_check: 'badgeMood' };
      const actMap   = { breathing: 'actBreathing', meditation: 'actMeditation', affirmation: 'actAffirmation', mood_check: 'actMood' };
      document.getElementById(badgeMap[activity])?.closest('.activity-card')?.classList.add('claimed');
    }
  } catch (e) {
    console.warn('[activity-reward]', e);
  }
}

/* ─── DOM refs ─── */
const guruListEl   = document.getElementById('guruList');
const guruFilter   = document.getElementById('guruFilter');
const welcomeStrip = document.getElementById('welcomeStrip');
const welcomeName  = document.getElementById('welcomeName');
const welcomeAvatar= document.getElementById('welcomeAvatar');
const telegramInfo = document.getElementById('telegramUserInfo');
const quoteText    = document.getElementById('quoteText');
const quoteAuthor  = document.getElementById('quoteAuthor');
const overlay      = document.getElementById('overlay');

/* ─── User display ─── */
if (tgUser) {
  welcomeStrip.classList.remove('hidden');
  welcomeName.textContent = tgUser.first_name ?? 'Friend';
  welcomeAvatar.src = `https://t.me/i/userpic/320/${tgUser.username ?? 'unknown'}.jpg`;
  welcomeAvatar.onerror = () => { welcomeAvatar.src = ''; };
  telegramInfo.textContent = `Logged in as @${tgUser.username ?? tgUser.first_name}`;
}

/* ══════════════════════════════════════════════
   GURU DATA
══════════════════════════════════════════════ */
const gurus = [
  {
    id: 'arjun',
    name: 'Arjun Sharma',
    handle: '@arjun.wellness',
    emoji: '🧘‍♂️',
    gradient: 'linear-gradient(135deg, #0d7377 0%, #14a085 100%)',
    tagBg: '#0d7377',
    tagColor: '#5eecd8',
    followers: '218K',
    bio: 'Registered yoga teacher with 15+ years of practice. Science-backed postures, flows, and alignment for every level.',
    tags: ['🧘 Asanas', '🌿 Alignment', '🔥 Vinyasa', '🌱 Beginner-friendly'],
    specialties: ['yoga'],
    ctaText: 'Chat with Arjun',
    btnGradient: 'linear-gradient(135deg, #0d7377, #14a085)',
    welcomeMsg: "Namaste 🙏 I'm Arjun, your dedicated yoga guide. Whether you're stepping onto the mat for the first time or deepening an existing practice — I'm here. What brings you today?",
    // ── Live AI backend for this guru ──
    chatUrl: 'https://nemoclawtelegrambackend-production.up.railway.app/chat',
  },
  {
    id: 'priya',
    name: 'Priya Nair',
    handle: '@priya.breathe',
    emoji: '🌬️',
    gradient: 'linear-gradient(135deg, #0e6655 0%, #1abc9c 100%)',
    tagBg: '#0e6655',
    tagColor: '#6ce5c8',
    followers: '247K',
    bio: 'Clinical breathwork therapist. Regulate your nervous system and heal anxiety through the simple power of conscious breathing.',
    tags: ['🌬️ Pranayama', '🫁 Breath Therapy', '💙 Nervous System', '😌 Anxiety Relief'],
    specialties: ['breathwork'],
    ctaText: 'Chat with Priya',
    btnGradient: 'linear-gradient(135deg, #0e6655, #1abc9c)',
    welcomeMsg: "Take a deep breath 🌬️ I'm Priya, your breathwork specialist. Your breath is your most accessible superpower. Are you dealing with stress, anxiety, or just want to feel more centred?",
  },
  {
    id: 'maya',
    name: 'Maya Patel',
    handle: '@maya.mindful',
    emoji: '🧘‍♀️',
    gradient: 'linear-gradient(135deg, #6a1bbf 0%, #c044e0 100%)',
    tagBg: '#6a1bbf',
    tagColor: '#e099f5',
    followers: '312K',
    bio: 'Certified meditation coach with 10,000+ hours of practice. From beginner guided sessions to advanced silent retreats.',
    tags: ['🌙 Guided Meditation', '🧠 Mindfulness', '☮️ Stillness', '✨ Inner Peace'],
    specialties: ['meditation'],
    ctaText: 'Chat with Maya',
    btnGradient: 'linear-gradient(135deg, #7b2d8b, #c044e0)',
    welcomeMsg: "Hello beautiful soul ✨ I'm Maya, your meditation guide. Even five minutes of stillness can change your entire day. What's on your mind — or heart — today?",
  },
  {
    id: 'kai',
    name: 'Kai Tanaka',
    handle: '@kai.nutrition',
    emoji: '🥗',
    gradient: 'linear-gradient(135deg, #1a6336 0%, #2dce89 100%)',
    tagBg: '#1a6336',
    tagColor: '#5fedad',
    followers: '189K',
    bio: 'Certified nutritionist & functional medicine coach. Transform your health through the power of food-as-medicine.',
    tags: ['🥦 Whole Foods', '🌱 Plant-based', '🧪 Functional', '⚡ Energy Optimization'],
    specialties: ['nutrition'],
    ctaText: 'Chat with Kai',
    btnGradient: 'linear-gradient(135deg, #1a6336, #2dce89)',
    welcomeMsg: "Hey! 🥗 I'm Kai, your nutrition expert. Food is your most powerful medicine — and I'm here to make eating well simple and enjoyable. Tell me about your health goals!",
  },
  {
    id: 'zara',
    name: 'Zara Ahmed',
    handle: '@zara.strong',
    emoji: '💪',
    gradient: 'linear-gradient(135deg, #b03a2e 0%, #e74c3c 100%)',
    tagBg: '#b03a2e',
    tagColor: '#f5a09d',
    followers: '163K',
    bio: 'Functional fitness coach & strength trainer. Build a resilient body that moves beautifully and performs powerfully.',
    tags: ['💪 Strength', '🏃 Cardio', '🧗 Mobility', '🔥 HIIT'],
    specialties: ['fitness'],
    ctaText: 'Chat with Zara',
    btnGradient: 'linear-gradient(135deg, #b03a2e, #e74c3c)',
    welcomeMsg: "Let's get after it 💪 I'm Zara, your fitness coach. Whether you want strength, endurance, or just to move better — I'll build a plan around your life. What are your goals?",
  },
  {
    id: 'luna',
    name: 'Luna Rivera',
    handle: '@luna.sleep',
    emoji: '🌙',
    gradient: 'linear-gradient(135deg, #1e3a6e 0%, #4a90d9 100%)',
    tagBg: '#1e3a6e',
    tagColor: '#7ab8f5',
    followers: '275K',
    bio: 'Sleep scientist & recovery specialist. Unlock the restorative power of deep, quality sleep for radical physical and mental wellbeing.',
    tags: ['😴 Sleep Science', '🌡️ Biohacking', '🧬 Recovery', '🌀 Circadian Rhythm'],
    specialties: ['sleep'],
    ctaText: 'Chat with Luna',
    btnGradient: 'linear-gradient(135deg, #1e3a6e, #4a90d9)',
    welcomeMsg: "Hi 🌙 I'm Luna, your sleep & recovery specialist. Great sleep isn't a luxury — it's the foundation of everything. How has your sleep been lately?",
  },
  {
    id: 'dev',
    name: 'Dev Krishnamurthy',
    handle: '@dev.spirit',
    emoji: '🔮',
    gradient: 'linear-gradient(135deg, #3d1a78 0%, #9b59b6 100%)',
    tagBg: '#3d1a78',
    tagColor: '#c99ef3',
    followers: '401K',
    bio: 'Vedic wisdom keeper & spiritual guide. Ancient teachings reimagined for modern souls navigating the chaos of today.',
    tags: ['🕉️ Vedanta', '📿 Mantra', '🌸 Chakras', '🔮 Inner Alchemy'],
    specialties: ['spiritual'],
    ctaText: 'Chat with Dev',
    btnGradient: 'linear-gradient(135deg, #3d1a78, #9b59b6)',
    welcomeMsg: "Hari Om 🕉️ I'm Dev, your spiritual guide. Ancient Vedic wisdom has answers for today's deepest questions. What are you seeking on your inner journey?",
  },
  {
    id: 'ryu',
    name: 'Ryu Nakamura',
    handle: '@ryu.zen',
    emoji: '🧠',
    gradient: 'linear-gradient(135deg, #1c3252 0%, #2e86ab 100%)',
    tagBg: '#1c3252',
    tagColor: '#76bcd8',
    followers: '334K',
    bio: 'Cognitive psychologist & Zen practitioner. Master your mind, dissolve chronic stress, and find lasting clarity in the chaos of modern life.',
    tags: ['🧠 Mental Health', '🧘 Zen', '📚 CBT', '⚡ Resilience'],
    specialties: ['stress'],
    ctaText: 'Chat with Ryu',
    btnGradient: 'linear-gradient(135deg, #1c3252, #2e86ab)',
    welcomeMsg: "Welcome 🧠 I'm Ryu, your stress management specialist. Stress and mental fog are just patterns — and patterns can change. What's weighing on your mind lately?",
  },
];


/* ── Render Gurus ── */
function renderGurus(filter = 'all') {
  const filtered = filter === 'all'
    ? gurus
    : gurus.filter(g => g.specialties.includes(filter));

  guruListEl.innerHTML = '';

  if (filtered.length === 0) {
    guruListEl.innerHTML = `<p style="color:var(--text2);text-align:center;padding:24px 0;">No gurus found for this specialty.</p>`;
    return;
  }

  filtered.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'guru-card';
    card.style.animationDelay = `${i * 60}ms`;
    card.style.setProperty('--guru-accent', g.gradient);
    card.innerHTML = `
      <div class="guru-head">
        <div class="guru-avatar-wrap">
          <div class="guru-avatar" style="background:${g.gradient};">${g.emoji}</div>
          <span class="guru-online-dot"></span>
        </div>
        <div class="guru-meta">
          <div class="guru-name">${g.name}</div>
          <div class="guru-handle">${g.handle}</div>
          <div class="guru-followers">🏆 ${g.followers} followers</div>
        </div>
      </div>
      <p class="guru-bio">${g.bio}</p>
      <div class="guru-tags">
        ${g.tags.map(t => `<span class="guru-tag" style="background:rgba(${hexToRgb(g.tagBg)},0.15);color:${g.tagColor};border-color:rgba(${hexToRgb(g.tagBg)},0.3);">${t}</span>`).join('')}
      </div>
      <button class="guru-btn" style="background:${g.btnGradient};" id="guruBtn_${g.id}" data-id="${g.id}">
        ${g.ctaText} →
      </button>
    `;
    guruListEl.appendChild(card);

    card.querySelector(`#guruBtn_${g.id}`).addEventListener('click', () => {
      openChat(g);
    });
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

/* ── Filter ── */
guruFilter.addEventListener('change', () => renderGurus(guruFilter.value));
renderGurus(); // initial render

/* ══════════════════════════════════════════════
   TABS
══════════════════════════════════════════════ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Deactivate all tabs + hide all panels
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));

    // Activate clicked tab
    btn.classList.add('active');

    // Show corresponding panel (re-trigger animation)
    const panel = document.getElementById(btn.dataset.tab);
    panel.classList.remove('hidden');
    panel.style.animation = 'none';
    panel.offsetHeight; // reflow to restart animation
    panel.style.animation = '';
  });
});

/* ══════════════════════════════════════════════
   QUOTES
══════════════════════════════════════════════ */
const quotes = [
  { text: 'The present moment is the only moment available to us, and it is the door to all moments.', author: '— THICH NHAT HANH' },
  { text: 'Your body is a temple, but only if you treat it as one.', author: '— ASTRID ALAUDA' },
  { text: 'Breathe deeply, until sweet air extinguishes the burn of fear in your lungs.', author: '— KAREN MARIE MONING' },
  { text: 'Almost everything will work again if you unplug it for a few minutes — including you.', author: '— ANNE LAMOTT' },
  { text: 'The mind is everything. What you think, you become.', author: '— BUDDHA' },
  { text: 'Take care of your body. It\'s the only place you have to live.', author: '— JIM ROHN' },
];
function showRandomQuote() {
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  quoteText.textContent = q.text;
  quoteAuthor.textContent = q.author;
}
showRandomQuote();
setInterval(showRandomQuote, 30_000);

/* ══════════════════════════════════════════════
   MODAL HELPERS (for activity modals)
══════════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}
overlay.addEventListener('click', () => {
  ['breathingModal','meditationModal','affirmationModal','moodModal','onboardingModal'].forEach(closeModal);
  stopBreathing();
  stopMeditation();
});

/* ══════════════════════════════════════════════
   💬 CHAT SCREEN
══════════════════════════════════════════════ */
const chatScreen     = document.getElementById('chatScreen');
const chatBack       = document.getElementById('chatBack');
const chatMessages   = document.getElementById('chatMessages');
const chatTyping     = document.getElementById('chatTyping');
const chatInput      = document.getElementById('chatInput');
const chatSend       = document.getElementById('chatSend');
const chatHeaderName = document.getElementById('chatHeaderName');
const chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
const chatHeaderTag  = document.getElementById('chatHeaderTag');
const typingAvatar   = document.getElementById('typingAvatar');

let activeGuru = null;
// conversation history per guru: { [guruId]: [{role, content}] }
const conversations = {};

/* Open chat */
function openChat(guru) {
  activeGuru = guru;

  // Header
  chatHeaderName.textContent = guru.name;
  chatHeaderAvatar.textContent = guru.emoji;
  chatHeaderAvatar.style.background = guru.gradient;
  chatHeaderTag.textContent = guru.tags[0];
  chatHeaderTag.style.background = `rgba(${hexToRgb(guru.tagBg)},0.2)`;
  chatHeaderTag.style.color = guru.tagColor;
  typingAvatar.textContent = guru.emoji;
  typingAvatar.style.background = guru.gradient;

  // Init conversation if first time
  if (!conversations[guru.id]) conversations[guru.id] = [];

  // Render messages
  renderMessages(guru);

  // Scroll to bottom
  setTimeout(() => scrollToBottom(), 80);

  // Show screen
  chatScreen.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Focus input
  setTimeout(() => chatInput.focus(), 400);

  // Telegram back button
  if (tg?.BackButton) {
    tg.BackButton.show();
    tg.BackButton.onClick(() => closeChat());
  }
}

/* Close chat */
function closeChat() {
  chatScreen.classList.remove('open');
  document.body.style.overflow = '';
  chatInput.blur();
  if (tg?.BackButton) tg.BackButton.hide();
}

chatBack.addEventListener('click', closeChat);

/* Render messages for current guru */
function renderMessages(guru) {
  chatMessages.innerHTML = '';

  // Intro card (always shown)
  const intro = document.createElement('div');
  intro.className = 'chat-intro-card';
  intro.innerHTML = `
    <div class="chat-intro-avatar">${guru.emoji}</div>
    <div class="chat-intro-name">${guru.name}</div>
    <div class="chat-intro-bio">${guru.bio}</div>
    <div class="chat-intro-tags">
      ${guru.tags.map(t => `<span class="guru-tag" style="background:rgba(${hexToRgb(guru.tagBg)},0.15);color:${guru.tagColor};border-color:rgba(${hexToRgb(guru.tagBg)},0.3);font-size:11px;">${t}</span>`).join('')}
    </div>
  `;
  chatMessages.appendChild(intro);

  // Date divider
  const div = document.createElement('div');
  div.className = 'chat-date-divider';
  div.textContent = 'Today';
  chatMessages.appendChild(div);

  const history = conversations[guru.id];

  // If no history, show welcome message from guru
  if (history.length === 0) {
    appendMessage('guru', guru.welcomeMsg, guru);
    conversations[guru.id].push({ role: 'assistant', content: guru.welcomeMsg });
    return;
  }

  // Replay history
  history.forEach(msg => {
    appendMessage(msg.role === 'user' ? 'user' : 'guru', msg.content, guru);
  });
}

/* Append a single message bubble */
function appendMessage(side, text, guru) {
  const row = document.createElement('div');
  row.className = `msg-row ${side}`;

  const now = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  if (side === 'guru') {
    row.innerHTML = `
      <div class="msg-avatar" style="background:${guru.gradient};">${guru.emoji}</div>
      <div class="msg-bubble">
        ${escapeHtml(text)}
        <span class="msg-time">${now}</span>
      </div>`;
  } else {
    row.innerHTML = `
      <div class="msg-bubble">
        ${escapeHtml(text)}
        <span class="msg-time">${now}</span>
      </div>`;
  }

  chatMessages.appendChild(row);
  scrollToBottom();
}

function appendErrorMessage(text) {
  const row = document.createElement('div');
  row.className = 'msg-row guru';
  row.innerHTML = `
    <div class="msg-bubble msg-error">⚠️ ${escapeHtml(text)}</div>`;
  chatMessages.appendChild(row);
  scrollToBottom();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/\n/g,'<br>');
}

/* Show/hide typing indicator */
function showTyping() {
  chatTyping.classList.remove('hidden');
  scrollToBottom();
}
function hideTyping() {
  chatTyping.classList.add('hidden');
}

/* ── Send message ── */
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !activeGuru) return;

  const guru = activeGuru;

  // Append user message to UI and history
  appendMessage('user', text, guru);
  conversations[guru.id].push({ role: 'user', content: text });

  chatInput.value = '';
  chatInput.style.height = 'auto';
  chatSend.disabled = true;
  showTyping();

  try {
    let reply;

    if (guru.chatUrl) {
      // ── Simple backend: POST { message } → { reply } ──
      // Used by gurus that have their own dedicated AI endpoint (e.g. Arjun → Railway).
      const resp = await fetch(guru.chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      hideTyping();

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);

      const data = await resp.json();
      reply = data.reply ?? data.message ?? null;
      if (!reply) throw new Error('Empty reply from server.');

    } else {
      // ── Generic backend: POST { initData, guruId, message, history } → { ok, reply } ──
      // Fallback for gurus not yet wired to a dedicated model.
      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          guruId: guru.id,
          message: text,
          history: conversations[guru.id].slice(-20),
        }),
      });

      hideTyping();

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);

      const data = await resp.json();
      if (!data.ok) throw new Error(data.error ?? 'Something went wrong.');
      reply = data.reply;
    }

    appendMessage('guru', reply, guru);
    conversations[guru.id].push({ role: 'assistant', content: reply });

  } catch (err) {
    hideTyping();
    console.error('[Chat error]', err);
    appendErrorMessage(
      err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
        ? 'Could not reach the server. Check your connection and try again.'
        : `Error: ${err.message}`
    );
  }
}

/* Input auto-resize & send button state */
chatInput.addEventListener('input', () => {
  chatSend.disabled = chatInput.value.trim().length === 0;
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

/* Send on button click */
chatSend.addEventListener('click', sendMessage);

/* Send on Enter (Shift+Enter = newline) */
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!chatSend.disabled) sendMessage();
  }
});

/* ══════════════════════════════════════════════
   🌬️ BREATHING EXERCISE
══════════════════════════════════════════════ */
const breathPhaseEl  = document.getElementById('breathPhase');
const breathCountEl  = document.getElementById('breathCount');
const breathCyclesEl = document.getElementById('breathCycles');
const breathRing     = document.getElementById('breathingRing');
const startBreathBtn = document.getElementById('startBreathing');
const closeBreathBtn = document.getElementById('closeBreathing');

document.getElementById('actBreathing').addEventListener('click', () => openModal('breathingModal'));
closeBreathBtn.addEventListener('click', () => { closeModal('breathingModal'); stopBreathing(); });

const PHASES = [
  { name: 'Inhale',   duration: 4, color: '#00e5cc' },
  { name: 'Hold',     duration: 4, color: '#a855f7' },
  { name: 'Exhale',   duration: 4, color: '#f06292' },
  { name: 'Hold',     duration: 4, color: '#a855f7' },
];

let breathTimer = null, breathRunning = false, breathCycles = 0, phaseIdx = 0, phaseCount = 0;

function stopBreathing() {
  clearTimeout(breathTimer);
  breathRunning = false;
  breathPhaseEl.textContent = 'Ready';
  breathPhaseEl.style.color = 'var(--teal)';
  breathCountEl.textContent = '';
  breathRing.style.setProperty('--progress', '0%');
  startBreathBtn.textContent = '▶  Start Session';
  phaseIdx = 0; phaseCount = 0;
}

startBreathBtn.addEventListener('click', () => {
  if (breathRunning) { stopBreathing(); return; }
  breathRunning = true; breathCycles = 0; phaseIdx = 0; phaseCount = 0;
  startBreathBtn.textContent = '⏹  Stop';
  tick();
});

function tick() {
  if (!breathRunning) return;
  const phase = PHASES[phaseIdx];
  breathPhaseEl.textContent = phase.name;
  breathPhaseEl.style.color = phase.color;
  breathCountEl.textContent = phase.duration - phaseCount;
  breathRing.style.setProperty('--progress', `${(phaseCount / phase.duration) * 100}%`);
  phaseCount++;
  if (phaseCount > phase.duration) {
    phaseCount = 0;
    phaseIdx = (phaseIdx + 1) % PHASES.length;
    if (phaseIdx === 0) {
      breathCycles++;
      breathCyclesEl.innerHTML = `Cycles completed: <strong>${breathCycles}</strong>`;
      // ⭐ Award breathing reward after 3 cycles
      if (breathCycles === 3) {
        claimActivityReward('breathing');
      }
    }
  }
  breathTimer = setTimeout(tick, 1000);
}

/* ══════════════════════════════════════════════
   🧘 MEDITATION TIMER
══════════════════════════════════════════════ */
const meditationTimeEl  = document.getElementById('meditationTime');
const meditationOrb     = document.getElementById('meditationOrb');
const meditationInstEl  = document.getElementById('meditationInstruction');
const startMeditateBtn  = document.getElementById('startMeditation');
const closeMeditateBtn  = document.getElementById('closeMeditation');
const durBtns           = document.querySelectorAll('.dur-btn');

let meditationTimer = null, meditationActive = false, meditationSecs = 300, selectedMins = 5;

document.getElementById('actMeditation').addEventListener('click', () => openModal('meditationModal'));
closeMeditateBtn.addEventListener('click', () => { closeModal('meditationModal'); stopMeditation(); });

durBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (meditationActive) return;
    durBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMins = +btn.dataset.mins;
    meditationSecs = selectedMins * 60;
    meditationTimeEl.textContent = formatTime(meditationSecs);
  });
});

function formatTime(s) {
  return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
}

function stopMeditation() {
  clearInterval(meditationTimer); meditationActive = false;
  meditationSecs = selectedMins * 60;
  meditationTimeEl.textContent = formatTime(meditationSecs);
  meditationOrb.classList.remove('pulsing');
  meditationInstEl.textContent = 'Choose your duration';
  startMeditateBtn.textContent = 'Begin Session';
}

startMeditateBtn.addEventListener('click', () => {
  if (meditationActive) { stopMeditation(); return; }
  meditationActive = true;
  meditationOrb.classList.add('pulsing');
  meditationInstEl.textContent = 'Focus on your breath…';
  startMeditateBtn.textContent = '⏹  Stop Session';
  meditationTimer = setInterval(() => {
    meditationSecs--;
    meditationTimeEl.textContent = formatTime(meditationSecs);
    if (meditationSecs <= 0) {
      stopMeditation();
      meditationInstEl.textContent = '🎉 Session complete! Well done.';
      // ⭐ Award meditation reward on full completion
      claimActivityReward('meditation');
    }
  }, 1000);
});

/* ══════════════════════════════════════════════
   ✨ AFFIRMATIONS
══════════════════════════════════════════════ */
const affirmations = [
  { text: 'I am enough. I have always been enough.',                           author: '— Daily Mantra' },
  { text: 'I choose peace over perfection.',                                    author: '— Wellness Wisdom' },
  { text: 'My body is healing and becoming stronger every day.',               author: '— Arjun Sharma' },
  { text: 'I release what no longer serves me with love.',                      author: '— Maya Patel' },
  { text: 'I breathe in calm, and I breathe out tension.',                      author: '— Priya Nair' },
  { text: 'I trust the process of life and welcome all that comes my way.',    author: '— Dev Krishnamurthy' },
  { text: 'My mind is clear, my heart is open, my spirit is free.',           author: '— Luna Rivera' },
  { text: 'Every morning I wake up grateful for another chance to grow.',      author: '— Ryu Nakamura' },
  { text: 'I nourish my body with intention and gratitude.',                   author: '— Kai Tanaka' },
  { text: 'I am stronger than I think, and braver than I know.',               author: '— Zara Ahmed' },
];

let affIdx = 0;
const affTextEl   = document.getElementById('affirmationText');
const affAuthorEl = document.getElementById('affirmationAuthor');

function showAffirmation(idx) {
  affTextEl.style.opacity = '0';
  setTimeout(() => {
    const a = affirmations[idx];
    affTextEl.textContent   = a.text;
    affAuthorEl.textContent = a.author;
    affTextEl.style.transition = 'opacity 0.35s';
    affTextEl.style.opacity = '1';
  }, 150);
}

document.getElementById('actAffirmation').addEventListener('click', () => {
  showAffirmation(affIdx);
  openModal('affirmationModal');
  // ⭐ Award affirmation reward on viewing
  claimActivityReward('affirmation');
});
document.getElementById('closeAffirmation').addEventListener('click', () => closeModal('affirmationModal'));
document.getElementById('nextAffirmation').addEventListener('click', () => { affIdx = (affIdx + 1) % affirmations.length; showAffirmation(affIdx); });
document.getElementById('prevAffirmation').addEventListener('click', () => { affIdx = (affIdx - 1 + affirmations.length) % affirmations.length; showAffirmation(affIdx); });

/* ══════════════════════════════════════════════
   💜 MOOD CHECK
══════════════════════════════════════════════ */
const moodResponses = {
  amazing: { msg: '🌟 That\'s incredible!',          tip: 'Channel this energy into your practice today. Try a challenging yoga flow with Arjun!' },
  good:    { msg: '😊 Love that for you!',            tip: 'A great day to deepen your meditation practice. Check out Dev\'s spiritual guidance.' },
  okay:    { msg: '😐 That\'s valid.',                tip: 'A gentle breathwork session with Priya might shift your state beautifully.' },
  stressed:{ msg: '😤 Stress is a signal — not a verdict.', tip: 'Ryu\'s stress management techniques can help you reset in just minutes.' },
  sad:     { msg: '💙 Your feelings are valid.',      tip: 'Maya\'s energy healing approach is especially nurturing on difficult days.' },
  anxious: { msg: '💛 You\'re safe right now.',       tip: 'Try the box breathing exercise — it signals your nervous system to calm down.' },
};

document.getElementById('actMood').addEventListener('click', () => openModal('moodModal'));
document.getElementById('closeMood').addEventListener('click', () => closeModal('moodModal'));

document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mood = btn.dataset.mood;
    const resp = moodResponses[mood];
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const respEl = document.getElementById('moodResponse');
    document.getElementById('moodResponseText').textContent = resp.msg;
    document.getElementById('moodGuruTip').textContent      = resp.tip;
    respEl.classList.remove('hidden');
    respEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // ⭐ Award mood check reward on first selection
    claimActivityReward('mood_check');
  });
});

/* ══════════════════════════════════════════════
   🏆 PROFILE
══════════════════════════════════════════════ */

const EVENT_META = {
  daily_login:  { icon: '🔐', name: 'Daily Login' },
  breathing:    { icon: '🌬️', name: 'Box Breathing' },
  meditation:   { icon: '🧘', name: 'Meditation' },
  affirmation:  { icon: '✨', name: 'Daily Affirmation' },
  mood_check:   { icon: '💜', name: 'Mood Check' },
};

function animateCounter(el, target, duration = 800) {
  const start    = parseInt(el.textContent) || 0;
  const diff     = target - start;
  const startTime = performance.now();

  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

async function loadProfile() {
  const feedEl      = document.getElementById('profileFeed');
  const pointsEl    = document.getElementById('profilePoints');
  const streakEl    = document.getElementById('profileStreak');
  const usernameEl  = document.getElementById('profileUsername');
  const handleEl    = document.getElementById('profileHandle');
  const avatarEl    = document.getElementById('profileAvatar');
  const placeholderEl = document.getElementById('profileAvatarPlaceholder');

  // Fill in local Telegram user data first (instant)
  if (tgUser) {
    usernameEl.textContent = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
    if (tgUser.username) handleEl.textContent = '@' + tgUser.username;
    if (tgUser.username) {
      avatarEl.src = `https://t.me/i/userpic/320/${tgUser.username}.jpg`;
      avatarEl.onload  = () => { placeholderEl.style.display = 'none'; };
      avatarEl.onerror = () => { avatarEl.style.display = 'none'; };
    }
  }

  // Fetch profile from backend
  if (!initData) {
    // No Telegram context: show defaults
    pointsEl.textContent = '0';
    streakEl.textContent = '0';
    feedEl.innerHTML = '<div class="feed-empty">Open in Telegram to see your activity 🚀</div>';
    return;
  }

  feedEl.innerHTML = '<div class="profile-feed-loading">Loading activity…</div>';

  try {
    const url = `${API_BASE}/api/profile?initData=${encodeURIComponent(initData)}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.ok) throw new Error(data.error);

    animateCounter(pointsEl, data.total_points);
    animateCounter(streakEl, data.streak);

    if (data.events.length === 0) {
      feedEl.innerHTML = '<div class="feed-empty">No activity yet — complete a session to earn points!</div>';
      return;
    }

    feedEl.innerHTML = '';
    data.events.forEach((ev, i) => {
      const meta = EVENT_META[ev.type] || { icon: '⭐', name: ev.type };
      const date = new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const el   = document.createElement('div');
      el.className = 'feed-event';
      el.style.animationDelay = `${i * 50}ms`;
      el.innerHTML = `
        <div class="feed-event-icon">${meta.icon}</div>
        <div class="feed-event-body">
          <div class="feed-event-name">${meta.name}</div>
          <div class="feed-event-date">${date}</div>
        </div>
        <div class="feed-event-pts">+${ev.points}</div>
      `;
      feedEl.appendChild(el);
    });

  } catch (e) {
    console.error('[profile]', e);
    feedEl.innerHTML = '<div class="feed-empty">⚠️ Could not load activity. Try again later.</div>';
  }
}

// Load profile when tab is clicked
document.getElementById('tabProfile')?.addEventListener('click', loadProfile);

/* ══════════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════════ */
const onboardingSteps = [
  { icon: '✨', title: 'Welcome to Good Vibes', desc: 'Your personal, AI-powered wellness sanctuary right inside Telegram. Let\'s take a quick tour.' },
  { icon: '🧘', title: 'AI Wellness Gurus', desc: 'Chat with specialized AI gurus for yoga, sleep, stress, and more. They respond like real wellness experts.' },
  { icon: '🌿', title: 'Wellness Activities', desc: 'Take a break with quick activities like box breathing, meditation, or daily affirmations.' }
];

let onboardingIndex = 0;
const obModal = document.getElementById('onboardingModal');
const obIcon = document.getElementById('onboardingIcon');
const obTitle = document.getElementById('onboardingTitle');
const obDesc = document.getElementById('onboardingDesc');
const obDotsContainer = document.getElementById('onboardingDots');

function renderOnboardingStep() {
  const step = onboardingSteps[onboardingIndex];
  obIcon.textContent = step.icon;
  obTitle.textContent = step.title;
  obDesc.textContent = step.desc;

  // Render dots
  obDotsContainer.innerHTML = onboardingSteps.map((_, i) => 
    `<span class="dot ${i === onboardingIndex ? 'active' : ''}"></span>`
  ).join('');

  if (onboardingIndex === onboardingSteps.length - 1) {
    document.getElementById('onboardingNext').textContent = 'Get Started 🚀';
  } else {
    document.getElementById('onboardingNext').textContent = 'Next →';
  }
}

function dismissOnboarding() {
  localStorage.setItem('hv_onboarding_done', 'true');
  closeModal('onboardingModal');
}

// Show onboarding if not done before
window.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('hv_onboarding_done')) {
    setTimeout(() => {
      openModal('onboardingModal');
      renderOnboardingStep();
    }, 1000); // Small delay so the app loads first
  }
});

document.getElementById('onboardingNext')?.addEventListener('click', () => {
  if (onboardingIndex < onboardingSteps.length - 1) {
    onboardingIndex++;
    renderOnboardingStep();
  } else {
    dismissOnboarding();
  }
});

document.getElementById('onboardingSkip')?.addEventListener('click', dismissOnboarding);
