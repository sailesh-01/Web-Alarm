// System Nav Elements
const navClock = document.getElementById('nav-clock');
const navWorldClock = document.getElementById('nav-worldclock');
const navAlarms = document.getElementById('nav-alarms');
const navTimer = document.getElementById('nav-timer');

const viewClock = document.getElementById('view-clock');
const viewWorldClock = document.getElementById('view-worldclock');
const viewAlarms = document.getElementById('view-alarms');
const viewTimer = document.getElementById('view-timer');

// DOM Elements: Clock
const timeDisplay = document.getElementById('time');
const ampmDisplay = document.getElementById('ampm');
const dateDisplay = document.getElementById('date');

// DOM Elements: World Clock
const btnAddWorldClock = document.getElementById('btn-add-worldclock');
const worldClockTimezoneInput = document.getElementById('worldclock-timezone');
const worldClockListContainer = document.getElementById('worldclock-list-container');
const worldClockCountTxt = document.getElementById('worldclock-count');

// DOM Elements: Alarms
const hourInput = document.getElementById('alarm-hour');
const minuteInput = document.getElementById('alarm-minute');
const btnAm = document.getElementById('btn-am');
const btnPm = document.getElementById('btn-pm');

const btnSetAlarm = document.getElementById('btn-set-alarm');
const alarmListContainer = document.getElementById('alarm-list-container');
const activeCountTxt = document.getElementById('active-count');

// DOM Elements: Timer
const timerSetup = document.getElementById('timer-setup');
const timerRunning = document.getElementById('timer-running');
const timerMinInput = document.getElementById('timer-min-input');
const timerSecInput = document.getElementById('timer-sec-input');
const timerDisplay = document.getElementById('timer-display');

const btnTimerReset = document.getElementById('btn-timer-reset');
const btnTimerPlay = document.getElementById('btn-timer-play');
const timerPlayIcon = document.getElementById('timer-play-icon');
const timerPlayText = document.getElementById('timer-play-text');

// Generics / Modals
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

const ringingOverlay = document.getElementById('ringing-overlay');
const ringingTitle = document.getElementById('ringing-title');
const ringingTimeTxt = document.getElementById('ringing-time');
const btnStopAlarm = document.getElementById('btn-stop-alarm');
const btnSnooze = document.getElementById('btn-snooze');
const alarmSound = document.getElementById('alarm-sound');

// App States
let alarms = JSON.parse(localStorage.getItem('alarms')) || [];
let worldClocks = JSON.parse(localStorage.getItem('worldClocks')) || [];
let activeRingingAlarmId = null;
let selectedPeriod = 'AM';

// Timer States
let timerInterval = null;
let timerTotalSeconds = 0;
let isTimerRunning = false;

// -------------- INIT --------------
function init() {
  loadThemePreference();
  setInterval(updateClock, 1000);
  updateClock();
  renderAlarms();
  renderWorldClocks();
  setupNavigation();
}

// -------------- NAVIGATION --------------
function setupNavigation() {
  navClock.addEventListener('click', () => switchTab('clock', navClock, viewClock));
  navWorldClock.addEventListener('click', () => switchTab('worldclock', navWorldClock, viewWorldClock));
  navAlarms.addEventListener('click', () => switchTab('alarms', navAlarms, viewAlarms));
  navTimer.addEventListener('click', () => switchTab('timer', navTimer, viewTimer));
}

function switchTab(tab, navBtn, viewBlock) {
  // Reset all nav styles
  [navClock, navWorldClock, navAlarms, navTimer].forEach(btn => {
    btn.className = 'nav-btn flex-1 flex flex-col items-center justify-center text-[#f0dfff]/60 py-2 hover:text-[#f0dfff] transition-all active:scale-95 duration-300 rounded-full';
    const nameEl = btn.querySelector('span:nth-child(2)');
    if (nameEl) nameEl.classList.remove('font-bold');
    const icEl = btn.querySelector('span:nth-child(1)');
    if (icEl) icEl.style.fontVariationSettings = '';
  });

  // Activate clicked nav element
  navBtn.className = 'nav-btn flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-[#b6a0ff] to-[#7c4dff] text-[#15052a] rounded-full py-2 shadow-lg shadow-[#7c4dff]/20 active:scale-95 transition-all duration-300 ease-out';
  const activeNameEl = navBtn.querySelector('span:nth-child(2)');
  if (activeNameEl) activeNameEl.classList.add('font-bold');
  const activeIcEl = navBtn.querySelector('span:nth-child(1)');
  if (activeIcEl) activeIcEl.style.fontVariationSettings = "'FILL' 1";

  // Hide all sections
  [viewClock, viewWorldClock, viewAlarms, viewTimer].forEach(view => {
    view.classList.add('hidden');
    view.classList.remove('flex');
  });

  // Reveal requested block
  viewBlock.classList.remove('hidden');
  viewBlock.classList.add('flex');
}

