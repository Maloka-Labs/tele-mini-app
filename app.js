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
let socket = null;

function initSocket() {
  if (socket) return;
  socket = io(API_BASE);
  
  socket.on('connect', () => console.log('⚡ Connected to Wellness Hub'));
  socket.on('campfire_state', (state) => updateCampfireUI(state));
  socket.on('campfire_tick', ({ timeLeft }) => {
    campfireTimeLeft = timeLeft;
    updateCampfireTimerDisplay();
  });
  socket.on('campfire_complete', () => showCampfireReflection());
  socket.on('campfire_status', (msg) => {
    const el = document.getElementById('syncInstruction');
    if (el) el.textContent = msg;
  });
  socket.on('error', (msg) => alert('Sync Error: ' + msg));
}

/* ─── Thumb Fu & Vibe Config ─── */
const BELTS = [
  { name: 'White',  pts: 0,    color: 'belt-white',  char: '🦖' },
  { name: 'Yellow', pts: 50,   color: 'belt-yellow', char: '🦕' },
  { name: 'Orange', pts: 150,  color: 'belt-orange', char: '🐊' },
  { name: 'Green',  pts: 300,  color: 'belt-green',  char: '🐢' },
  { name: 'Blue',   pts: 600,  color: 'belt-blue',   char: '🐉' },
  { name: 'Purple', pts: 1000, color: 'belt-purple', char: '🦚' },
  { name: 'Brown',  pts: 2000, color: 'belt-brown',  char: '🦁' },
  { name: 'Black',  pts: 4000, color: 'belt-black',  char: '🧙' },
];

function getBelt(points) {
  for (let i = BELTS.length - 1; i >= 0; i--) {
    if (points >= BELTS[i].pts) return BELTS[i];
  }
  return BELTS[0];
}

/* ─── Thumbagotchi SVG Controller ─── */
function updateThumbagotchiUI(pts, streak, hibernating) {
    const svg = document.getElementById('thumbagotchiSVG');
    const body = document.getElementById('tgBody');
    const aura = document.getElementById('tgAura');
    if (!svg || !body) return;

    const belt = getBelt(pts);
    const beltIdx = BELTS.indexOf(belt);

    // Color Logic: Use belt colors or derived HSL for smoothing
    const colors = [
        '#ffffff', // White
        '#ffd700', // Yellow
        '#ffa500', // Orange
        '#22c55e', // Green
        '#3b82f6', // Blue
        '#a855f7', // Purple
        '#a52a2a', // Brown
        '#00e5cc'  // Black (Teal accent)
    ];
    const bodyColor = colors[beltIdx] || '#00e5cc';
    
    // Set variables or direct attributes
    body.style.fill = bodyColor;
    if (aura) {
        aura.style.opacity = 0.2 + (streak * 0.05); // More streak = more glow
        document.documentElement.style.setProperty('--tg-aura-color', bodyColor + '66');
    }

    // Expression Logic
    const wrap = svg.parentElement;
    if (hibernating) {
        wrap.classList.add('hibernating');
    } else {
        wrap.classList.remove('hibernating');
    }
}

function reactToSuccess() {
    const svg = document.getElementById('thumbagotchiSVG');
    if (!svg) return;
    svg.classList.add('react-success');
    setTimeout(() => svg.classList.remove('react-success'), 800);
}

/* ─── Scaled Duration Logic (Thumb Fu Scaling) ─── */
function getScaledDuration(pts) {
  const belt = getBelt(pts);
  const beltIdx = BELTS.indexOf(belt);
  // Doxa Principle: scaling from 5 to 12 minutes
  // White (0) -> 5m, Black (7) -> 12m
  return 5 + beltIdx;
}

/* ─── Audio Controller ─── */
let audioCatalogue = null;
let currentAudio = null;
window.currentVolume = 0.4; // Default volume per Doxa

async function loadAudioCatalogue() {
  try {
    const res = await fetch('./audio_catalogue.json');
    audioCatalogue = await res.json();
  } catch (e) {
    console.error('[audio-catalogue]', e);
  }
}
loadAudioCatalogue();

function playAmbient(type, beltIdx = 0) {
  let src = '';
  let trackTitle = '';

  if (audioCatalogue && audioCatalogue[type]) {
    const track = audioCatalogue[type][beltIdx] || audioCatalogue[type][0];
    src = track.url;
    trackTitle = track.title;
  } else {
    // Fallback if catalogue not loaded
    const fallbacks = {
      stillness: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      movement:  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      sonic:     'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      wisdom:    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      emotion:   'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    };
    src = fallbacks[type];
  }

  if (!src) return;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  currentAudio = new Audio(src);
  currentAudio.loop = true;
  currentAudio.volume = window.currentVolume || 0.4;
  currentAudio.play().catch(e => console.warn('Audio play blocked:', e));

  // Update UI if trackTitle exists
  const infoEl = document.getElementById(type === 'sonic' ? 'sonicAudioInfo' : 'meditationAudioInfo');
  if (infoEl) {
    infoEl.textContent = trackTitle ? `🎵 ${trackTitle}` : '';
    infoEl.classList.remove('hidden');
  }
}

function stopAmbient() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

// ─── Volume Control Sync ───
function handleVolumeChange(e) {
  const val = parseFloat(e.target.value);
  window.currentVolume = val;
  if (currentAudio) currentAudio.volume = val;
  
  // Sync all sliders
  document.querySelectorAll('.volume-slider').forEach(s => s.value = val);
}

document.getElementById('meditationVolume')?.addEventListener('input', handleVolumeChange);
document.getElementById('sonicVolume')?.addEventListener('input', handleVolumeChange);

/* ─── Reward Toast ─── */
const rewardToast      = document.getElementById('rewardToast');
const rewardToastPts   = document.getElementById('rewardToastPts');
const rewardToastLabel = document.getElementById('rewardToastLabel');
let toastTimer = null;

