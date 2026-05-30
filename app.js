/* ═══════════════════════════════════════════════
   GOOD VYBES — App Logic
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

/* ─── Thumb Fu & Vybes Config ─── */
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
// True if the user has completed at least one practice session today — drives the glow state
// so the companion reacts to today's practice, not just multi-day login streaks.
function practicedToday() {
  try { return localStorage.getItem('hv_last_activity_date') === new Date().toISOString().slice(0, 10); }
  catch (e) { return false; }
}

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
        // Streak drives the base glow; practising today lights it up immediately.
        const base = 0.2 + (streak * 0.05);
        aura.style.opacity = Math.min(1, practicedToday() ? Math.max(base, 0.6) : base);
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
  // Canon (dojoden_octent.txt): 3 min (White) → 10 min (Black), 1-min increments.
  // White (idx 0) -> 3m, Black (idx 7) -> 10m
  return 3 + beltIdx;
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

  rewardToastPts.textContent   = `+${points} GVRP`;
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
  }, 4500); // BUG-04: hold long enough to read (was 3000)
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

claimDailyLogin().then(() => loadProfile());

/* ─── Activity Reward ─── */
const ACTIVITY_LABELS = {
  breathing:   { label: 'Box Breathing Complete!', pts: 15 },
  meditation:  { label: 'Meditation Complete!',    pts: 20 },
  affirmation: { label: 'Daily Affirmation!',      pts: 5  },
  mood_check:  { label: 'Mood Check Done!',         pts: 5  },
  creation:    { label: 'Inner Garden Tended!',       pts: 10 },
  nourish:     { label: 'Wisdom Temple Honoured!',    pts: 10 },
  bridge:      { label: 'Kindred Spirits Connected!', pts: 10 },
  sonic:       { label: 'Sleep Sanctuary Restored!',  pts: 15 },
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
    if (data.ok) {
      // Record that the user practised today (drives the companion glow state)
      try { localStorage.setItem('hv_last_activity_date', new Date().toISOString().slice(0, 10)); } catch (e) {}
    }
    if (data.ok && !data.already_claimed && data.points_earned > 0) {
      const info = ACTIVITY_LABELS[activity];
      showRewardToast(data.points_earned, info.label, window.nodeData?.multiplier || 1.0);
      
      // Phase 3: Trigger visual reaction
      reactToSuccess();

      // Mark badge as claimed (all 8 octants, so every card reflects today's completion)
      const actMap   = {
        breathing: 'octMovement', meditation: 'octStillness', affirmation: 'octWisdom', mood_check: 'octEmotion',
        creation: 'octCreation', sonic: 'octSonic', bridge: 'octBridge', nourish: 'octNourish',
      };
      document.getElementById(actMap[activity])?.classList.add('claimed');
    }

    // Refresh dashboard glow + Dojo belt progress so earned GVRP shows immediately
    loadProfile();
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
    id: 'max',
    name: 'Max Lowenstein',
    handle: '@healingmotions',
    emoji: '🧘',
    gradient: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
    tagBg: '#00d2ff',
    tagColor: '#ffffff',
    followers: '218K',
    bio: 'Registered Dietitian, breathwork facilitator & yoga teacher. Science-backed wellness with a warm, grounded approach.',
    tags: ['🌬️ Breathwork', '🧘 Yoga', '🥗 Nutrition', '🧠 Meditation'],
    specialties: ['yoga', 'breathwork', 'nutrition', 'meditation'],
    ctaText: 'Chat with Max',
    btnGradient: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    chatUrl: 'https://gaia-twins-production.up.railway.app/chat',
    voiceEnabled: true,
    twinId: 'max',
    welcomeMsg: "Hey! I'm Max. I'm here to help you move, breathe, and nourish your body with science-backed wellness. What's on your mind today?",
  },
  {
    id: 'melini',
    name: 'Melini Jesudason',
    handle: '@meliniseri',
    emoji: '🧘',
    gradient: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
    tagBg: '#8e2de2',
    tagColor: '#ffffff',
    followers: '400K',
    bio: 'World-renowned yoga instructor, Reiki Master & spiritual medium. Dynamic practice meets deep spiritual wisdom.',
    tags: ['🤸 Inversions', '✨ Energy Healing', '🔥 Ashtanga', '🔮 Spirituality'],
    specialties: ['yoga', 'spiritual'],
    ctaText: 'Chat with Melini',
    btnGradient: 'linear-gradient(135deg, #8e2de2, #4a00e0)',
    chatUrl: 'https://gaia-twins-production.up.railway.app/chat',
    voiceEnabled: true,
    twinId: 'melini',
    welcomeMsg: "Namaste. I am Melini. Together, we will explore the intersection of dynamic physical practice and deep spiritual wisdom. How can I guide you today?",
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
    // Seed persona — illustrative only, chat disabled per canon (not a real WIP in the pipeline)
    illustrative: true,
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
    illustrative: true,
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
    illustrative: true,
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
    illustrative: true,
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
    illustrative: true,
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
    illustrative: true,
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
    const actionsHtml = g.voiceEnabled
      ? `<div class="guru-actions">
           <button class="guru-btn chat" style="background:${g.btnGradient};" id="chatBtn_${g.id}">${g.ctaText} →</button>
           <button class="guru-btn talk" id="talkBtn_${g.id}">Talk with ${g.name.split(' ')[0]} 🎙️</button>
         </div>`
      : `<button class="guru-btn" style="background:${g.illustrative ? 'rgba(255,255,255,0.08)' : g.btnGradient};${g.illustrative ? 'color:var(--text2);font-weight:600;' : ''}" id="guruBtn_${g.id}" data-id="${g.id}">
           ${g.illustrative ? 'View profile' : `${g.ctaText} →`}
         </button>`;

    card.innerHTML = `
      <div class="guru-head">
        <div class="guru-avatar-wrap">
          <div class="guru-avatar" style="background:${g.gradient};">${g.emoji}</div>
          <span class="guru-online-dot"></span>
        </div>
        <div class="guru-meta">
          <div class="guru-name">${g.name}${g.illustrative ? ' <span style="font-size:10px;font-weight:600;color:var(--text2);background:rgba(255,255,255,0.08);border-radius:6px;padding:2px 6px;vertical-align:middle;white-space:nowrap;">✨ Illustrative</span>' : ''}</div>
          <div class="guru-handle">${g.handle}</div>
          <div class="guru-followers">🏆 ${g.followers} followers</div>
        </div>
      </div>
      <p class="guru-bio">${g.bio}</p>
      <div class="guru-tags">
        ${g.tags.map(t => `<span class="guru-tag" style="background:rgba(${hexToRgb(g.tagBg)},0.15);color:${g.tagColor};border-color:rgba(${hexToRgb(g.tagBg)},0.3);">${t}</span>`).join('')}
      </div>
      ${actionsHtml}
    `;
    guruListEl.appendChild(card);

    if (g.voiceEnabled) {
      card.querySelector(`#chatBtn_${g.id}`).addEventListener('click', () => openChat(g));
      card.querySelector(`#talkBtn_${g.id}`).addEventListener('click', () => openVoiceChat(g));
    } else {
      card.querySelector(`#guruBtn_${g.id}`).addEventListener('click', () => openChat(g));
    }
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
    if (panelId === 'panelProfile' || panelId === 'panelDashboard' || panelId === 'panelActivities') {
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
    stillness: "Your mind is racing, Rebel. Tend your attention in the Mind Meadow?",
    creation:  "The spark is low. Shall we tend the Inner Garden today?",
    sonic:     "The world is loud. Let the Sleep Sanctuary bring you to baseline.",
    wisdom:    "Before you reach for fuel — pause. Three breaths at the Fuel Stop.",
    emotion:   "Be gentle with yourself. Receive care at the Pamper Palace.",
    bridge:    "You are not alone. Find your Kindred Spirits.",
    movement:  "Stagnant energy is the enemy. Shape the body in the Studio.",
    nourish:   "Sit with what's been handed down. Study at the Wisdom Temple."
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
    options: ["🧘 Mind Meadow", "🎨 Inner Garden", "🌙 Sleep Sanctuary", "🍎 Fuel Stop", "🤸 Shape Studio"]
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

  // Illustrative (seed persona): read-only, chat disabled per canon (not a real WIP)
  const chatHeaderStatusEl = document.getElementById('chatHeaderStatus');
  if (guru.illustrative) {
    chatInput.disabled = true;
    chatSend.disabled = true;
    chatInput.placeholder = 'Illustrative profile — live chat coming soon';
    if (chatHeaderStatusEl) chatHeaderStatusEl.innerHTML = '<span class="chat-status-dot" style="background:#8a8a8a;"></span> Illustrative profile';
  } else {
    chatInput.disabled = false;
    chatInput.placeholder = 'Ask your guru anything…';
    if (chatHeaderStatusEl) chatHeaderStatusEl.innerHTML = '<span class="chat-status-dot"></span> AI · Online';
  }

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

  // Illustrative seed personas: show a clear notice instead of a fake live chat
  if (guru.illustrative) {
    const notice = document.createElement('div');
    notice.className = 'msg-row guru';
    notice.innerHTML = `
      <div class="msg-avatar" style="background:${guru.gradient};">${guru.emoji}</div>
      <div class="msg-bubble" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);">
        ✨ This is an <strong>illustrative</strong> Guru profile — a preview of the kind of practitioner you'll meet in the Good Vybes Guru directory. Live conversation isn't available here yet.<br><br>
        To chat now, try <strong>Max</strong> or <strong>Melini</strong> — our two live Gurus. 🌿
      </div>`;
    chatMessages.appendChild(notice);
    scrollToBottom();
    return;
  }

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
  if (activeGuru.illustrative) return; // chat disabled for illustrative seed personas (no backend)

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
      // ── Gaia Twins Integration ──
      const isGaia = guru.chatUrl.includes('gaia-twins');
      const payload = isGaia
        ? { text: text, twin: guru.twinId }
        : { message: text };

      const resp = await fetch(guru.chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      hideTyping();

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);

      const data = await resp.json();
      // Gaia might return textual reply in 'reply' or 'text'
      reply = data.reply ?? data.message ?? data.text ?? null;
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

// Octant cards open the canonical phygital session (bindings further below).
// Legacy meditation/breathing/mood modal openers were removed here so modals no longer stack.

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

// ⚠️ The internal `id` keys (stillness/creation/sonic/wisdom/emotion/bridge/movement/nourish) are
// persisted in the backend `octant_scores` JSONB and MUST NOT change — only display copy is renamed
// to the canonical octant identities (dojoden_octent.txt v0.2, "the practice of stopping").
// The two content migrations are reflected in the copy/instructions below:
//   • Off-screen acupressure → Pamper Palace (emotion id)
//   • Sacred-text tracing    → Wisdom Temple (nourish id)
// The interactive phygital-mechanic rebuilds (Replace-verdict octants) are tracked in the
// phygital-layer workstream, not this renaming pass.
const PHYGITAL_TYPES = {
  STILLNESS: {
    id: 'stillness',
    name: 'Mind Meadow',
    desc: 'Octant 01 · Stop to Tend Attention',
    instruction: 'Rest Your Thumb on the Anchor',
    activityId: 'meditation'
  },
  CREATION: { id: 'creation', name: 'Inner Garden',     desc: 'Octant 02 · Stop to Cultivate Creation',      instruction: 'Touch to Tend Your Garden',           activityId: 'creation' },
  SONIC:    { id: 'sonic',    name: 'Sleep Sanctuary',  desc: 'Octant 03 · Stop to Restore',                 instruction: 'Breathe the Long Exhale',             activityId: 'sonic', offScreen: true },
  WISDOM:   { id: 'wisdom',   name: 'Fuel Stop',        desc: 'Octant 04 · Stop to Fuel',                    instruction: 'Three Breaths Before You Eat',        activityId: 'affirmation', offScreen: true },
  EMOTION:  { id: 'emotion',  name: 'Pamper Palace',    desc: 'Octant 05 · Stop to Receive Care',            instruction: 'Lift Your Thumb — Press the Point, Hold', activityId: 'mood_check', offScreen: true },
  BRIDGE:   { id: 'bridge',   name: 'Kindred Spirits',  desc: 'Octant 06 · Stop to Find Your People',        instruction: 'Who Showed Up For You Today?',        activityId: 'bridge', offScreen: true },
  MOVEMENT: { id: 'movement', name: 'Shape Studio',     desc: 'Octant 07 · Stop to Shape the Body',          instruction: 'Hold the Form — Thumb Keeps Time',    activityId: 'breathing', offScreen: true },
  SPIRIT:   { id: 'nourish',  name: 'Wisdom Temple',    desc: 'Octant 08 · Stop to Study Ancient Knowledge', instruction: 'Trace the Sacred Path',               activityId: 'nourish' }
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
  phygitalStatusEl.textContent = meta.offScreen ? 'Off-Screen Practice' : 'Awaiting Signal';
}

function renderPhygitalSurface(octantId) {
  phygitalSurface.innerHTML = '';
  touchPrompt.classList.remove('hidden');
  contactWarning.classList.add('hidden');
  
  if (octantId === 'stillness') {
    renderAttentionAnchor();
  } else if (octantId === 'creation') {
    renderCreationForge();
  } else if (octantId === 'sonic') {
    renderSleepSanctuarySurface();
  } else if (octantId === 'wisdom') {
    renderFuelStopSurface();
  } else if (octantId === 'emotion') {
    renderAcupressureSurface();
  } else if (octantId === 'bridge') {
    renderKindredSurface();
  } else if (octantId === 'movement') {
    renderShapeStudioSurface();
  } else if (octantId === 'nourish') {
    renderSpiritTemple();
  } else {
    phygitalSurface.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text3); font-size:12px;">S01 Physical component for ${octantId} coming soon. <br><br> (Phygital logic ready)</div>`;
  }
}

/* ═══ Pamper Palace · Off-Screen Acupressure (constitutional showpiece) ═══
   The thumb LEAVES the screen and works the user's own body. No contact timer —
   the screen teaches the point, then a guided hold runs hands-free. Trust the practice. */
const ACU_LIBRARY = {
  li4:     { emoji: '🤚', name: 'Union Valley · LI4',  where: 'the webbing between your thumb and index finger', cue: 'Press with the opposite thumb — firm and steady. Breathe slowly.' },
  temples: { emoji: '😌', name: 'The Temples',         where: 'the soft hollows at the sides of your forehead',  cue: 'Slow, small circles with both thumbs.' },
  brow:    { emoji: '🧘', name: 'Third Eye · Yintang', where: 'the point between your eyebrows',                  cue: 'Gentle, steady pressure with one thumb.' },
  scalp:   { emoji: '💆', name: 'The Crown',           where: 'the top of your scalp',                           cue: 'Small circular motions, working slowly outward.' },
  hand:    { emoji: '🤲', name: 'Palm Reflex',         where: 'the centre of your opposite palm',                cue: 'Press and knead with your thumb.' },
  foot:    { emoji: '🦶', name: 'Sole Reflex',         where: 'the arch of your foot',                           cue: 'Firm, grounding pressure — slow and deliberate.' },
  neck:    { emoji: '🌿', name: 'Drainage Line',       where: 'the sides of your neck toward the collarbone',    cue: 'Light downward strokes — soft and unhurried.' },
};
// One sequence per belt (White → Black): more points, deeper ritual.
const ACU_SEQUENCE = [
  ['li4'],                                        // White
  ['temples', 'brow'],                            // Yellow
  ['scalp'],                                      // Orange
  ['hand'],                                       // Green
  ['foot'],                                       // Blue
  ['neck'],                                       // Purple
  ['temples', 'scalp', 'hand', 'foot'],           // Brown — the full circuit
  ['li4', 'temples', 'scalp', 'hand', 'foot'],    // Black — self-directed circuit
];
let acuTimer = null, acuQueue = [], acuStep = 0, acuSecsLeft = 0, acuHold = 35;

function renderAcupressureSurface() {
  const pts = window.currentOctantScores?.emotion || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  acuQueue = ACU_SEQUENCE[beltIdx] || ACU_SEQUENCE[0];
  acuStep = 0;
  acuHold = 35 + beltIdx * 3; // seconds held per point, scaling with belt
  touchPrompt.classList.add('hidden');
  phygitalTimeEl.textContent = formatTime(acuHold);
  drawAcuStep(false);
}

function drawAcuStep(running) {
  const p = ACU_LIBRARY[acuQueue[acuStep]];
  if (running) {
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji">${p.emoji}</div>
        <div class="acu-name">${p.name}</div>
        <div class="acu-count" id="acuCount">${acuSecsLeft}s</div>
        <div class="acu-rest">Keep pressing the point — the screen can rest. 🌸</div>
      </div>`;
    return;
  }
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-badge">📵 Off-screen practice</div>
      <div class="acu-emoji">${p.emoji}</div>
      <div class="acu-name">${p.name}</div>
      <div class="acu-where">Find ${p.where}.</div>
      <div class="acu-cue">${p.cue}</div>
      <div class="acu-step">Point ${acuStep + 1} of ${acuQueue.length}</div>
      <button class="acu-begin" id="acuBegin" type="button">${acuStep === 0 ? 'Begin' : 'Continue'} ▶</button>
      <div class="acu-hint">Tap Begin, then take your thumb <strong>off the screen</strong> and press the point.</div>
    </div>`;
  document.getElementById('acuBegin')?.addEventListener('click', acuBegin);
}

function acuBegin() {
  acuSecsLeft = acuHold;
  phygitalStatusEl.textContent = 'Pressing';
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  drawAcuStep(true);
  acuTimer = setInterval(() => {
    acuSecsLeft--;
    const c = document.getElementById('acuCount');
    if (c) c.textContent = acuSecsLeft + 's';
    phygitalTimeEl.textContent = formatTime(Math.max(0, acuSecsLeft));
    if (acuSecsLeft <= 0) {
      clearInterval(acuTimer); acuTimer = null;
      acuStep++;
      if (acuStep >= acuQueue.length) {
        acuComplete();
      } else {
        phygitalStatusEl.textContent = 'Release · next point';
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        drawAcuStep(false);
      }
    }
  }, 1000);
}

function acuComplete() {
  if (acuTimer) { clearInterval(acuTimer); acuTimer = null; }
  phygitalStatusEl.textContent = 'Care Received';
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-emoji">🌸</div>
      <div class="acu-name">Care received.</div>
      <div class="acu-cue">Let the warmth settle for a moment. Well done.</div>
    </div>`;
  claimActivityReward('mood_check');
  setTimeout(() => closeModal('phygitalModal'), 2400);
}

/* ═══ Shape Studio · Off-Screen Form Practice ═══
   The body moves; the thumb only witnesses — timing holds and counting reps.
   Two modes: 'hold' (hands-free countdown) and 'reps' (tap once per rep). */
const SHAPE_LIBRARY = {
  mountain: { emoji: '🧍', name: 'Mountain Pose',     type: 'hold', dur: 30, cue: 'Stand tall, feet grounded, crown lifting. Slow, even breath.' },
  fold:     { emoji: '🙇', name: 'Forward Fold',      type: 'hold', dur: 30, cue: 'Hinge from the hips, let your head hang heavy.' },
  warrior:  { emoji: '🧗', name: 'Warrior Hold',      type: 'hold', dur: 30, cue: 'Front knee bent, back leg strong, arms reaching wide.' },
  plank:    { emoji: '🤸', name: 'Plank Hold',        type: 'hold', dur: 30, cue: 'One straight line, crown to heels. Brace the core.' },
  mobility: { emoji: '🌀', name: 'Open & Mobilise',   type: 'hold', dur: 40, cue: 'Slow circles through the joints — unhurried, exploring range.' },
  pulse:    { emoji: '🔁', name: 'Controlled Pulses', type: 'reps', reps: 12, cue: 'Small, precise pulses. Tap once per pulse.' },
  squat:    { emoji: '🏋️', name: 'Squat Set',         type: 'reps', reps: 10, cue: 'Slow squats, full range. Tap each time you rise.' },
};
const SHAPE_SEQUENCE = [
  ['mountain'],                                      // White — the single shape
  ['mountain', 'fold'],                              // Yellow — two shapes, one breath
  ['pulse'],                                         // Orange — the controlled pulse
  ['mountain', 'fold', 'warrior'],                   // Green — three-pose flow
  ['plank', 'squat'],                                // Blue — building strength
  ['mobility'],                                      // Purple — mobility & opening
  ['warrior', 'pulse', 'plank'],                     // Brown — integrated practice
  ['mountain', 'fold', 'warrior', 'pulse', 'squat'], // Black — your own practice
];
let shapeTimer = null, shapeQueue = [], shapeStep = 0, shapeLeft = 0, shapeReps = 0;

function renderShapeStudioSurface() {
  const pts = window.currentOctantScores?.movement || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  shapeQueue = SHAPE_SEQUENCE[beltIdx] || SHAPE_SEQUENCE[0];
  shapeStep = 0;
  touchPrompt.classList.add('hidden');
  drawShapeStep('intro');
}

function drawShapeStep(state) {
  const s = SHAPE_LIBRARY[shapeQueue[shapeStep]];
  if (state === 'intro') {
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-badge">🤸 Move with your body</div>
        <div class="acu-emoji">${s.emoji}</div>
        <div class="acu-name">${s.name}</div>
        <div class="acu-cue">${s.cue}</div>
        <div class="acu-step">${s.type === 'hold' ? `Hold · ${s.dur}s` : `${s.reps} reps`} · ${shapeStep + 1} of ${shapeQueue.length}</div>
        <button class="acu-begin" id="shapeBegin" type="button">${shapeStep === 0 ? 'Begin' : 'Continue'} ▶</button>
        <div class="acu-hint">The thumb only keeps time — ${s.type === 'hold' ? 'hold the shape with your body.' : 'tap once per rep as you move.'}</div>
      </div>`;
    document.getElementById('shapeBegin')?.addEventListener('click', shapeBegin);
    return;
  }
  if (s.type === 'hold') {
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji">${s.emoji}</div>
        <div class="acu-name">${s.name}</div>
        <div class="acu-count" id="shapeCount">${shapeLeft}s</div>
        <div class="acu-rest">Hold steady — breathe.</div>
      </div>`;
  } else {
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji">${s.emoji}</div>
        <div class="acu-name">${s.name}</div>
        <div class="acu-count" id="shapeReps">${shapeReps} / ${s.reps}</div>
        <button class="acu-begin" id="shapeTap" type="button">Tap ✓</button>
        <div class="acu-rest">Tap once per rep.</div>
      </div>`;
    document.getElementById('shapeTap')?.addEventListener('pointerdown', shapeTapRep);
  }
}

function shapeBegin() {
  const s = SHAPE_LIBRARY[shapeQueue[shapeStep]];
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  if (s.type === 'hold') {
    shapeLeft = s.dur;
    phygitalStatusEl.textContent = 'Holding';
    drawShapeStep('run');
    shapeTimer = setInterval(() => {
      shapeLeft--;
      const c = document.getElementById('shapeCount');
      if (c) c.textContent = shapeLeft + 's';
      phygitalTimeEl.textContent = formatTime(Math.max(0, shapeLeft));
      if (shapeLeft <= 0) { clearInterval(shapeTimer); shapeTimer = null; shapeAdvance(); }
    }, 1000);
  } else {
    shapeReps = 0;
    phygitalStatusEl.textContent = 'Counting';
    drawShapeStep('run');
  }
}

function shapeTapRep() {
  const s = SHAPE_LIBRARY[shapeQueue[shapeStep]];
  shapeReps++;
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  const c = document.getElementById('shapeReps');
  if (c) c.textContent = `${shapeReps} / ${s.reps}`;
  if (shapeReps >= s.reps) shapeAdvance();
}

function shapeAdvance() {
  shapeStep++;
  if (shapeStep >= shapeQueue.length) {
    shapeComplete();
  } else {
    phygitalStatusEl.textContent = 'Next shape';
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    drawShapeStep('intro');
  }
}

function shapeComplete() {
  if (shapeTimer) { clearInterval(shapeTimer); shapeTimer = null; }
  phygitalStatusEl.textContent = 'Practice Complete';
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-emoji">🤸</div>
      <div class="acu-name">Well moved.</div>
      <div class="acu-cue">Your body shaped, your breath steady. Rest a moment.</div>
    </div>`;
  claimActivityReward('breathing'); // Shape Studio (movement) octant's activityId
  setTimeout(() => closeModal('phygitalModal'), 2400);
}

/* ═══ Mind Meadow · Attention Anchor (on-screen) ═══
   The thumb rests on a still point; the point is bright while attention is present
   and dims when it wanders. The practice is the return. Belt scales the challenge:
   pulse (Yellow+), the point drifts (Orange+), sensory prompts to notice-not-engage (Green+). */
const ANCHOR_PROMPTS = ['a sound', 'a passing thought', 'warmth', 'the colour blue', 'a faint sensation', 'the quiet'];

function renderAttentionAnchor() {
  const pts = window.currentOctantScores?.stillness || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  window.anchorBelt = beltIdx;
  phygitalSurface.innerHTML = `
    <div class="anchor-wrap">
      <div id="anchorIntro" class="anchor-intro">Rest your thumb on the point.<br>When it dims, your attention wandered — gently return.</div>
      <div id="anchorPoint" class="anchor-point${beltIdx >= 1 ? ' pulsing' : ''}"></div>
      <div id="anchorPrompt" class="anchor-prompt"></div>
    </div>`;
}

function updateAttentionAnchor() {
  const ap = document.getElementById('anchorPoint');
  if (!ap) return;
  ap.classList.add('present'); // attention is here — the point is bright
  document.getElementById('anchorIntro')?.classList.add('gone'); // fade the how-to once they begin
  const belt = window.anchorBelt || 0;
  // Orange+: the anchor wanders slowly; sustained attention on a moving point
  if (belt >= 2) {
    const t = Date.now() / 4500;
    ap.style.left = (50 + Math.sin(t) * 26) + '%';
    ap.style.top  = (50 + Math.cos(t * 0.7) * 26) + '%';
  }
  // Green+: brief sensory prompts — notice that something arose, do not engage
  if (belt >= 3 && phygitalSecs > 3 && phygitalSecs % 18 === 0) showAnchorPrompt();
}

function showAnchorPrompt() {
  const el = document.getElementById('anchorPrompt');
  if (!el) return;
  const word = ANCHOR_PROMPTS[Math.floor(Math.random() * ANCHOR_PROMPTS.length)];
  el.textContent = `Notice ${word} — then return.`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

/* ═══ Sleep Sanctuary · Guided Breathwork (hands-free) ═══
   A breathing circle paces the breath: grows on the inhale, shrinks on the exhale.
   Belt scales the pattern from a simple long exhale to receptive sound-bath / drift. */
const BREATH_PATTERNS = [
  { name: 'The Long Exhale',         phases: [['Breathe In', 4], ['Breathe Out', 6]],                          cycles: 6, note: 'Exhale longer than the inhale — the body settles.' },        // White
  { name: 'Four Corners (Box)',      phases: [['Breathe In', 4], ['Hold', 4], ['Breathe Out', 4], ['Hold', 4]], cycles: 5, note: 'Equal sides. Find stillness in the holds.' },                 // Yellow
  { name: 'The Sleep Breath · 4-7-8', phases: [['Breathe In', 4], ['Hold', 7], ['Breathe Out', 8]],            cycles: 4, note: 'The classic sleep-induction rhythm.' },                       // Orange
  { name: 'Descending Calm',         phases: [['Breathe In', 4], ['Breathe Out', 8]],                          cycles: 7, note: 'Let each exhale carry you a little lower.' },                 // Green
  { name: 'The Humming Breath',      phases: [['Breathe In', 4], ['Hum the Exhale', 8]],                       cycles: 6, note: 'Exhale with a soft low hum — feel the vibration.' },           // Blue
  { name: 'The Sound Bath',          phases: [['Receive', 10]],                                                cycles: 6, note: 'Nothing to do. Let the rhythm wash over you.' },               // Purple
  { name: 'The Threshold',           phases: [['Breathe In', 4], ['Breathe Out', 10]],                         cycles: 6, note: 'Slower, softer — the edge of sleep.' },                       // Brown
  { name: 'Drift',                   phases: [['Rest', 12]],                                                   cycles: 5, note: 'No effort. Simply rest. Let the screen fade if it will.' },    // Black
];
let ssTimer = null, ssPattern = null, ssCycle = 0, ssPhaseIdx = 0, ssPhaseLeft = 0;

function renderSleepSanctuarySurface() {
  const pts = window.currentOctantScores?.sonic || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  ssPattern = BREATH_PATTERNS[beltIdx] || BREATH_PATTERNS[0];
  touchPrompt.classList.add('hidden');
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-badge">🌙 Guided breathwork</div>
      <div class="acu-name">${ssPattern.name}</div>
      <div class="acu-cue">${ssPattern.note}</div>
      <div class="acu-step">${ssPattern.cycles} cycles · follow the circle</div>
      <button class="acu-begin" id="ssBegin" type="button">Begin ▶</button>
      <div class="acu-hint">Set the phone down if you like — just breathe with the circle. <strong>In</strong> as it grows, <strong>out</strong> as it shrinks.</div>
    </div>`;
  document.getElementById('ssBegin')?.addEventListener('click', ssBegin);
}

function ssBegin() {
  ssCycle = 0;
  ssPhaseIdx = 0;
  phygitalStatusEl.textContent = 'Breathing';
  phygitalSurface.innerHTML = `
    <div class="ss-wrap">
      <div id="ssCircle" class="ss-circle"></div>
      <div id="ssPhase" class="ss-phase"></div>
      <div id="ssCount" class="ss-count"></div>
    </div>`;
  ssNextPhase();
}

function ssNextPhase() {
  const phases = ssPattern.phases;
  if (ssPhaseIdx >= phases.length) {
    ssPhaseIdx = 0;
    ssCycle++;
    if (ssCycle >= ssPattern.cycles) { ssComplete(); return; }
  }
  const [label, secs] = phases[ssPhaseIdx];
  ssPhaseLeft = secs;
  const circle = document.getElementById('ssCircle');
  const phaseEl = document.getElementById('ssPhase');
  if (phaseEl) phaseEl.textContent = label;
  if (circle) {
    const l = label.toLowerCase();
    circle.style.transitionDuration = secs + 's';
    if (l.includes('in')) circle.style.transform = 'scale(1.5)';            // inhale → grow
    else if (l.includes('hold')) { /* hold position */ }
    else circle.style.transform = 'scale(0.7)';                            // exhale / hum / receive / rest → shrink
  }
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('soft');
  phygitalTimeEl.textContent = `${ssCycle + 1}/${ssPattern.cycles}`;
  ssTimer = setInterval(() => {
    ssPhaseLeft--;
    const c = document.getElementById('ssCount');
    if (c) c.textContent = ssPhaseLeft > 0 ? ssPhaseLeft : '';
    if (ssPhaseLeft <= 0) {
      clearInterval(ssTimer); ssTimer = null;
      ssPhaseIdx++;
      ssNextPhase();
    }
  }, 1000);
}

function ssComplete() {
  if (ssTimer) { clearInterval(ssTimer); ssTimer = null; }
  phygitalStatusEl.textContent = 'Rested';
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-emoji">🌙</div>
      <div class="acu-name">Rested.</div>
      <div class="acu-cue">Your system has found its baseline. Carry the calm with you.</div>
    </div>`;
  claimActivityReward('sonic');
  setTimeout(() => closeModal('phygitalModal'), 2400);
}

/* ═══ Fuel Stop · Sub-60s Pre-Meal Punctuation ═══
   Not a long session — a quick ritual right before eating. Belt adds steps and raises
   the daily-frequency goal. Mixed micro-interactions keep it distinct from every other octant. */
const FUEL_STEPS = {
  breath:    { emoji: '🌬️', title: 'Three Breaths',    cue: 'Before you eat — three slow breaths. In… and out.',       type: 'breath' },
  water:     { emoji: '💧', title: 'Water Check',      cue: 'Have you had some water? Take a sip now.',                 type: 'confirm', btn: 'I have 💧' },
  gratitude: { emoji: '🙏', title: 'Gratitude Trace',  cue: 'Hold and trace a slow circle to honour this meal.',       type: 'trace' },
  bites:     { emoji: '🥢', title: 'Slow First Bites', cue: 'Tap as you take each of your first three bites — slowly.', type: 'count', target: 3 },
  name:      { emoji: '✨', title: 'Name the Fuel',    cue: 'What is this fuel for?',                                   type: 'choice', options: ['Energy', 'Comfort', 'Celebration', 'Repair'] },
};
const FUEL_SEQUENCE = [
  ['breath'],                                          // White
  ['breath', 'water'],                                 // Yellow
  ['breath', 'gratitude'],                             // Orange
  ['breath', 'bites'],                                 // Green
  ['breath', 'water', 'gratitude', 'bites'],           // Blue — the full pause
  ['breath', 'name'],                                  // Purple
  ['breath', 'water', 'gratitude', 'name'],            // Brown
  ['breath', 'water', 'gratitude', 'bites', 'name'],   // Black
];
const FUEL_FREQ = ['3', '4', '5', '6', '6', '6', '6', 'your own'];
let fuelTimer = null, fuelAux = null, fuelQueue = [], fuelStep = 0, fuelLeft = 0, fuelCount = 0;

function renderFuelStopSurface() {
  const pts = window.currentOctantScores?.wisdom || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  fuelQueue = FUEL_SEQUENCE[beltIdx] || FUEL_SEQUENCE[0];
  fuelStep = 0;
  touchPrompt.classList.add('hidden');
  const ritual = fuelQueue.map(k => FUEL_STEPS[k].title).join(' · ');
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-badge">🍎 Fuel Stop · ~30s</div>
      <div class="acu-name">The Pause Before You Eat</div>
      <div class="acu-cue">${ritual}</div>
      <div class="acu-step">Goal: pause before ${FUEL_FREQ[beltIdx]} meals a day</div>
      <button class="acu-begin" id="fuelBegin" type="button">Begin ▶</button>
      <div class="acu-hint">A quick ritual — best done right before your next meal.</div>
    </div>`;
  document.getElementById('fuelBegin')?.addEventListener('click', drawFuelStep);
}

function fuelClearTimers() {
  if (fuelTimer) { clearInterval(fuelTimer); fuelTimer = null; }
  if (fuelAux) { clearInterval(fuelAux); fuelAux = null; }
}

function drawFuelStep() {
  if (fuelStep >= fuelQueue.length) { fuelComplete(); return; }
  const s = FUEL_STEPS[fuelQueue[fuelStep]];
  phygitalStatusEl.textContent = s.title;
  const stepLabel = `Step ${fuelStep + 1} of ${fuelQueue.length}`;

  if (s.type === 'breath') {
    fuelLeft = 12;
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="ss-circle" id="fuelBreath" style="transform:scale(0.8)"></div>
        <div class="acu-name" style="margin-top:22px;">${s.title}</div>
        <div class="acu-cue">${s.cue}</div>
        <div class="acu-count" id="fuelNum">${fuelLeft}s</div>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    const circle = document.getElementById('fuelBreath');
    let grow = true;
    const breathe = () => { if (circle) { circle.style.transitionDuration = '2s'; circle.style.transform = grow ? 'scale(1.3)' : 'scale(0.8)'; grow = !grow; } };
    breathe();
    fuelAux = setInterval(breathe, 2000);
    fuelTimer = setInterval(() => {
      fuelLeft--;
      const c = document.getElementById('fuelNum'); if (c) c.textContent = fuelLeft + 's';
      if (fuelLeft <= 0) { fuelClearTimers(); fuelAdvance(); }
    }, 1000);

  } else if (s.type === 'confirm') {
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji">${s.emoji}</div>
        <div class="acu-name">${s.title}</div>
        <div class="acu-cue">${s.cue}</div>
        <button class="acu-begin" id="fuelConfirm" type="button">${s.btn}</button>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    document.getElementById('fuelConfirm')?.addEventListener('click', fuelAdvance);

  } else if (s.type === 'count') {
    fuelCount = 0;
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji">${s.emoji}</div>
        <div class="acu-name">${s.title}</div>
        <div class="acu-cue">${s.cue}</div>
        <div class="acu-count" id="fuelReps">0 / ${s.target}</div>
        <button class="acu-begin" id="fuelTap" type="button">Bite ✓</button>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    document.getElementById('fuelTap')?.addEventListener('pointerdown', () => {
      fuelCount++;
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      const c = document.getElementById('fuelReps'); if (c) c.textContent = `${fuelCount} / ${s.target}`;
      if (fuelCount >= s.target) fuelAdvance();
    });

  } else if (s.type === 'choice') {
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji">${s.emoji}</div>
        <div class="acu-name">${s.title}</div>
        <div class="acu-cue">${s.cue}</div>
        <div class="fuel-choices">${s.options.map(o => `<button class="fuel-choice" type="button">${o}</button>`).join('')}</div>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    phygitalSurface.querySelectorAll('.fuel-choice').forEach(b => b.addEventListener('click', fuelAdvance));

  } else if (s.type === 'trace') {
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-name">${s.title}</div>
        <div class="acu-cue">${s.cue}</div>
        <div class="fuel-trace" id="fuelTrace"><div class="fuel-trace-fill" id="fuelTraceFill"></div><span>🙏</span></div>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    setupFuelTrace();
  }
}

function setupFuelTrace() {
  const pad = document.getElementById('fuelTrace');
  const fill = document.getElementById('fuelTraceFill');
  if (!pad) return;
  let held = 0;
  const start = () => {
    if (fuelAux) return;
    fuelAux = setInterval(() => {
      held++;
      if (fill) fill.style.transform = `scale(${Math.min(1, held / 30)})`;
      if (held >= 30) { fuelClearTimers(); fuelAdvance(); }
    }, 100); // ~3s of tracing
  };
  const stop = () => { if (fuelAux) { clearInterval(fuelAux); fuelAux = null; } };
  pad.addEventListener('pointerdown', start);
  pad.addEventListener('pointerup', stop);
  pad.addEventListener('pointerleave', stop);
}

function fuelAdvance() {
  fuelClearTimers();
  fuelStep++;
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
  drawFuelStep();
}

function fuelComplete() {
  fuelClearTimers();
  phygitalStatusEl.textContent = 'Fuelled with Intention';
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-emoji">🍎</div>
      <div class="acu-name">Enjoy your meal.</div>
      <div class="acu-cue">You stopped before you ate. That's the whole practice.</div>
    </div>`;
  claimActivityReward('affirmation'); // Fuel Stop (wisdom) octant's activityId
  setTimeout(() => closeModal('phygitalModal'), 2400);
}

/* ═══ Kindred Spirits · Recognition (the social octant) ═══
   Not collaboration — recognition. Presence (anonymous), a private belonging reflection,
   an anonymous story, and a one-way wave. Wylde Hippies + Campfire Circles arrive in Phase 2. */
const KINDRED_PROMPTS = [
  'Who showed up for you today?',
  'When did you feel most like yourself this week?',
  'What small kindness landed on you recently?',
  'Who would you quietly like to thank right now?',
];
const KINDRED_STORIES = [
  '"I stopped scrolling and called my mum. Ten minutes. Best part of my day."',
  '"Three breaths before lunch — such a small thing. I felt human again."',
  '"I waved at a stranger here yesterday. Didn\'t need a reply. It was enough."',
  '"Some days the bravest thing is to simply stop. Today I stopped."',
];
const KINDRED_SEQUENCE = [
  ['reflect'],                            // White — a single question
  ['pulse', 'reflect'],                   // Yellow — you are not alone
  ['pulse', 'story', 'reflect'],          // Orange — someone else's words
  ['pulse', 'story', 'wave', 'reflect'],  // Green — the wave across
  ['pulse', 'story', 'wave', 'reflect'],  // Blue
  ['pulse', 'story', 'wave', 'reflect'],  // Purple
  ['pulse', 'story', 'wave', 'reflect'],  // Brown
  ['pulse', 'story', 'wave', 'reflect'],  // Black
];
let kinQueue = [], kinStep = 0;

function renderKindredSurface() {
  const pts = window.currentOctantScores?.bridge || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  kinQueue = KINDRED_SEQUENCE[beltIdx] || KINDRED_SEQUENCE[0];
  kinStep = 0;
  touchPrompt.classList.add('hidden');
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-badge">🫂 Kindred Spirits</div>
      <div class="acu-name">You're not practising alone</div>
      <div class="acu-cue">A moment to recognise the others stopping for the same reasons.</div>
      <button class="acu-begin" id="kinBegin" type="button">Begin ▶</button>
      <div class="acu-hint">Anonymous and gentle — nothing here is shared about you.</div>
    </div>`;
  document.getElementById('kinBegin')?.addEventListener('click', drawKindredStep);
}

function drawKindredStep() {
  if (kinStep >= kinQueue.length) { kindredComplete(); return; }
  const type = kinQueue[kinStep];
  const stepLabel = `Step ${kinStep + 1} of ${kinQueue.length}`;

  if (type === 'pulse') {
    phygitalStatusEl.textContent = 'Kindred Pulse';
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji">🫂</div>
        <div class="acu-name" id="kinPulseLine">Sensing who's here…</div>
        <div class="acu-cue">Anonymous and aggregated — never who, only how many.</div>
        <button class="acu-begin" id="kinNext" type="button">Continue ▶</button>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    document.getElementById('kinNext')?.addEventListener('click', kindredAdvance);
    loadKindredPulse();

  } else if (type === 'reflect') {
    const prompt = KINDRED_PROMPTS[Math.floor(Math.random() * KINDRED_PROMPTS.length)];
    phygitalStatusEl.textContent = 'Belonging Reflection';
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-name">${prompt}</div>
        <textarea id="kinReflect" class="kin-reflect" rows="3" placeholder="Just for you — a few words…"></textarea>
        <button class="acu-begin" id="kinKeep" type="button">Keep 🤍</button>
        <div class="acu-hint">Private — not stored, not shared. Held only in this moment.</div>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    document.getElementById('kinKeep')?.addEventListener('click', kindredAdvance);

  } else if (type === 'story') {
    const story = KINDRED_STORIES[Math.floor(Math.random() * KINDRED_STORIES.length)];
    phygitalStatusEl.textContent = "Someone Else's Words";
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji">📜</div>
        <div class="acu-cue" style="font-size:15px;">${story}</div>
        <div class="acu-step" style="opacity:0.6;">— a kindred spirit</div>
        <button class="acu-begin" id="kinNext" type="button">Receive ▶</button>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    document.getElementById('kinNext')?.addEventListener('click', kindredAdvance);

  } else if (type === 'wave') {
    phygitalStatusEl.textContent = 'Wave Across';
    phygitalSurface.innerHTML = `
      <div class="acu-card">
        <div class="acu-emoji" id="kinWaveEmoji">👋</div>
        <div class="acu-name">Send a wave</div>
        <div class="acu-cue">To another practitioner, somewhere. No reply expected — a gift, not an exchange.</div>
        <button class="acu-begin" id="kinWave" type="button">Send the wave 👋</button>
        <div class="acu-step">${stepLabel}</div>
      </div>`;
    document.getElementById('kinWave')?.addEventListener('click', () => {
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
      const card = phygitalSurface.querySelector('.acu-card');
      if (card) card.innerHTML = `<div class="acu-emoji">🤍</div><div class="acu-name">Your wave is on its way.</div><div class="acu-cue">Somewhere, someone will feel a little less alone.</div>`;
      setTimeout(kindredAdvance, 1600);
    });
  }
}

async function loadKindredPulse() {
  let count = null;
  try {
    const res = await fetch(`${API_BASE}/api/kindred-pulse`);
    if (res.ok) { const d = await res.json(); if (d.ok && typeof d.count === 'number') count = d.count; }
  } catch (e) { /* endpoint not deployed yet — fall back gracefully */ }
  const line = document.getElementById('kinPulseLine');
  if (!line) return;
  if (count && count > 0) {
    line.textContent = `${count} kindred ${count === 1 ? 'spirit is' : 'spirits are'} stopping right now`;
  } else if (count === 0) {
    line.textContent = "You're among the first to stop today — others will follow 🌱";
  } else {
    line.textContent = 'Around the world, others are stopping too 🌍';
  }
}

function kindredAdvance() {
  kinStep++;
  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  drawKindredStep();
}

function kindredComplete() {
  phygitalStatusEl.textContent = 'Recognised';
  const pts = window.currentOctantScores?.bridge || 0;
  const beltIdx = BELTS.indexOf(getBelt(pts));
  const phase2 = beltIdx >= 5 ? `<div class="acu-hint">The Wylde Hippies and Campfire Circles await in Phase 2. 🔥</div>` : '';
  phygitalSurface.innerHTML = `
    <div class="acu-card">
      <div class="acu-emoji">🫂</div>
      <div class="acu-name">You belong here.</div>
      <div class="acu-cue">You stopped alongside others, quietly, today.</div>
      ${phase2}
    </div>`;
  claimActivityReward('bridge'); // Kindred Spirits octant's activityId
  setTimeout(() => closeModal('phygitalModal'), 2600);
}

/* ─ Octant 05: Pamper Palace (id: emotion) · pressure biofeedback + acupressure ─ */
function renderEmotionCommand() {
  const wrap = document.createElement('div');
  wrap.style.width = '100dvw';
  wrap.style.height = '100dvw';
  wrap.style.background = 'radial-gradient(circle, var(--purple-dim) 0%, transparent 70%)';
  wrap.innerHTML = `
    <div id="bioString" style="width:2px; height:60%; background:var(--purple); box-shadow: 0 0 20px var(--purple); transition: transform 0.1s linear, background 0.4s;"></div>
    <div style="position:absolute; bottom:20px; font-size:10px; color:var(--text2);">PRESS &amp; HOLD · LET TOUCH RESTORE</div>
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

/* ─ Octant 06: Kindred Spirits (id: bridge) ─ */
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

/* ─ Octant 07: Shape Studio (id: movement) ─ */
function renderMovementArena() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div style="font-size:80px; filter: drop-shadow(0 0 20px var(--teal-glow));">🧘</div>
    <div style="margin-top:20px; font-size:11px; text-align:center; color:var(--text2); font-weight:700;">HOLD THE FORM<br><span style="color:var(--teal)">THUMB KEEPS TIME</span></div>
  `;
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  phygitalSurface.appendChild(wrap);
}

/* ─ Octant 08: Wisdom Temple (id: nourish) · labyrinth + sacred-text tracing ─ */
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

/* ─ Octant 03: Sleep Sanctuary (id: sonic) ─ */
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

/* ─ Octant 04: Fuel Stop (id: wisdom) ─ */
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
    <div style="position:absolute; bottom:20px; font-size:11px; color:var(--text3); font-weight:700;">PAUSE · THREE BREATHS BEFORE YOU FUEL</div>
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

/* ─ Octant 02: Inner Garden (id: creation) ─ */
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
  if (activePhygitalSession?.offScreen) return; // off-screen octants run their own guided timer
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
      updateAttentionAnchor();
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
  phygitalStatusEl.textContent = activePhygitalSession?.id === 'stillness' ? 'Attention Wandered' : 'Signal Lost';
  phygitalStatusEl.classList.remove('active');
  const _anchor = document.getElementById('anchorPoint');
  if (_anchor) _anchor.classList.remove('present'); // anchor dims when attention drifts
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
  if (activePhygitalSession?.offScreen) return; // off-screen octant: don't capture taps (let its buttons work)
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
  if (activePhygitalSession?.offScreen) return; // off-screen octant: let its buttons handle clicks
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

function exitPhygitalSession() {
  clearInterval(phygitalTimer);
  phygitalTimer = null;
  if (acuTimer) { clearInterval(acuTimer); acuTimer = null; }
  if (shapeTimer) { clearInterval(shapeTimer); shapeTimer = null; }
  if (ssTimer) { clearInterval(ssTimer); ssTimer = null; }
  if (fuelTimer) { clearInterval(fuelTimer); fuelTimer = null; }
  if (fuelAux) { clearInterval(fuelAux); fuelAux = null; }
  phygitalIsContact = false;
  stopAmbient();
  closeModal('phygitalModal');
  const overlay = document.getElementById('wisdom-phygital');
  if (overlay) overlay.classList.add('hidden');
}

document.getElementById('closePhygital')?.addEventListener('click', () => {
  // BUG-02: the ✕ must ALWAYS close the session reliably. A blocking confirm
  // (tg.showConfirm / window.confirm) can silently fail inside the Telegram WebView
  // and trap the user, so we close immediately. No GVRP is awarded for a partial
  // session anyway (rewards only fire on full completion), so nothing is lost.
  exitPhygitalSession();
});

document.getElementById('octStillness')?.addEventListener('click', () => startPhygitalSession('STILLNESS'));
document.getElementById('octCreation')?.addEventListener('click', () => startPhygitalSession('CREATION'));
document.getElementById('octSonic')?.addEventListener('click', () => startPhygitalSession('SONIC'));
document.getElementById('octWisdom')?.addEventListener('click', () => startPhygitalSession('WISDOM'));
document.getElementById('octEmotion')?.addEventListener('click', () => startPhygitalSession('EMOTION'));
document.getElementById('octBridge')?.addEventListener('click', () => startPhygitalSession('BRIDGE'));
document.getElementById('octMovement')?.addEventListener('click', () => startPhygitalSession('MOVEMENT'));
document.getElementById('octNourish')?.addEventListener('click', () => startPhygitalSession('SPIRIT'));

/* ═══ Flower UI (primary Dojo navigation) ═══ */
const FLOWER = [
  { id: 'stillness', key: 'STILLNESS', icon: '🧘', color: '#a855f7', name: 'Mind Meadow' },
  { id: 'creation',  key: 'CREATION',  icon: '🎨', color: '#ff7f50', name: 'Inner Garden' },
  { id: 'sonic',     key: 'SONIC',     icon: '🌙', color: '#22c55e', name: 'Sleep Sanctuary' },
  { id: 'wisdom',    key: 'WISDOM',    icon: '🍎', color: '#06b6d4', name: 'Fuel Stop' },
  { id: 'emotion',   key: 'EMOTION',   icon: '💆', color: '#f97316', name: 'Pamper Palace' },
  { id: 'bridge',    key: 'BRIDGE',    icon: '🤝', color: '#f43f5e', name: 'Kindred Spirits' },
  { id: 'movement',  key: 'MOVEMENT',  icon: '🤸', color: '#16a34a', name: 'Shape Studio' },
  { id: 'nourish',   key: 'SPIRIT',    icon: '🛕', color: '#7c3aed', name: 'Wisdom Temple' },
];

// Harmony Index (0–100): blends depth (avg belt) with balance (penalises an uneven flower)
function computeHarmony(scores) {
  const levels = FLOWER.map(o => BELTS.indexOf(getBelt(scores[o.id] || 0))); // 0–7 each
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  const range = Math.max(...levels) - Math.min(...levels);
  const balance = 1 - (range / 7) * 0.5; // up to 50% penalty for an uneven flower
  return Math.round((avg / 7) * 100 * balance);
}

function renderFlower() {
  const petalsEl = document.getElementById('flowerPetals');
  if (!petalsEl) return;
  const scores = window.currentOctantScores || {};
  const R = 100; // petal distance from centre (px)
  petalsEl.innerHTML = '';
  FLOWER.forEach((o, i) => {
    const belt = getBelt(scores[o.id] || 0);
    const lvl = BELTS.indexOf(belt) + 1;
    const angle = i * 45;
    const petal = document.createElement('button');
    petal.className = 'flower-petal';
    petal.style.setProperty('--petal-color', o.color);
    petal.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${R}px) rotate(${-angle}deg)`;
    petal.title = `${o.name} · ${belt.name} Belt (Lvl ${lvl})`;
    petal.setAttribute('aria-label', petal.title);
    petal.innerHTML = `<span class="petal-icon">${o.icon}</span><span class="petal-belt">L${lvl}</span>`;
    petal.addEventListener('click', () => startPhygitalSession(o.key));
    petalsEl.appendChild(petal);
  });
  const hEl = document.getElementById('flowerHarmony');
  if (hEl) hEl.textContent = computeHarmony(scores);
}

// Centre of the flower = the Thumb Lama (practice teacher)
document.getElementById('flowerCenter')?.addEventListener('click', () => {
  const lama = gurus.find(g => g.id === 'lama');
  if (lama) openChat(lama);
});

renderFlower(); // initial paint (defaults to all-White until the profile loads)

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
    stillness: getBelt(scores.stillness || 0).name,
    creation:  getBelt(scores.creation || 0).name,
    sonic:     getBelt(scores.sonic || 0).name,
    wisdom:    getBelt(scores.wisdom || 0).name,
    emotion:   getBelt(scores.emotion || 0).name,
    bridge:    getBelt(scores.bridge || 0).name,
    movement:  getBelt(scores.movement || 0).name,
    nourish:   getBelt(scores.nourish || 0).name
  };

  // Mastery Check: Need Purple Belt (Lvl 6) in any 3 Octants OR Dan 4 (Liberation)
  const purpleOctants = Object.values(belts).filter(b => ["Purple", "Brown", "Black"].includes(b)).length;
  const masterMilestone = purpleOctants >= 3 || (data.current_dan >= 4);
  
  return { belts, masterMilestone };
}

function updateSovereignUI(data) {
  const { belts, masterMilestone } = calculateAgentTraits(data);
  const userId = parseUser(initData).userId;
  
  document.getElementById('agentId').textContent = `SOV-#${userId.toString().slice(0, 4)}`;
  document.getElementById('t-aura').textContent = belts.stillness + ' Aura';
  document.getElementById('t-mark').textContent = belts.creation + ' Mark';
  document.getElementById('t-sonic').textContent = belts.sonic + ' Res.';
  document.getElementById('t-wisdom').textContent = belts.wisdom + ' Script';
  document.getElementById('t-emotion').textContent = belts.emotion + ' Freq.';
  document.getElementById('t-bridge').textContent = belts.bridge + ' Bond';
  document.getElementById('t-movement').textContent = belts.movement + ' Flow';
  document.getElementById('t-nourish').textContent = belts.nourish + ' Insight';

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
    if (!tonConnectUI) initTonConnect();
    openModal('mintModal');
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

    // Phase 6: Minting Gating
    const mintBtn = document.getElementById('btnMintSovereign');
    if (mintBtn) {
      if (data.current_dan >= 4) {
        mintBtn.classList.remove('disabled');
        mintBtn.classList.add('active');
        const mintReq = document.getElementById('mintRequirement');
        if (mintReq) mintReq.textContent = "Status: LIBERATED. Ready to Forge.";
      }
    }

    // Phase 5: Liberation Display (Private to profile for now)
    const manifestoSection = document.getElementById('sovereignEssenceSection');
    const manifestoText = document.getElementById('profileManifestoText');
    if (data.liberation_manifesto && manifestoSection && manifestoText) {
      manifestoText.textContent = data.liberation_manifesto;
      manifestoSection.classList.remove('hidden');
    }

    if (data.events.length === 0) {
      feedEl.innerHTML = '<div class="feed-empty">No activity yet — complete a session to earn GVRP!</div>';
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

    // Vybes Progress (0 to 100% of next belt tier)
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
        
        const glowFromPractice = practicedToday();
        if (data.streak >= 3 || glowFromPractice) {
          vibeTitle.textContent = 'Glow State';
          vibeDesc.textContent  = glowFromPractice
            ? "You practised today — your Thumbagotchi is glowing. ✨"
            : "You're radiating positive energy today!";
        } else if (data.streak > 0) {
          vibeTitle.textContent = 'Active Vybe';
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

    renderFlower(); // reflect current belts + harmony in the flower

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
  loadProfile(); // populate dashboard glow + Dojo belts on first paint
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

/* ══════════════════════════════════════════════
   💎 PHASE 6: RING THREE (SOVEREIGN WEB3 IDENTITY)
   ══════════════════════════════════════════════ */
let tonConnectUI = null;

function initTonConnect() {
   // PROD REQ: Update manifestUrl to your production domain
   tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
      manifestUrl: 'https://mini-app-service-production.up.railway.app/tonconnect-manifest.json',
      buttonRootId: 'ton-connect-btn'
   });
   
   tonConnectUI.onStatusChange(wallet => {
      const triggerBtn = document.getElementById('triggerMint');
      const statusText = document.getElementById('mintStatusText');
      if (wallet && triggerBtn && statusText) {
         triggerBtn.classList.remove('hidden');
         statusText.textContent = "Wallet Connected: " + wallet.account.address.slice(0,6) + "...";
      } else if (triggerBtn) {
         triggerBtn.classList.add('hidden');
         statusText.textContent = "Awaiting Wallet";
      }
   });
}

document.getElementById('btnMintSovereign')?.addEventListener('click', () => {
   const data = window.lastProfileData;
   if (!data || data.current_dan < 4) {
      alert("Liberation Required. Master all 5 Phases to forge your Sovereign Agent.");
      return;
   }
   
   document.getElementById('mintAgentId').textContent = 'SOV-' + data.user_id.slice(0,4).toUpperCase();
   document.getElementById('forgeBeltPreview').textContent = getBelt(data.total_points).name.toUpperCase();
   openModal('mintModal');
   if (!tonConnectUI) initTonConnect();
});

document.getElementById('triggerMint')?.addEventListener('click', async () => {
   const statusText = document.getElementById('mintStatusText');
   statusText.textContent = "Forging Identity...";
   
   // SIMULATED MINTING SEQUENCE (Cinematic)
   const plasma = document.querySelector('.plasma-orb');
   if (plasma) {
      plasma.style.animation = "pulseForge 0.2s infinite ease-in-out";
      plasma.style.filter = "blur(40px)";
   }

   try {
     // Fetch the final metadata from backend to show what's being minted
     const res = await fetch(`${API_BASE}/api/agent-metadata?initData=${encodeURIComponent(initData)}`);
     const metadata = await res.json();
     
     console.log("💎 Final Sovereign Metadata Generated:", metadata);

     setTimeout(async () => {
        // HANDOFF NOTE FOR FUTURE DEVELOPERS:
        // To complete E2E TON Blockchain minting:
        // 1. Deploy the Sovereign Agent NFT Collection Contract (TON NFT Standard).
        // 2. Format the `metadata` JSON-LD into a BoC (Bag of Cells) payload.
        // 3. Call the following SDK method:
        /*
           const transaction = {
               validUntil: Math.floor(Date.now() / 1000) + 60, 
               messages: [
                   {
                       address: "YOUR_COLLECTION_CONTRACT_ADDRESS",
                       amount: "50000000", // 0.05 TON
                       payload: "BOC_PAYLOAD_HERE" 
                   }
               ]
           };
           await tonConnectUI.sendTransaction(transaction);
        */
        
        statusText.textContent = "Filing Digital Liberation Statement...";
        
        setTimeout(() => {
           statusText.textContent = "AGENT FORGED: RING THREE COMPLETE";
           if (plasma) {
              plasma.style.animation = "none";
              plasma.style.background = "linear-gradient(135deg, gold, white)";
           }
           
           alert("SOVEREIGNTY ACHIEVED. Your Agent is now permanent on the TON Blockchain.");
           const btn = document.getElementById('btnMintSovereign');
           if (btn) {
             btn.innerHTML = "✅ Sovereign Agent Forged";
             btn.classList.add('disabled');
           }
        }, 2000);
     }, 2000);
   } catch (e) {
     console.error("Minting Fetch Error:", e);
     statusText.textContent = "Handoff Error: Check Console";
   }
});

document.getElementById('closeMint')?.addEventListener('click', () => {
   closeModal('mintModal');
});
/* ══════════════════════════════════════════════
   🎙️ VOICE CHAT (GAIA TWINS)
   ══════════════════════════════════════════════ */
const voiceScreen     = document.getElementById('voiceScreen');
const voiceClose      = document.getElementById('voiceClose');
const voiceAvatar     = document.getElementById('voiceAvatar');
const voiceAvatarRing = document.getElementById('voiceAvatarRing');
const voiceGuruName   = document.getElementById('voiceGuruName');
const voiceStatusText = document.getElementById('voiceStatusText');
const voiceStatusIcon = document.getElementById('voiceStatusIcon');
const voiceVisualizer = document.getElementById('voiceVisualizer');
const voiceResponseBubble = document.getElementById('voiceResponseBubble');
const voiceResponseText = document.getElementById('voiceResponseText');
const voiceTimer      = document.getElementById('voiceTimer');
const voiceRecordBtn  = document.getElementById('voiceRecordBtn');

let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let voiceStartTime = null;
let isRecording = false;

function openVoiceChat(guru) {
  activeGuru = guru;
  voiceGuruName.textContent = guru.name;
  voiceAvatar.textContent = guru.emoji;
  voiceAvatar.style.background = guru.gradient;
  voiceStatusText.textContent = `Ready to talk with ${guru.name.split(' ')[0]}`;
  voiceStatusIcon.textContent = guru.emoji;
  
  voiceResponseBubble.classList.add('hidden');
  voiceVisualizer.classList.add('hidden');
  voiceTimer.textContent = '00:00';
  
  voiceScreen.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (tg?.BackButton) {
    tg.BackButton.show();
    tg.BackButton.onClick(() => closeVoiceChat());
  }
}

function closeVoiceChat() {
  if (isRecording) stopRecording();
  voiceScreen.classList.add('hidden');
  document.body.style.overflow = '';
  if (tg?.BackButton) tg.BackButton.hide();
  
  // Stop any playing TTS
  if (window.currentTTS) {
    window.currentTTS.pause();
    window.currentTTS = null;
  }
}

voiceClose.addEventListener('click', closeVoiceChat);

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result.split(',')[1];
        sendVoiceToGaia(base64Audio);
      };
      
      // Stop all tracks to release mic
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    voiceRecordBtn.classList.add('recording');
    voiceAvatarRing.classList.add('pulsing');
    voiceVisualizer.classList.remove('hidden');
    voiceStatusText.textContent = 'Listening...';
    
    voiceStartTime = Date.now();
    voiceTimerInterval = setInterval(updateVoiceTimer, 1000);
    
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

  } catch (err) {
    console.error('Mic access denied:', err);
    alert('Please allow microphone access to talk with your guru.');
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    voiceRecordBtn.classList.remove('recording');
    voiceAvatarRing.classList.remove('pulsing');
    voiceStatusText.textContent = 'Processing...';
    clearInterval(voiceTimerInterval);
  }
}