// -------------- ALARM LOGIC --------------
btnAm.addEventListener('click', () => {
  selectedPeriod = 'AM';
  btnAm.classList.remove('bg-surface-container', 'text-on-surface-variant');
  btnAm.classList.add('bg-primary-container', 'text-on-primary-container');
  btnPm.classList.remove('bg-primary-container', 'text-on-primary-container');
  btnPm.classList.add('bg-surface-container', 'text-on-surface-variant');
});

btnPm.addEventListener('click', () => {
  selectedPeriod = 'PM';
  btnPm.classList.remove('bg-surface-container', 'text-on-surface-variant');
  btnPm.classList.add('bg-primary-container', 'text-on-primary-container');
  btnAm.classList.remove('bg-primary-container', 'text-on-primary-container');
  btnAm.classList.add('bg-surface-container', 'text-on-surface-variant');
});

function updateClock() {
  const now = new Date();

  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  dateDisplay.textContent = now.toLocaleDateString('en-US', options).toUpperCase();

  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  let ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12;

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  timeDisplay.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  ampmDisplay.textContent = ampm;

  // Trigger precisely at the minute mark
  if (seconds === 0) {
    checkAlarms(`${formattedHours}:${formattedMinutes}`, ampm);
  }

  updateWorldClocksDisplay();
}

function updateWorldClocksDisplay() {
  const now = new Date();
  if (worldClocks.length === 0) return;

  const dates = document.querySelectorAll('.wc-date');
  const times = document.querySelectorAll('.wc-time');
  const ampms = document.querySelectorAll('.wc-ampm');

  dates.forEach(el => {
    const tz = el.getAttribute('data-tz');
    try {
      const options = { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' };
      el.textContent = now.toLocaleDateString('en-US', options);
    } catch (e) { }
  });

  times.forEach(el => {
    const tz = el.getAttribute('data-tz');
    try {
      const options = { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true };
      const timeString = now.toLocaleTimeString('en-US', options);
      const time = timeString.split(' ')[0];
      el.textContent = time;
    } catch (e) { }
  });

  ampms.forEach(el => {
    const tz = el.getAttribute('data-tz');
    try {
      const options = { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true };
      const timeString = now.toLocaleTimeString('en-US', options);
      const ampm = timeString.split(' ')[1] || '';
      el.textContent = ampm.toUpperCase();
    } catch (e) { }
  });
}

function checkAlarms(currentTimeString, currentAMPM) {
  alarms.forEach(alarm => {
    if (alarm.isActive && alarm.time === currentTimeString && alarm.ampm === currentAMPM) {
      triggerAlarm(alarm, 'Wake up!');
    }
  });
}

function triggerAlarm(alarm, customTitle) {
  activeRingingAlarmId = alarm ? alarm.id : 'timer';
  ringingTitle.textContent = customTitle || 'Wake up!';
  ringingTimeTxt.textContent = alarm ? `${alarm.time} ${alarm.ampm}` : 'Time is up!';

  if (!alarm) {
    // If it's a timer trigger, hide the snooze button
    btnSnooze.style.display = 'none';
  } else {
    btnSnooze.style.display = 'block';
  }

  ringingOverlay.classList.add('active');
  alarmSound.currentTime = 0;

  let playPromise = alarmSound.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => console.log("Autoplay prevented:", error));
  }
}

function stopAlarm() {
  ringingOverlay.classList.remove('active');
  alarmSound.pause();
  alarmSound.currentTime = 0;

  if (activeRingingAlarmId && activeRingingAlarmId !== 'timer') {
    alarms = alarms.map(alarm => {
      if (alarm.id === activeRingingAlarmId) {
        return { ...alarm, isActive: false };
      }
      return alarm;
    });
    saveAlarms();
    renderAlarms();
  }
  activeRingingAlarmId = null;
}

function snoozeAlarm() {
  if (activeRingingAlarmId && activeRingingAlarmId !== 'timer') {
    const ringingAlarm = alarms.find(a => a.id === activeRingingAlarmId);
    if (!ringingAlarm) return;

    let [hh, mm] = ringingAlarm.time.split(':').map(Number);
    let ampm = ringingAlarm.ampm;

    mm += 5;

    if (mm >= 60) {
      mm -= 60;
      hh += 1;
      if (hh === 12) { ampm = ampm === 'AM' ? 'PM' : 'AM'; }
      if (hh > 12) { hh = 1; }
    }

    const newTimeString = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;

    alarms.push({
      id: Date.now().toString(),
      time: newTimeString,
      ampm: ampm,
      isActive: true,
      isSnoozed: true
    });

    saveAlarms();
    renderAlarms();
  }
  stopAlarm();
}