function showRewardToast(points, label, multiplier = 1.0) {
  if (toastTimer) clearTimeout(toastTimer);
  
  const multEl = document.getElementById('rewardToastMultiplier');
  if (multiplier > 1.0) {
    const bonus = Math.round(points - (points / multiplier));
    multEl.textContent = `incl. ${bonus}pt Ring Two Bonus 🛰️`;
    multEl.classList.remove('hidden');
  } else {
    multEl.classList.add('hidden');
  }

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
  creation:    { label: 'Creative Spark Ignited!',  pts: 10 },
  nourish:     { label: 'Mindful Nourishment!',     pts: 10 },
  bridge:      { label: 'Connection Bridge Built!', pts: 10 },
  sonic:       { label: 'Sonic Haven Reached!',    pts: 15 },
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
      showRewardToast(data.points_earned, info.label, window.nodeData?.multiplier || 1.0);
      
      // Phase 3: Trigger visual reaction
      reactToSuccess();

      // Mark badge as claimed
      const actMap   = { breathing: 'octMovement', meditation: 'octStillness', affirmation: 'octWisdom', mood_check: 'octEmotion' };
      document.getElementById(actMap[activity])?.classList.add('claimed');
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
    id: 'lama',
    name: 'Thumb Lama',
    handle: '@thumb.lama',
    emoji: '🧘‍♂️',
    gradient: 'linear-gradient(135deg, #00e5cc 0%, #a855f7 100%)',
    tagBg: '#00e5cc',
    tagColor: '#ffffff',
    followers: '1.2M',
    bio: 'The Librarian and Host of the Dojo Den. Here to orchestrate your rebellion against the mindless scroll. Wellness is a quiet revolution.',
    tags: ['☸️ Host', '🧘‍♂️ Master', '📜 Librarian', '✨ Rebellion'],
    specialties: ['all'],
    ctaText: 'Seek Guidance',
    btnGradient: 'linear-gradient(135deg, var(--teal), var(--purple))',
    chatUrl: 'https://nemoclawtelegrambackend-production.up.railway.app/chat',
    welcomeMsg: "Welcome back to the Den, Rebel. ☸️ I am the Thumb Lama. Whether you seek stillness or movement, I am here to orchestrate your practice. How are you feeling in this moment?",
  },
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
    const panelId = btn.dataset.tab;
    const panel = document.getElementById(panelId);
    panel.classList.remove('hidden');
    panel.style.animation = 'none';
    panel.offsetHeight; // reflow to restart animation
    panel.style.animation = '';

    // Refresh data if switching to Profile or Dashboard
    if (panelId === 'panelProfile' || panelId === 'panelDashboard') {
      loadProfile();
    }
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
  
  // 🎵 Play audio based on modal
  if (id === 'breathingModal') playAmbient('movement');
  if (id === 'meditationModal') playAmbient('stillness');
  if (id === 'affirmationModal') playAmbient('wisdom');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
  stopAmbient();
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
/* ─── Phase 5: Smart Orchestration ─── */
function updateLamaNudge(data) {
  const nudgeEl = document.getElementById('lamaNudge');
  const nudgeText = document.getElementById('lamaNudgeText');
  if (!nudgeEl || !nudgeText) return;

  const hr = new Date().getHours();
  const octantScores = data.octant_scores || {};
  const isHibernating = window.isHibernating || false;

  let suggestedOctant = 'stillness';
  
  if (isHibernating) {
    // Priority: Restoration
    suggestedOctant = (octantScores.nourish < octantScores.stillness) ? 'nourish' : 'stillness';
  } else if (hr >= 20 || hr <= 2) {
    // Priority: Wind-down
    suggestedOctant = (octantScores.sonic < octantScores.stillness) ? 'sonic' : 'stillness';
  } else if (hr >= 6 && hr <= 11) {
    // Priority: Activation
    suggestedOctant = (octantScores.movement < octantScores.creation) ? 'movement' : 'creation';
  } else {
    // Default: Lowest score
    const octants = ['stillness', 'creation', 'sonic', 'wisdom', 'emotion', 'bridge', 'movement', 'nourish'];
    let minScore = 9999;
    octants.forEach(o => {
      if ((octantScores[o] || 0) < minScore) {
        minScore = octantScores[o] || 0;
        suggestedOctant = o;
      }
    });
  }

  const nudges = {
    stillness: "Your mind is racing, Rebel. Five minutes of Stillness?",
    creation:  "The spark is low. Shall we create something today?",
    sonic:     "The world is noisy. Retreat into a Sonic Haven.",
    wisdom:    "A moment of Wisdom dissolves a day of confusion.",
    emotion:   "Check your vibe. High-frequency emotions only.",
    bridge:    "Service is wellness. Connect with a fellow Rebel.",
    movement:  "Stagnant energy is the enemy. Move your body.",
    nourish:   "Nourish your temple. What did you feed your soul?"
  };

  nudgeText.textContent = nudges[suggestedOctant];
  window.lastLamaSuggestion = suggestedOctant; // Track for auto-open
  nudgeEl.classList.remove('hidden');

  if (!window.intakeCompleted) {
    setTimeout(initiateThumbLamaIntake, 2000);
  }
}

function handleLamaIntervention(text) {
  const affirmative = ['yes', 'okay', 'sure', 'let\'s go', 'ready', 'do it', 'yoga', 'breathe', 'meditate'];
  const userSaysYes = affirmative.some(word => text.toLowerCase().includes(word));
  
  if (userSaysYes && window.lastLamaSuggestion) {
    const oct = window.lastLamaSuggestion;
    const msg = `Magnificent. Opening the ${oct.charAt(0).toUpperCase() + oct.slice(1)} Sanctuary for you...`;
    
    appendMessage('guru', msg, activeGuru);
    
    setTimeout(() => {
      closeChat();
      const octMap = { 
        stillness: 'octStillness', movement: 'octMovement', wisdom: 'octWisdom', 
        emotion: 'octEmotion', sonic: 'octSonic', creation: 'octCreation',
        bridge: 'octBridge', nourish: 'octNourish'
      };
      document.getElementById(octMap[oct])?.click();
    }, 1200);
    return true;
  }
  return false;
}

function openThumbLamaChat() {
  const lama = gurus.find(g => g.id === 'lama');
  if (lama) openChat(lama);
}

/* ─── Phase 5: Multi-Step Intake Logic ─── */
const LAMA_INTAKE_STEPS = [
  {
    step: 0,
    question: "Welcome to the Rebellion, Rebel. ☸️ I am the Thumb Lama, the Librarian of this Den. Tell me, what brought you here today?",
    options: ["Stress Relief", "Mental Clarity", "Focus & Flow", "Pure Curiosity"]
  },
  {
    step: 1,
    question: "Excellent. Which domain of wellness feels most 'blocked' or in need of mastery right now?",
    options: ["🧘 Stillness", "✍️ Creation", "🎵 Sonic", "🧠 Wisdom", "🌪️ Movement"]
  },
  {
    step: 2,
    question: "Understood. I've adjusted the Den to your frequency. How much time can you reclaim for your practice daily?",
    options: ["5 Minutes", "12 Minutes", "24 Minutes"]
  }
];

let currentIntakeStep = 0;
const chatQuickRepliesEl = document.getElementById('chatQuickReplies');

function renderQuickReplies(options) {
  if (!chatQuickRepliesEl) return;
  chatQuickRepliesEl.innerHTML = '';
  if (!options || options.length === 0) {
    chatQuickRepliesEl.classList.add('hidden');
    return;
  }

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quick-reply-btn';
    btn.textContent = opt;
    btn.onclick = () => handleQuickReplyClick(opt);
    chatQuickRepliesEl.appendChild(btn);
  });
  chatQuickRepliesEl.classList.remove('hidden');
}

function handleQuickReplyClick(text) {
  chatInput.value = text;
  sendMessage();
}