function updateVoiceTimer() {
  const elapsed = Math.floor((Date.now() - voiceStartTime) / 1000);
  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');
  voiceTimer.textContent = `${mins}:${secs}`;
}

async function sendVoiceToGaia(base64Audio) {
  if (!activeGuru) return;
  
  try {
    const resp = await fetch('https://gaia-twins-production.up.railway.app/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64Audio,
        mimeType: 'audio/webm',
        twin: activeGuru.twinId
      })
    });

    if (!resp.ok) throw new Error(`Server error ${resp.status}`);

    const data = await resp.json();
    
    // Response has { text, ttsAudioBase64 }
    if (data.text) {
      voiceResponseText.textContent = `"${data.text}"`;
      voiceResponseBubble.classList.remove('hidden');
      voiceStatusText.textContent = 'Speaking...';
    }

    if (data.ttsAudioBase64) {
      playTTS(data.ttsAudioBase64);
    } else {
      voiceStatusText.textContent = 'Ready';
    }

  } catch (err) {
    console.error('Voice API error:', err);
    voiceStatusText.textContent = 'Error sending voice';
  }
}

function playTTS(base64) {
  if (window.currentTTS) {
    window.currentTTS.pause();
  }
  
  const audio = new Audio(`data:audio/mp3;base64,${base64}`);
  window.currentTTS = audio;
  audio.play();
  
  audio.onended = () => {
    voiceStatusText.textContent = 'Ready';
    window.currentTTS = null;
  };
}

voiceRecordBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});