btnSetAlarm.addEventListener('click', () => {
  let h = parseInt(hourInput.value);
  let m = parseInt(minuteInput.value);

  if (isNaN(h) || isNaN(m)) { alert("Please enter valid hour and minute."); return; }
  if (h < 1 || h > 12) { alert("Hour must be between 1 and 12"); return; }
  if (m < 0 || m > 59) { alert("Minute must be between 0 and 59"); return; }

  const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  if (alarms.some(a => a.time === timeString && a.ampm === selectedPeriod)) {
    alert("This alarm is already set.");
    return;
  }

  alarms.push({ id: Date.now().toString(), time: timeString, ampm: selectedPeriod, isActive: true });
  hourInput.value = ''; minuteInput.value = '';
  saveAlarms(); renderAlarms();
});

function renderAlarms() {
  alarmListContainer.innerHTML = '';
  const activeAlarms = alarms.filter(a => a.isActive).length;
  activeCountTxt.textContent = `${activeAlarms} ENABLED`;

  if (alarms.length === 0) {
    alarmListContainer.innerHTML = '<p class="text-on-surface-variant font-body py-4 text-center">No active alarms. Use the tool above to add some.</p>';
    return;
  }

  const sortedAlarms = [...alarms].sort((a, b) => {
    let aVal = (a.ampm === 'PM' ? 1200 : 0) + (parseInt(a.time.substring(0, 2)) % 12) * 100 + parseInt(a.time.substring(3, 5));
    let bVal = (b.ampm === 'PM' ? 1200 : 0) + (parseInt(b.time.substring(0, 2)) % 12) * 100 + parseInt(b.time.substring(3, 5));
    return aVal - bVal;
  });

  sortedAlarms.forEach((alarm) => {
    const div = document.createElement('div');
    const bgClass = alarm.isActive ? 'bg-surface-container' : 'bg-[#1b0933] opacity-60';
    div.className = `group ${bgClass} rounded-lg p-6 flex items-center justify-between hover:bg-secondary-container transition-all border border-outline-variant/10 cursor-pointer`;
    div.innerHTML = `
      <div class="flex flex-col">
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-display font-medium text-on-surface" style="color: ${alarm.isActive ? 'inherit' : '#806d98'}">${alarm.time}</span>
          <span class="text-xs font-label text-on-surface-variant uppercase">${alarm.ampm}</span>
          ${alarm.isSnoozed ? `<span class="bg-secondary-container text-xs px-2 py-1 rounded ml-2 text-on-surface">Snoozed</span>` : ''}
        </div>
        <span class="text-xs font-label text-on-surface-variant mt-1 group-hover:text-on-secondary-container transition-colors">${alarm.isActive ? 'Active' : 'Disabled'} • ${alarm.ampm === 'AM' ? 'Morning' : 'Evening'}</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-12 h-6 ${alarm.isActive ? 'bg-primary' : 'bg-surface-variant'} rounded-full relative p-1 flex items-center ${alarm.isActive ? 'justify-end' : 'justify-start'} cursor-pointer" onclick="toggleActive('${alarm.id}')">
          <div class="w-4 h-4 ${alarm.isActive ? 'bg-on-primary' : 'bg-on-surface-variant'} rounded-full shadow-sm"></div>
        </div>
        <button onclick="deleteAlarm('${alarm.id}')" class="p-2 rounded-full text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-container/20">
          <span class="material-symbols-outlined" data-icon="delete">delete</span>
        </button>
      </div>
    `;
    alarmListContainer.appendChild(div);
  });
}

window.toggleActive = function (id) {
  alarms = alarms.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a);
  saveAlarms(); renderAlarms();
}

window.deleteAlarm = function (id) {
  alarms = alarms.filter(a => a.id !== id);
  saveAlarms(); renderAlarms();
}

function saveAlarms() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

// -------------- WORLD CLOCK LOGIC --------------
btnAddWorldClock.addEventListener('click', () => {
  const tz = worldClockTimezoneInput.value;
  const opt = worldClockTimezoneInput.options[worldClockTimezoneInput.selectedIndex];
  const label = opt.text.split(' (')[0];

  if (worldClocks.some(wc => wc.timezone === tz)) {
    alert("City already added.");
    return;
  }

  worldClocks.push({ id: Date.now().toString(), timezone: tz, label: label });
  saveWorldClocks();
  renderWorldClocks();
});