async function syncIntakeCompletion() {
  if (!initData) return;
  try {
    const res = await fetch(`${API_BASE}/api/complete-intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    const data = await res.json();
    if (data.ok) {
      window.intakeCompleted = true;
      console.log('[Phase 5] Backend intake state synced.');
    }
  } catch (e) {
    console.error('[Phase 5] Sync error:', e);
  }
}

function initiateThumbLamaIntake() {
  if (window.intakeCompleted) return;
  
  const lama = gurus.find(g => g.id === 'lama');
  if (!lama) return;

  // Reset steps
  currentIntakeStep = 0;

  // Visual Nudge highlight
  const nudgeEl = document.getElementById('lamaNudge');
  if (nudgeEl) {
    nudgeEl.style.boxShadow = '0 0 30px var(--teal)';
    setTimeout(() => {
      openThumbLamaChat();
    }, 1500);
  }
}

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

  // If Intake Mode: Start script
  if (guru.id === 'lama' && !window.intakeCompleted) {
    if (conversations['lama'].length === 0) {
      setTimeout(() => {
        const first = LAMA_INTAKE_STEPS[0];
        conversations['lama'].push({ role: 'assistant', content: first.question });
        renderMessages(guru);
        renderQuickReplies(first.options);
        scrollToBottom();
      }, 500);
    } else {
      // Resume current step
      const current = LAMA_INTAKE_STEPS[currentIntakeStep];
      if (current) renderQuickReplies(current.options);
    }
  } else {
    chatQuickRepliesEl.classList.add('hidden');
  }

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

  // ─── Phase 5: Intake Intercept ───
  if (activeGuru.id === 'lama' && !window.intakeCompleted) {
    setTimeout(async () => {
      hideTyping();
      
      currentIntakeStep++;
      const next = LAMA_INTAKE_STEPS[currentIntakeStep];
      
      let reply;
      if (next) {
        reply = next.question;
        renderQuickReplies(next.options);
      } else {
        // Intake Finished
        reply = "Magnificent. I have established your frequency. You have been awarded a 25pt starting bonus for your journey. Welcome to the Rebellion.";
        renderQuickReplies([]);
        
        // Sync and Reward
        syncIntakeCompletion();
        claimActivityReward('meditation'); // Bonus pts equivalent to a session
      }
      
      appendMessage('guru', reply, activeGuru);
      conversations['lama'].push({ role: 'assistant', content: reply });
      scrollToBottom();
    }, 1200);
    
    return;
  }

  // ─── Phase 5: Smart Navigation (Automation) ───
  if (activeGuru.id === 'lama' && window.intakeCompleted) {
    const intercepted = handleLamaIntervention(text);
    if (intercepted) return;
  }

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

document.getElementById('octStillness')?.addEventListener('click', () => {
  const pts = window.currentOctantScores?.stillness || 0;
  selectedMins = getScaledDuration(pts);
  meditationSecs = selectedMins * 60;
  meditationTimeEl.textContent = formatTime(meditationSecs);
  durBtns.forEach(b => {
    b.classList.toggle('active', +b.dataset.mins === selectedMins);
    b.style.display = (+b.dataset.mins === selectedMins) ? 'inline-block' : 'none'; // Lock to scaled duration
  });
  fetchAndShowWisdom('stillness', 'wisdom-stillness');
  openModal('meditationModal');
});

document.getElementById('octMovement')?.addEventListener('click', () => {
  const pts = window.currentOctantScores?.movement || 0;
  const mins = getScaledDuration(pts);
  // Rule: each 4-cycle takes ~16s. 1 min ≈ 4 cycles.
  // We'll set cycle goal = mins * 1.5 (approx 6-18 cycles)
  window.breathCycleGoal = Math.max(3, Math.floor(mins * 1.5));
  breathCyclesEl.innerHTML = `Goal: <strong>${window.breathCycleGoal} cycles</strong>`;
  fetchAndShowWisdom('movement', 'wisdom-breathing');
  openModal('breathingModal');
});

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
      breathCyclesEl.innerHTML = `Cycles completed: <strong>${breathCycles}</strong> / ${window.breathCycleGoal || 3}`;
      // ⭐ Award breathing reward after goal met
      if (breathCycles === (window.breathCycleGoal || 3)) {
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

document.getElementById('octStillness')?.addEventListener('click', () => openModal('meditationModal'));
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
  const pts = window.currentOctantScores?.stillness || 0;
  playAmbient('stillness', BELTS.indexOf(getBelt(pts)));
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
   🌀 S01 PHYGITAL CONTROLLER (THE REBELLION)
   ══════════════════════════════════════════════ */

const phygitalModal = document.getElementById('phygitalModal');
const phygitalSurface = document.getElementById('phygitalSurface');
const phygitalTimeEl = document.getElementById('phygitalTime');
const phygitalStatusEl = document.getElementById('phygitalStatus');
const touchPrompt = document.getElementById('touchPrompt');
const contactWarning = document.getElementById('contactWarning');
const phygitalTitle = document.getElementById('phygitalTitle');
const phygitalSubtitle = document.getElementById('phygitalSubtitle');
const phygitalAudioInfo = document.getElementById('phygitalAudioInfo');

let activePhygitalSession = null;
let phygitalTimer = null;
let phygitalSecs = 0;
let phygitalIsContact = false;

const PHYGITAL_TYPES = {
  STILLNESS: { 
    id: 'stillness', 
    name: 'Reflection Dojo', 
    desc: 'Octant 01 · Stillness Sanctuary', 
    instruction: 'Hold Thumb to Anchor Breath',
    activityId: 'meditation'
  },
  CREATION: { id: 'creation', name: 'Creation Forge', desc: 'Octant 02 · Creative Expression', instruction: 'Touch to Ignite the Forge', activityId: 'creation' },
  SONIC: { id: 'sonic', name: 'Sonic Sanctuary', desc: 'Octant 03 · Sound Healing', instruction: 'Tap to Resonate', activityId: 'sonic' },
  WISDOM: { id: 'wisdom', name: 'Wisdom Chamber', desc: 'Octant 04 · Learning & Philosophy', instruction: 'Trace with Intent', activityId: 'affirmation' },
  EMOTION: { id: 'emotion', name: 'Emotion Command', desc: 'Octant 05 · Emotional Transmutation', instruction: 'Press to Calibrate', activityId: 'mood_check' },
  BRIDGE: { id: 'bridge', name: 'Connection Hub', desc: 'Octant 06 · Social Connection', instruction: 'Drag to Connect', activityId: 'bridge' },
  MOVEMENT: { id: 'movement', name: 'Movement Arena', desc: 'Octant 07 · Yoga & Movement', instruction: 'Follow the Flow', activityId: 'breathing' },
  SPIRIT: { id: 'nourish', name: 'Spirit Temple', desc: 'Octant 08 · Labyrinth Path', instruction: 'Enter the Labyrinth', activityId: 'nourish' }
};

let currentDanLevel = 0;
let lastDanSessionTime = null;
let activeDanSession = false;

async function startDanSession() {
  const res = await fetch(`${API_BASE}/api/start-dan-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });
  const data = await res.json();
  
  if (data.locked) {
    alert(`Shodan lock active. Next session available in ${data.hours_remaining} hours. Use this time for integration.`);
    return;
  }
  
  if (data.ok) {
    activeDanSession = true;
    currentDanLevel = data.dan;
    // For MVP S01: Dan sessions use 'Stillness' as the core phygital anchor
    startPhygitalSession('STILLNESS');
    phygitalTitle.textContent = data.session_type;
    phygitalSubtitle.textContent = 'Act 1: Grounding Awareness';
    
    // Override completion logic for Dan sessions
    window.danSessionAct = 1;
  }
}

async function completeDanSession(reflection) {
  const res = await fetch(`${API_BASE}/api/complete-dan-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, reflection })
  });
  const data = await res.json();
  if (data.ok) {
    closeModal('journalModal');
    tg.MainButton.setText('MASTERY ACHIEVED').show();
    setTimeout(() => tg.MainButton.hide(), 3000);
    loadProfile(); // Refresh locks
  }
}

document.getElementById('submitJournal')?.addEventListener('click', () => {
  const content = document.getElementById('journalInput').value;
  if (content.length < 10) {
    alert("Wisdom requires more than a few words. Share your shift.");
    return;
  }
  completeDanSession(content);
});

function startPhygitalSession(typeKey) {
  const meta = PHYGITAL_TYPES[typeKey];
  if (!meta) return;

  activePhygitalSession = meta;
  phygitalTitle.textContent = meta.name;
  phygitalSubtitle.textContent = meta.desc;
  document.getElementById('touchPromptText').textContent = meta.instruction;
  
  const pts = window.currentOctantScores?.[meta.id] || 0;
  phygitalSecs = getScaledDuration(pts) * 60;
  phygitalTimeEl.textContent = formatTime(phygitalSecs);
  
  const belt = getBelt(pts);
  document.getElementById('hudLeft').textContent = `Belt: ${belt.name}`;
  document.getElementById('hudRight').textContent = `LVL: ${BELTS.indexOf(belt) + 1}`;
  
  fetchAndShowWisdom(meta.id, 'wisdom-phygital');
  openModal('phygitalModal');
  renderPhygitalSurface(meta.id);
  
  phygitalAudioInfo.classList.add('hidden');
  phygitalStatusEl.textContent = 'Awaiting Signal';
}

function renderPhygitalSurface(octantId) {
  phygitalSurface.innerHTML = '';
  touchPrompt.classList.remove('hidden');
  contactWarning.classList.add('hidden');
  
  if (octantId === 'stillness') {
    renderReflectionDojo();
  } else if (octantId === 'creation') {
    renderCreationForge();
  } else if (octantId === 'sonic') {
    renderSonicSanctuary();
  } else if (octantId === 'wisdom') {
    renderWisdomChamber();
  } else if (octantId === 'emotion') {
    renderEmotionCommand();
  } else if (octantId === 'bridge') {
    renderConnectionHub();
  } else if (octantId === 'movement') {
    renderMovementArena();
  } else if (octantId === 'nourish') {
    renderSpiritTemple();
  } else {
    phygitalSurface.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text3); font-size:12px;">S01 Physical component for ${octantId} coming soon. <br><br> (Phygital logic ready)</div>`;
  }
}

/* ─ Octant 05: Emotion Command ─ */
function renderEmotionCommand() {
  const wrap = document.createElement('div');
  wrap.style.width = '100dvw';
  wrap.style.height = '100dvw';
  wrap.style.background = 'radial-gradient(circle, var(--purple-dim) 0%, transparent 70%)';
  wrap.innerHTML = `
    <div id="bioString" style="width:2px; height:60%; background:var(--purple); box-shadow: 0 0 20px var(--purple); transition: transform 0.1s linear, background 0.4s;"></div>
    <div style="position:absolute; bottom:20px; font-size:10px; color:var(--text2);">MODULATE FREQUENCY BY TOUCH</div>
  `;
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.justifyContent = 'center';
  phygitalSurface.appendChild(wrap);
}

function updateEmotionCommand(e) {
  const string = document.getElementById('bioString');
  if (!string || !phygitalIsContact) return;
  const touch = e.touches ? e.touches[0] : e;
  const shake = (Math.random() - 0.5) * 10;
  string.style.transform = `translateX(${shake}px) scaleX(${1 + Math.random()})`;
}

/* ─ Octant 06: Connection Hub ─ */
function renderConnectionHub() {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.gap = '20px';
  wrap.innerHTML = `
    <div style="width:60px; height:60px; background:var(--teal-dim); border:2px dashed var(--teal); border-radius:12px; display:flex; align-items:center; justify-content:center;">🧩</div>
    <div style="width:60px; height:60px; background:var(--purple-dim); border:2px dashed var(--purple); border-radius:12px; display:flex; align-items:center; justify-content:center;">🤝</div>
    <div style="width:60px; height:60px; background:var(--pink-dim); border:2px dashed var(--pink); border-radius:12px; display:flex; align-items:center; justify-content:center;">💞</div>
  `;
  phygitalSurface.appendChild(wrap);
}