function saveWorldClocks() {
  localStorage.setItem('worldClocks', JSON.stringify(worldClocks));
}

function renderWorldClocks() {
  worldClockListContainer.innerHTML = '';
  worldClockCountTxt.textContent = `${worldClocks.length} ADDED`;

  if (worldClocks.length === 0) {
    worldClockListContainer.innerHTML = '<p class="text-on-surface-variant font-body py-4 text-center">No world clocks added. Use the tool above to add some.</p>';
    return;
  }

  worldClocks.forEach((wc) => {
    const div = document.createElement('div');
    div.className = `group bg-surface-container rounded-lg p-6 flex items-center justify-between hover:bg-secondary-container transition-all border border-outline-variant/10 cursor-pointer`;
    div.innerHTML = `
      <div class="flex flex-col flex-1">
        <h4 class="text-lg font-headline font-semibold text-on-surface">${wc.label}</h4>
        <span class="text-xs font-label text-on-surface-variant mt-1 wc-date" data-tz="${wc.timezone}">--</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex flex-col items-end mr-2">
          <div class="flex items-baseline gap-1">
            <span class="text-3xl font-display font-bold text-on-surface wc-time" data-tz="${wc.timezone}">--:--</span>
            <span class="text-xs font-label text-on-surface-variant uppercase wc-ampm" data-tz="${wc.timezone}">--</span>
          </div>
        </div>
        <button onclick="deleteWorldClock('${wc.id}')" class="p-2 rounded-full text-error opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error-container/20">
          <span class="material-symbols-outlined" data-icon="delete">delete</span>
        </button>
      </div>
    `;
    worldClockListContainer.appendChild(div);
  });

  updateWorldClocksDisplay();
}

window.deleteWorldClock = function (id) {
  worldClocks = worldClocks.filter(wc => wc.id !== id);
  saveWorldClocks();
  renderWorldClocks();
}

// -------------- TIMER LOGIC --------------
btnTimerPlay.addEventListener('click', () => {
  if (isTimerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

btnTimerReset.addEventListener('click', resetTimer);

function startTimer() {
  if (timerTotalSeconds <= 0 && !isTimerRunning) {
    // Read from inputs
    let m = parseInt(timerMinInput.value) || 0;
    let s = parseInt(timerSecInput.value) || 0;
    timerTotalSeconds = (m * 60) + s;
    if (timerTotalSeconds <= 0) return; // Cannot start 0 timer
  }

  isTimerRunning = true;
  timerSetup.classList.add('hidden');
  timerSetup.classList.remove('flex');
  timerRunning.classList.remove('hidden');
  timerRunning.classList.add('flex');

  timerPlayIcon.textContent = 'pause';
  timerPlayText.textContent = 'Pause';
  btnTimerPlay.classList.add('from-[#5b2d94]', 'to-[#230e3c]');

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timerTotalSeconds--;
    if (timerTotalSeconds <= 0) {
      clearInterval(timerInterval);
      timerTotalSeconds = 0;
      isTimerRunning = false;
      triggerAlarm(null, 'Timer Finished');
      resetTimer(); // resets ui
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerPlayIcon.textContent = 'play_arrow';
  timerPlayText.textContent = 'Resume';
  btnTimerPlay.classList.remove('from-[#5b2d94]', 'to-[#230e3c]');
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerTotalSeconds = 0;

  timerRunning.classList.add('hidden');
  timerRunning.classList.remove('flex');
  timerSetup.classList.add('flex');
  timerSetup.classList.remove('hidden');

  timerPlayIcon.textContent = 'play_arrow';
  timerPlayText.textContent = 'Start';
  btnTimerPlay.classList.remove('from-[#5b2d94]', 'to-[#230e3c]');
}

function updateTimerDisplay() {
  let m = Math.floor(timerTotalSeconds / 60);
  let s = timerTotalSeconds % 60;
  timerDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Global UI Handles
btnStopAlarm.addEventListener('click', stopAlarm);
btnSnooze.addEventListener('click', snoozeAlarm);

// Theme Toggle
function loadThemePreference() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light'); document.documentElement.classList.remove('dark');
    themeIcon.textContent = 'dark_mode';
  } else {
    document.documentElement.classList.add('dark'); document.documentElement.classList.remove('light');
    themeIcon.textContent = 'light_mode';
  }
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark'); document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light'); themeIcon.textContent = 'dark_mode';
  } else {
    document.documentElement.classList.add('dark'); document.documentElement.classList.remove('light');
    localStorage.setItem('theme', 'dark'); themeIcon.textContent = 'light_mode';
  }
});

// Fire up
init();