/* ─ Octant 07: Movement Arena ─ */
function renderMovementArena() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div style="font-size:80px; filter: drop-shadow(0 0 20px var(--teal-glow));">🧘</div>
    <div style="margin-top:20px; font-size:11px; text-align:center; color:var(--text2); font-weight:700;">ACUPRESSURE POINT: TEMPLE<br><span style="color:var(--teal)">HOLD SECURELY</span></div>
  `;
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  phygitalSurface.appendChild(wrap);
}

/* ─ Octant 08: Spirit Temple ─ */
function renderSpiritTemple() {
  phygitalSurface.innerHTML = `
    <svg viewBox="0 0 200 200" style="width:100%; height:80%;">
       <circle cx="100" cy="100" r="80" stroke="var(--border2)" stroke-width="40" fill="none" />
       <circle cx="100" cy="100" r="80" stroke="var(--teal)" stroke-width="2" fill="none" stroke-dasharray="10 5" />
       <circle id="labyrinthDot" cx="100" cy="20" r="10" fill="var(--teal)" style="transition: all 0.1s linear;" />
    </svg>
  `;
}

function updateSpiritTemple() {
  const dot = document.getElementById('labyrinthDot');
  if (!dot) return;
  const angle = (phygitalSecs * 5) % 360;
  const rad = (angle * Math.PI) / 180;
  dot.setAttribute('cx', 100 + 80 * Math.cos(rad));
  dot.setAttribute('cy', 100 + 80 * Math.sin(rad));
}

/* ─ Octant 03: Sonic Sanctuary ─ */
function renderSonicSanctuary() {
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = '1fr 1fr';
  wrap.style.gap = '10px';
  wrap.style.width = '80%';
  wrap.innerHTML = `
    <div class="sonic-pad" data-note="C4" style="aspect-ratio:1; border:2px solid var(--teal); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:24px;">🥁</div>
    <div class="sonic-pad" data-note="E4" style="aspect-ratio:1; border:2px solid var(--purple); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:24px;">🔔</div>
    <div class="sonic-pad" data-note="G4" style="aspect-ratio:1; border:2px solid var(--pink); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:24px;">✨</div>
    <div class="sonic-pad" data-note="C5" style="aspect-ratio:1; border:2px solid var(--gold); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:24px;">🌊</div>
  `;
  phygitalSurface.appendChild(wrap);
  
  wrap.querySelectorAll('.sonic-pad').forEach(pad => {
    pad.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      pad.style.transform = 'scale(0.9)';
      pad.style.background = 'rgba(255,255,255,0.1)';
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    });
    pad.addEventListener('touchend', () => {
      pad.style.transform = 'scale(1)';
      pad.style.background = 'transparent';
    });
  });
}

/* ─ Octant 04: Wisdom Chamber ─ */
function renderWisdomChamber() {
  const wrap = document.createElement('div');
  wrap.className = 'wisdom-svg-wrap';
  wrap.style.width = '100dvw';
  wrap.style.height = '100%';
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.justifyContent = 'center';
  wrap.innerHTML = `
    <svg viewBox="0 0 200 200" style="width:100%; height:80%;">
      <path d="M50 150 L100 50 L150 150 Z" stroke="rgba(255,255,255,0.1)" stroke-width="12" fill="none" stroke-linecap="round" />
      <path id="tracePath" d="M50 150 L100 50 L150 150 Z" stroke="var(--teal)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="400" stroke-dashoffset="400" />
    </svg>
    <div style="position:absolute; bottom:20px; font-size:11px; color:var(--text3); font-weight:700;">TRACE THE GEOMETRY</div>
  `;
  phygitalSurface.appendChild(wrap);
}

function updateWisdomTrace(e) {
  if (!phygitalIsContact) return;
  const path = document.getElementById('tracePath');
  if (!path) return;
  
  // Fake tracking based on time and contact for now (MVP logic)
  const progress = Math.max(0, 400 - ((phygitalSecs / (getScaledDuration(0)*60)) * 400));
  path.style.strokeDashoffset = progress;
}

/* ─ Octant 02: Creation Forge ─ */
let forgeCanvas = null, forgeCtx = null;
function renderCreationForge() {
  forgeCanvas = document.createElement('canvas');
  forgeCanvas.width = 400;
  forgeCanvas.height = 400;
  forgeCanvas.style.width = '100%';
  forgeCanvas.style.height = '100%';
  forgeCtx = forgeCanvas.getContext('2d');
  
  // Dark background
  forgeCtx.fillStyle = '#101018';
  forgeCtx.fillRect(0,0,400,400);
  
  phygitalSurface.appendChild(forgeCanvas);
}

function updateCreationForge(e) {
  if (!forgeCtx || !phygitalIsContact) return;
  
  const rect = forgeCanvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  const x = ((touch.clientX - rect.left) / rect.width) * 400;
  const y = ((touch.clientY - rect.top) / rect.height) * 400;
  
  const pts = window.currentOctantScores?.creation || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  
  // Symmetry patterns based on belt
  const colors = ['#fff', '#fde047', '#fb923c', '#22c55e', '#3b82f6', '#a855f7', '#78350f', '#00e5cc'];
  forgeCtx.fillStyle = colors[beltIdx];
  
  const size = 2 + beltIdx;
  forgeCtx.beginPath();
  forgeCtx.arc(x, y, size, 0, Math.PI * 2);
  
  // Symmetry
  if (beltIdx > 2) { // Green belt+ adds mirror
    forgeCtx.arc(400 - x, y, size, 0, Math.PI * 2);
  }
  if (beltIdx > 5) { // Purple belt+ adds quad
    forgeCtx.arc(x, 400 - y, size, 0, Math.PI * 2);
    forgeCtx.arc(400 - x, 400 - y, size, 0, Math.PI * 2);
  }
  
  forgeCtx.fill();
}

function handleDanActTransition() {
  phygitalSurface.style.opacity = '0';
  phygitalSurface.style.transition = 'opacity 0.8s ease-in-out';
  
  setTimeout(() => {
    if (window.danSessionAct === 1) {
      window.danSessionAct = 2;
      phygitalSubtitle.textContent = 'Act 2: The Deepen';
      phygitalSecs = 120; // 2 min session
      phygitalStatusEl.textContent = 'Act 1 Complete. Ready for Act 2.';
      touchPrompt.classList.remove('hidden');
      document.getElementById('touchPromptText').textContent = 'Hold to Enter the Void';
      phygitalSurface.style.opacity = '1';
    } else {
      activeDanSession = false;
      closeModal('phygitalModal');
      openModal('journalModal');
    }
  }, 800);
}

function renderReflectionDojo() {
  const wrap = document.createElement('div');
  wrap.className = 'breathing-ring-phygital';
  wrap.innerHTML = `
    <svg class="breathing-svg" viewBox="0 0 100 100">
      <circle class="breathing-circle-bg" cx="50" cy="50" r="40" />
      <circle id="breathingFill" class="breathing-circle-fill" cx="50" cy="50" r="30" />
    </svg>
  `;
  phygitalSurface.appendChild(wrap);
}

function conductPhygitalSession() {
  if (phygitalTimer) return;
  
  phygitalStatusEl.textContent = 'Sync Active';
  phygitalStatusEl.classList.add('active');
  touchPrompt.classList.add('hidden');
  
  const pts = window.currentOctantScores?.[activePhygitalSession.id] || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  playAmbient(activePhygitalSession.id, beltIdx);
  
  phygitalTimer = setInterval(() => {
    if (!phygitalIsContact) {
      handlePhygitalDisconnect();
      return;
    }
    
    phygitalSecs--;
    phygitalTimeEl.textContent = formatTime(phygitalSecs);
    
    // Animate Session Surface
    if (activePhygitalSession.id === 'stillness') {
      updateReflectionDojo();
    } else if (activePhygitalSession.id === 'wisdom') {
      updateWisdomTrace();
    } else if (activePhygitalSession.id === 'nourish') {
      updateSpiritTemple();
    }
    
    if (phygitalSecs <= 0) {
      completePhygitalSession();
    }
  }, 1000);
}

function updateReflectionDojo() {
  const fill = document.getElementById('breathingFill');
  if (!fill) return;
  const cycle = (getScaledDuration(0) * 60 - phygitalSecs) % 16;
  if (cycle < 4) { fill.setAttribute('r', 40); fill.style.fill = 'rgba(0, 229, 204, 0.3)'; }
  else if (cycle < 8) { fill.style.fill = 'rgba(168, 85, 247, 0.4)'; }
  else if (cycle < 12) { fill.setAttribute('r', 25); fill.style.fill = 'rgba(0, 229, 204, 0.2)'; }
  else { fill.style.fill = 'rgba(168, 85, 247, 0.2)'; }
}

function handlePhygitalDisconnect() {
  stopAmbient();
  clearInterval(phygitalTimer);
  phygitalTimer = null;
  phygitalStatusEl.textContent = 'Signal Lost';
  phygitalStatusEl.classList.remove('active');
  contactWarning.classList.remove('hidden');
  setTimeout(() => {
    if (!phygitalIsContact) {
      touchPrompt.classList.remove('hidden');
      contactWarning.classList.add('hidden');
    }
  }, 1500);
}

function completePhygitalSession() {
  clearInterval(phygitalTimer);
  phygitalTimer = null;
  stopAmbient();
  
  if (activeDanSession) {
    handleDanActTransition();
    return;
  }

  phygitalStatusEl.textContent = 'Mastery Achieved';
  claimActivityReward(activePhygitalSession.activityId);
  
  setTimeout(() => {
    closeModal('phygitalModal');
  }, 2000);
}

phygitalSurface.addEventListener('touchstart', (e) => {
  e.preventDefault();
  phygitalIsContact = true;
  contactWarning.classList.add('hidden');
  conductPhygitalSession();
  if (activePhygitalSession?.id === 'creation') updateCreationForge(e);
  if (activePhygitalSession?.id === 'emotion') updateEmotionCommand(e);
}, { passive: false });

phygitalSurface.addEventListener('touchmove', (e) => {
  if (activePhygitalSession?.id === 'creation') updateCreationForge(e);
  if (activePhygitalSession?.id === 'emotion') updateEmotionCommand(e);
});

phygitalSurface.addEventListener('mousedown', (e) => {
  phygitalIsContact = true;
  contactWarning.classList.add('hidden');
  conductPhygitalSession();
  if (activePhygitalSession?.id === 'creation') updateCreationForge(e);
  if (activePhygitalSession?.id === 'emotion') updateEmotionCommand(e);
});

phygitalSurface.addEventListener('mousemove', (e) => {
  if (activePhygitalSession?.id === 'creation') updateCreationForge(e);
  if (activePhygitalSession?.id === 'emotion') updateEmotionCommand(e);
});

phygitalSurface.addEventListener('touchend', () => { phygitalIsContact = false; });
phygitalSurface.addEventListener('mouseup', () => { phygitalIsContact = false; });
phygitalSurface.addEventListener('mouseleave', () => { phygitalIsContact = false; });

document.getElementById('closePhygital')?.addEventListener('click', () => {
  clearInterval(phygitalTimer);
  phygitalTimer = null;
  phygitalIsContact = false;
  stopAmbient();
  closeModal('phygitalModal');
  const overlay = document.getElementById('wisdom-phygital');
  if (overlay) overlay.classList.add('hidden');
});

document.getElementById('octStillness')?.addEventListener('click', () => startPhygitalSession('STILLNESS'));
document.getElementById('octCreation')?.addEventListener('click', () => startPhygitalSession('CREATION'));
document.getElementById('octSonic')?.addEventListener('click', () => startPhygitalSession('SONIC'));
document.getElementById('octWisdom')?.addEventListener('click', () => startPhygitalSession('WISDOM'));
document.getElementById('octEmotion')?.addEventListener('click', () => startPhygitalSession('EMOTION'));
document.getElementById('octBridge')?.addEventListener('click', () => startPhygitalSession('BRIDGE'));
document.getElementById('octMovement')?.addEventListener('click', () => startPhygitalSession('MOVEMENT'));
document.getElementById('octNourish')?.addEventListener('click', () => startPhygitalSession('SPIRIT'));

/* ══════════════════════════════════════════════
   ✨ AFFIRMATIONS
   ══════════════════════════════════════════════ */
const affirmations = [
  { text: 'I am enough. I have always been enough.', author: '— Daily Mantra' },
  { text: 'I choose peace over perfection.', author: '— Wellness Wisdom' },
  { text: 'My body is healing and becoming stronger every day.', author: '— Arjun Sharma' },
  { text: 'I release what no longer serves me with love.', author: '— Maya Patel' },
  { text: 'I breathe in calm, and I breathe out tension.', author: '— Priya Nair' },
  { text: 'I trust the process of life and welcome all that comes my way.', author: '— Dev Krishnamurthy' },
  { text: 'My mind is clear, my heart is open, my spirit is free.', author: '— Luna Rivera' },
  { text: 'Every morning I wake up grateful for another chance to grow.', author: '— Ryu Nakamura' },
  { text: 'I nourish my body with intention and gratitude.', author: '— Kai Tanaka' },
  { text: 'I am stronger than I think, and braver than I know.', author: '— Zara Ahmed' }
];

let affIdx = 0;
const affTextEl = document.getElementById('affirmationText');
const affAuthorEl = document.getElementById('affirmationAuthor');

function showAffirmation(idx) {
  if (!affTextEl) return;
  affTextEl.style.opacity = '0';
  setTimeout(() => {
    const a = affirmations[idx];
    affTextEl.textContent = a.text;
    affAuthorEl.textContent = a.author;
    affTextEl.style.transition = 'opacity 0.35s';
    affTextEl.style.opacity = '1';
  }, 150);
}

document.getElementById('closeAffirmation')?.addEventListener('click', () => closeModal('affirmationModal'));
document.getElementById('nextAffirmation')?.addEventListener('click', () => { affIdx = (affIdx + 1) % affirmations.length; showAffirmation(affIdx); });
document.getElementById('prevAffirmation')?.addEventListener('click', () => { affIdx = (affIdx - 1 + affirmations.length) % affirmations.length; showAffirmation(affIdx); });

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

document.getElementById('octEmotion')?.addEventListener('click', () => openModal('moodModal'));
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

/* ══════════════════════════════════════════════
   🕸️ RING TWO: NETWORK HUB (DePIN)
   ══════════════════════════════════════════════ */
let nodeHeartbeatInterval = null;
window.nodeData = null;

async function syncNodeHeartbeat() {
  if (!initData) return;
  try {
    const res = await fetch(`${API_BASE}/api/node-ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    const data = await res.json();
    if (data.ok) {
      window.nodeData = data.node;
      updateNetworkUI(data);
      console.log('[Ring Two] Node Heartbeat Synced. Uptime:', data.node.uptime, 'mins');
    }
  } catch (e) {
    console.error('[Ring Two] Sync Error:', e);
  }
}

function updateNetworkUI(data) {
  const node = data.node;
  if (!node) return;

  document.getElementById('nodeId').textContent = `M-${node.id.slice(0, 8).toUpperCase()}`;
  document.getElementById('nodeUptime').textContent = `${node.uptime}m`;
  document.getElementById('nodeStatusDot').className = node.healthy ? 'status-dot healthy' : 'status-dot';
  document.getElementById('nodeStatusText').textContent = node.healthy ? 'Node Active' : 'Node Degraded';
  document.getElementById('nodeMultiplierBadge').textContent = `${node.multiplier}x Multiplier`;
  
  if (data.network) {
    document.getElementById('totalNodes').textContent = data.network.total_active_nodes;
  }
}

async function fetchNetworkStatus() {
  if (!initData) return;
  try {
    const res = await fetch(`${API_BASE}/api/network-status?initData=${encodeURIComponent(initData)}`);
    const data = await res.json();
    if (data.ok) {
      window.nodeData = data.node;
      updateNetworkUI(data);
    }
  } catch (e) {
    console.error('[Ring Two] Status Fetch Error:', e);
  }
}

function initNodeHeartbeat() {
  if (nodeHeartbeatInterval) return;
  syncNodeHeartbeat(); // initial ping
  nodeHeartbeatInterval = setInterval(syncNodeHeartbeat, 5 * 60 * 1000); // every 5 mins
}

/* ══════════════════════════════════════════════
   💎 RING THREE: SOVEREIGN PORTAL (NFT BRIDGE)
   ══════════════════════════════════════════════ */
function calculateAgentTraits(data) {
  const scores = data.octant_scores || {};
  const belts = {
    stillness: getBelt(scores.stillness || 0),
    movement:  getBelt(scores.movement || 0),
    wisdom:    getBelt(scores.wisdom || 0),
    sonic:     getBelt(scores.sonic || 0)
  };

  // Mastery Check: Need 3 Purple Belts to Mint
  const masterMilestone = Object.values(belts).filter(b => BELTS.indexOf(b) >= 4).length >= 3;
  
  return { belts, masterMilestone };
}

function updateSovereignUI(data) {
  const { belts, masterMilestone } = calculateAgentTraits(data);
  const userId = parseUser(initData).userId;
  
  document.getElementById('agentId').textContent = `SOV-#${userId.toString().slice(0, 4)}`;
  document.getElementById('t-aura').textContent = belts.stillness + ' Aura';
  document.getElementById('t-cord').textContent = belts.wisdom + ' Cord';
  document.getElementById('t-sonic').textContent = belts.sonic + ' Res.';

  document.getElementById('lockHours').textContent = data.hours_remaining || 24;

  // Unlock Shodan Button if ready
  const canStartDan = data.total_points >= 500;
  const danBtn = document.getElementById('btnStartShodan');
  if (danBtn) {
    if (canStartDan) {
      danBtn.classList.remove('disabled');
      danBtn.innerHTML = 'Initiate Shodan';
    } else {
      danBtn.classList.add('disabled');
      danBtn.innerHTML = 'Need 500 Mastery Pts';
    }
  }

  // Unlock Campfire (Nidan) if ready
  const currentDan = data.current_dan || 0;
  const campfireCard = document.getElementById('btnCampfire');
  if (campfireCard) {
    if (currentDan >= 2) {
      campfireCard.classList.remove('locked');
      const bt = document.getElementById('bt-campfire');
      if (bt) bt.textContent = 'Nidan Active · Level 2';
    } else {
      campfireCard.classList.add('locked');
      const bt = document.getElementById('bt-campfire');
      if (bt) bt.textContent = 'Locked · Reach Dan 2';
    }
  }

  // Unlock Mentor Workshop (Sandan) if ready
  const mentorCard = document.getElementById('btnMentorWorkshop');
  if (mentorCard) {
    if (currentDan >= 3) {
      mentorCard.classList.remove('locked');
      const bt = document.getElementById('bt-mentorship');
      if (bt) bt.textContent = 'Sandan Active · Level 3';
    } else {
      mentorCard.classList.add('locked');
      const bt = document.getElementById('bt-mentorship');
      if (bt) bt.textContent = 'Locked · Reach Dan 3';
    }
  }

  // Unlock Liberation Chamber (Yondan) if ready
  const liberationCard = document.getElementById('btnLiberation');
  if (liberationCard) {
    if (currentDan >= 4) {
      liberationCard.classList.remove('locked');
      const bt = document.getElementById('bt-liberation');
      if (bt) bt.textContent = 'Yondan Active · Level 4';
    } else {
      liberationCard.classList.add('locked');
      const bt = document.getElementById('bt-liberation');
      if (bt) bt.textContent = 'Locked · Reach Dan 4';
    }
  }
}

document.getElementById('btnStartShodan')?.addEventListener('click', startDanSession);

document.getElementById('btnConnectWallet')?.addEventListener('click', () => {
  const btn = document.getElementById('btnConnectWallet');
  btn.innerHTML = '<span class="wallet-icon">💎</span> Linking...';
  setTimeout(() => {
    btn.innerHTML = '<span class="wallet-icon">✅</span> Wallet Linked';
    btn.style.background = 'var(--teal)';
  }, 1500);
});

document.getElementById('btnMintSovereign')?.addEventListener('click', () => {
  const { masterMilestone } = calculateAgentTraits(window.lastProfileData || {});
  if (!masterMilestone) return;
  alert("Initiating Sovereign Mint... Prepare your TON wallet for the transaction.");
});

async function loadProfile() {
  const feedEl      = document.getElementById('profileFeed');
  const pointsEl    = document.getElementById('profilePoints');
  const streakEl    = document.getElementById('profileStreak');
  const usernameEl  = document.getElementById('profileUsername');
  const handleEl    = document.getElementById('profileHandle');
  const avatarEl    = document.getElementById('profileAvatar');
  const placeholderEl = document.getElementById('profileAvatarPlaceholder');

  // Network Check
  initNodeHeartbeat();
  fetchNetworkStatus();

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
    window.intakeCompleted = !!data.intake_completed;
    window.lastProfileData = data;

    updateSovereignUI(data);

    // Phase 5: Liberation Display (Private to profile for now)
    const manifestoSection = document.getElementById('sovereignEssenceSection');
    const manifestoText = document.getElementById('profileManifestoText');
    if (data.liberation_manifesto && manifestoSection && manifestoText) {
      manifestoText.textContent = data.liberation_manifesto;
      manifestoSection.classList.remove('hidden');
    }

    if (data.events.length === 0) {
      feedEl.innerHTML = '<div class="feed-empty">No activity yet — complete a session to earn points!</div>';
      return;
    }

    // ── Update Belts & Dashboard (NEW) ──
    const currentBelt = getBelt(data.total_points);
    const beltPill    = document.getElementById('profileBeltPill');
    if (beltPill) {
      beltPill.textContent = `${currentBelt.name} Belt · Level ${BELTS.indexOf(currentBelt) + 1}`;
      beltPill.className = `belt-pill ${currentBelt.color}`;
    }

    // Dashboard Updates
    const dashStreak = document.getElementById('dashStreak');
    const dashPoints = document.getElementById('dashPoints');
    const dashBelt   = document.getElementById('dashBelt');
    const vibeTitle  = document.getElementById('vibeTitle');
    const vibeDesc   = document.getElementById('vibeDesc');
    const vibeBar    = document.getElementById('vibeBar');

    if (dashStreak) dashStreak.textContent = data.streak + 'd';
    if (dashPoints) dashPoints.textContent = data.total_points;
    if (dashBelt) dashBelt.textContent = currentBelt.name;
    // (SVG Thumbagotchi updated below in vibeTitle block)

    // Vibe Progress (0 to 100% of next belt tier)
    const nextBelt = BELTS[BELTS.indexOf(currentBelt) + 1];
    let percent = 100;
    if (nextBelt) {
      const tierSize = nextBelt.pts - currentBelt.pts;
      const progress = data.total_points - currentBelt.pts;
      percent = Math.min(Math.round((progress / tierSize) * 100), 99);
    }
    
    if (vibeBar) {
      const offset = 283 - (283 * (percent / 100)); // 283 is circle circumference
      vibeBar.style.strokeDashoffset = offset;
    }

    if (vibeTitle) {
      // Hibernation Check (Doxa: rest is wellness)
      const lastLoginDate = data.last_login_date ? new Date(data.last_login_date) : null;
      const today = new Date();
      const isHibernating = lastLoginDate && (today - lastLoginDate) > (24 * 60 * 60 * 1000);

      const hibBadge = document.getElementById('hibernationBadge');
      const hibDesc  = document.getElementById('hibernationDesc');

      if (isHibernating) {
        vibeTitle.textContent = 'Hibernation';
        vibeDesc.textContent  = '';
        if (hibBadge) hibBadge.classList.remove('hidden');
        if (hibDesc)  hibDesc.classList.remove('hidden');
      } else {
        if (hibBadge) hibBadge.classList.add('hidden');
        if (hibDesc)  hibDesc.classList.add('hidden');
        
        if (data.streak >= 3) {
          vibeTitle.textContent = 'Glow State';
          vibeDesc.textContent  = "You're radiating positive energy today!";
        } else if (data.streak > 0) {
          vibeTitle.textContent = 'Active Vibe';
          vibeDesc.textContent  = "Keep it up! Your Thumbagotchi is feeling great.";
        } else {
          vibeTitle.textContent = 'Chill Mode';
          vibeDesc.textContent  = "Time for a quick wellness session?";
        }
      }

      // ─── Update SVG State (Phase 3) ───
      updateThumbagotchiUI(data.total_points, data.streak, isHibernating);

      // ─── Update Lama Nudge (Phase 5) ───
      updateLamaNudge(data);
    }

    // Update Dojo Octant Belts (NEW - Rule of 64)
    window.currentOctantScores = data.octant_scores || {};
    const octantScores = window.currentOctantScores;
    const octantIds = ['stillness', 'creation', 'sonic', 'wisdom', 'emotion', 'bridge', 'movement', 'nourish'];
    
    octantIds.forEach(id => {
      const pts = octantScores[id] || 0;
      const belt = getBelt(pts);
      const nextBelt = BELTS[BELTS.indexOf(belt) + 1] || belt;
      
      const pb = document.getElementById(`pb-${id}`);
      const bt = document.getElementById(`bt-${id}`);
      
      if (bt) {
        bt.textContent = `${belt.name} Belt · Lvl ${BELTS.indexOf(belt) + 1}`;
      }
      
      if (pb) {
        let pct = 100;
        if (nextBelt !== belt) {
          const tierSize = nextBelt.pts - belt.pts;
          const progress = pts - belt.pts;
          pct = Math.min(Math.round((progress / tierSize) * 100), 100);
        }
        pb.style.width = `${pct}%`;
      }
    });

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
  { icon: '☯', title: 'The Thumb Rebellion', desc: 'Welcome to the 85%. You walked away from mindless tapping. Now, build a wellness practice that rewards your time on Earth.' },
  { icon: '☸', title: 'The Dojo Den', desc: 'Master 8 domains of wellbeing through the 8-belt Thumb Fu system. Progression that builds real capability, not just stats.' },
  { icon: '🦖', title: 'Your Thumbagotchi', desc: 'A living guide that mirrors your practice. It hibernates when you rest and glows when you grow. Embodied data, felt not read.' }
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

/* ══════════════════════════════════════════════
   🔥 PHASE 3: CAMPFIRE CIRCLE (RELATIONAL TURN)
   ══════════════════════════════════════════════ */
let campfireRoom = null;
let campfireSyncTimer = null;
let campfireTimeLeft = 180;

function initCampfireLobby() {
  initSocket();
  openModal('campfireModal');
  document.getElementById('campfireLobbyView').classList.remove('hidden');
  document.getElementById('campfireSyncView').classList.add('hidden');
  document.getElementById('campfireReflectionView').classList.add('hidden');
  socket.emit('join_campfire', { initData });
}

function updateCampfireUI(state) {
  campfireRoom = state.roomId;
  const lobbyStatus = document.getElementById('lobbyStatusText');
  const partnerSlot = document.getElementById('partnerSlot');
  const partnerName = document.getElementById('partnerName');

  const myId = String(tgUser?.id || 'guest');
  const me = state.users.find(u => String(u.userId) === myId) || state.users[0];
  const partner = state.users.find(u => String(u.userId) !== myId);

  if (partner) {
    partnerSlot.classList.remove('vacant');
    partnerSlot.classList.add('active');
    partnerName.textContent = partner.username;
    lobbyStatus.textContent = 'Partner Found! Establishing Resonance...';
    if (state.ready && !document.getElementById('campfireLobbyView').classList.contains('hidden')) {
      setTimeout(startCampfireSync, 1500);
    }
  } else {
    partnerSlot.classList.add('vacant');
    partnerSlot.classList.remove('active');
    partnerName.textContent = 'Scanning Hub...';
    lobbyStatus.textContent = 'Searching for a wellness partner...';
  }

  // Update Rings
  const rMe = document.getElementById('ringMe');
  const rPartner = document.getElementById('ringPartner');
  if (rMe) {
    rMe.style.opacity = me?.contact ? '1' : '0.2';
    rMe.style.transform = me?.contact ? 'scale(1.1)' : 'scale(1)';
  }
  if (rPartner) {
    rPartner.style.opacity = partner?.contact ? '1' : '0.2';
    rPartner.style.transform = partner?.contact ? 'scale(1.1)' : 'scale(1)';
  }

  // Sync Check
  const warning = document.getElementById('syncWarning');
  if (warning) {
    if (state.ready && !(me?.contact && partner?.contact)) {
      warning.classList.remove('hidden');
    } else {
      warning.classList.add('hidden');
    }
  }
}

function startCampfireSync() {
  document.getElementById('campfireLobbyView').classList.add('hidden');
  document.getElementById('campfireSyncView').classList.remove('hidden');
}

function updateCampfireTimerDisplay() {
  const m = Math.floor(campfireTimeLeft / 60);
  const s = campfireTimeLeft % 60;
  const el = document.getElementById('campfireTimerDisplay');
  if (el) el.textContent = m + ':' + s.toString().padStart(2, '0');
}

function showCampfireReflection() {
  document.getElementById('campfireSyncView').classList.add('hidden');
  document.getElementById('campfireReflectionView').classList.remove('hidden');
  // Shared audio loop shift or stop
  if (currentAudio) currentAudio.pause();
}

document.getElementById('submitCampfireReflection')?.addEventListener('click', async () => {
  const reflection = document.getElementById('campfireReflectionInput').value;
  if (!reflection) return alert("Please share a reflection to seal the circle.");
  
  try {
    const res = await fetch(`${API_BASE}/api/activity-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, activity: 'bridge' })
    });
    const data = await res.json();
    if (data.ok) {
      reactToSuccess();
      showRewardToast(data.points_earned || 25, 'Relational Mastery');
      closeModal('campfireModal');
      loadProfile(); // Refresh for belt update
    }
  } catch (e) {
    console.error('[campfire reward]', e);
  }
});

document.getElementById('btnCampfire')?.addEventListener('click', () => {
    const dan = window.lastProfileData?.current_dan || 0;
    if (dan < 2) {
      alert("Nidan (2nd Dan) Required. Complete Phase 2 to unlock Relational Wellness.");
      return;
    }
    initCampfireLobby();
});

document.getElementById('closeCampfire')?.addEventListener('click', () => {
    clearInterval(campfireSyncTimer);
    closeModal('campfireModal');
});

const syncSurface = document.querySelector('.sync-surface-wrap');
if (syncSurface) {
  const setContact = (val) => {
    if (socket && campfireRoom) socket.emit('campfire_heartbeat', { roomId: campfireRoom, contact: val });
  };
  syncSurface.addEventListener('touchstart', (e) => { e.preventDefault(); setContact(true); });
  syncSurface.addEventListener('touchend', (e) => { e.preventDefault(); setContact(false); });
  syncSurface.addEventListener('mousedown', () => setContact(true));
  syncSurface.addEventListener('mouseup', () => setContact(false));
}

/* ══════════════════════════════════════════════
   📜 PHASE 4: SANDAN (THE TEACHING TURN)
   ══════════════════════════════════════════════ */
async function fetchAndShowWisdom(octantId, overlayId) {
  try {
    const res = await fetch(`${API_BASE}/api/get-wisdom/${octantId}`);
    const data = await res.json();
    const overlay = document.getElementById(overlayId);
    if (data.ok && overlay) {
      overlay.querySelector('.wisdom-text').textContent = data.wisdom.content_text;
      overlay.querySelector('.wisdom-author').textContent = `— ${data.wisdom.author_name} (Sandan)`;
      const bowBtn = overlay.querySelector('.btn-bow');
      bowBtn.onclick = () => bowToWisdom(data.id, bowBtn);
      overlay.classList.remove('hidden');
    } else if (overlay) {
      overlay.classList.add('hidden');
    }
  } catch (e) { console.error('Wisdom fetch failed', e); }
}

async function bowToWisdom(id, btn) {
  try {
    const res = await fetch(`${API_BASE}/api/bow-wisdom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, mentorshipId: id })
    });
    if ((await res.json()).ok) {
      btn.innerHTML = '✅ Bowed';
      btn.disabled = true;
      showRewardToast(5, 'Recognition Points');
    }
  } catch (e) { console.error('Bow failed', e); }
}

document.getElementById('btnMentorWorkshop')?.addEventListener('click', () => {
  const dan = window.lastProfileData?.current_dan || 0;
  if (dan < 3) {
    alert("Sandan (3rd Dan) Required. Master the Relational Turn to become a Teacher.");
    return;
  }
  openModal('mentorWorkshopModal');
});

document.getElementById('submitWisdom')?.addEventListener('click', async () => {
  const octantId = document.getElementById('wisdomOctantSelect').value;
  const content = document.getElementById('wisdomInput').value;
  if (!content) return alert("Wisdom cannot be empty.");

  try {
    const res = await fetch(`${API_BASE}/api/submit-wisdom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, octantId, content })
    });
    const data = await res.json();
    if (data.ok) {
      alert("Wisdom dispatched to the Sanctuary.");
      closeModal('mentorWorkshopModal');
      document.getElementById('wisdomInput').value = '';
    } else {
      alert(data.error);
    }
  } catch (e) { alert("Submission failed."); }
});

document.getElementById('closeMentorWorkshop')?.addEventListener('click', () => {
  closeModal('mentorWorkshopModal');
});

/* ══════════════════════════════════════════════
   🦅 PHASE 5: YONDAN (THE INTEGRATION TURN)
   ══════════════════════════════════════════════ */
document.getElementById('btnLiberation')?.addEventListener('click', () => {
  const dan = window.lastProfileData?.current_dan || 0;
  if (dan < 4) {
    alert("Yondan (4th Dan) Required. Only those who have Mastered the Teaching Turn can enter the Chamber.");
    return;
  }
  openModal('liberationModal');
});

document.getElementById('manifestoInput')?.addEventListener('input', (e) => {
  const count = e.target.value.trim().length;
  const countDisplay = document.getElementById('manifestoCharCount');
  const publishBtn = document.getElementById('publishManifesto');
  
  if (countDisplay) {
    countDisplay.textContent = `${count} / 50`;
    countDisplay.classList.toggle('ready', count >= 50);
  }
  
  if (publishBtn) {
    publishBtn.classList.toggle('disabled', count < 50);
  }
});

document.getElementById('publishManifesto')?.addEventListener('click', async () => {
  const manifesto = document.getElementById('manifestoInput').value;
  if (!manifesto || manifesto.trim().length < 50) return alert("Manifestocannot be less than 50 characters.");

  try {
    const res = await fetch(`${API_BASE}/api/publish-manifesto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, manifesto })
    });
    const data = await res.json();
    if (data.ok) {
      alert("Your Digital Liberation Statement has been sealed.");
      closeModal('liberationModal');
      loadProfile(); // Refresh to show the essence
    } else {
      alert(data.error);
    }
  } catch (e) { alert("Publication failed."); }
});

document.getElementById('closeLiberation')?.addEventListener('click', () => {
  closeModal('liberationModal');
});
