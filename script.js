// DOM Elements
const timeDisplay = document.getElementById('time');
const ampmDisplay = document.getElementById('ampm');
const dateDisplay = document.getElementById('date');

const hourInput = document.getElementById('alarm-hour');
const minuteInput = document.getElementById('alarm-minute');
const btnAm = document.getElementById('btn-am');
const btnPm = document.getElementById('btn-pm');

const btnSetAlarm = document.getElementById('btn-set-alarm');
const alarmListContainer = document.getElementById('alarm-list-container');
const activeCountTxt = document.getElementById('active-count');

const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

const ringingOverlay = document.getElementById('ringing-overlay');
const ringingTimeTxt = document.getElementById('ringing-time');
const btnStopAlarm = document.getElementById('btn-stop-alarm');
const btnSnooze = document.getElementById('btn-snooze');
const alarmSound = document.getElementById('alarm-sound');

// App State
let alarms = JSON.parse(localStorage.getItem('alarms')) || [];
let activeRingingAlarmId = null;
let selectedPeriod = 'AM';

// Initialization
function init() {
  loadThemePreference();
  setInterval(updateClock, 1000);
  updateClock();
  renderAlarms();
}

// Period Toggle
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

// Update the Clock Real-Time
function updateClock() {
  const now = new Date();
  
  // Format Date (WEDNESDAY, OCTOBER 25)
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  dateDisplay.textContent = now.toLocaleDateString('en-US', options).toUpperCase();

  // Format Time
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  let ampm = hours >= 12 ? 'PM' : 'AM';

  // Convert to 12-hour format
  hours = hours % 12 || 12;

  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  timeDisplay.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  ampmDisplay.textContent = ampm;

  // Check Alarms exactly on round seconds
  if(seconds === 0) {
    checkAlarms(`${formattedHours}:${formattedMinutes}`, ampm);
  }
}

// Check if current time matches
function checkAlarms(currentTimeString, currentAMPM) {
  alarms.forEach(alarm => {
    if (alarm.isActive && alarm.time === currentTimeString && alarm.ampm === currentAMPM) {
      triggerAlarm(alarm);
    }
  });
}

function triggerAlarm(alarm) {
  activeRingingAlarmId = alarm.id;
  ringingTimeTxt.textContent = `${alarm.time} ${alarm.ampm}`;
  ringingOverlay.classList.add('active');
  alarmSound.currentTime = 0;
  
  let playPromise = alarmSound.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.log("Autoplay prevented:", error);
    });
  }
}

// Stop Ringing Alarm
function stopAlarm() {
  ringingOverlay.classList.remove('active');
  alarmSound.pause();
  alarmSound.currentTime = 0;
  
  if (activeRingingAlarmId) {
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

// Snooze functionality (+5 mins)
function snoozeAlarm() {
  if (activeRingingAlarmId) {
    const ringingAlarm = alarms.find(a => a.id === activeRingingAlarmId);
    if (!ringingAlarm) return;

    let [hh, mm] = ringingAlarm.time.split(':').map(Number);
    let ampm = ringingAlarm.ampm;

    mm += 5; // Add 5 minutes

    if (mm >= 60) {
      mm -= 60;
      hh += 1;
      if (hh === 12) {
        ampm = ampm === 'AM' ? 'PM' : 'AM';
      }
      if (hh > 12) {
        hh = 1;
      }
    }

    const newTimeString = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    
    // Create explicitly the snoozed version as a true alarm
    const snoozeObj = {
      id: Date.now().toString(),
      time: newTimeString,
      ampm: ampm,
      isActive: true,
      isSnoozed: true
    };

    alarms.push(snoozeObj);
    saveAlarms();
    renderAlarms();
  }
  stopAlarm(); 
}

// Add New Alarm
btnSetAlarm.addEventListener('click', () => {
  let h = parseInt(hourInput.value);
  let m = parseInt(minuteInput.value);

  if (isNaN(h) || isNaN(m)) {
    alert("Please enter valid hour and minute.");
    return;
  }
  
  if (h < 1 || h > 12) { alert("Hour must be between 1 and 12"); return; }
  if (m < 0 || m > 59) { alert("Minute must be between 0 and 59"); return; }

  const formattedH = h.toString().padStart(2, '0');
  const formattedM = m.toString().padStart(2, '0');
  const timeString = `${formattedH}:${formattedM}`;
  
  // Avoid duplicate alarms
  if (alarms.some(a => a.time === timeString && a.ampm === selectedPeriod)) {
    alert("This alarm is already set.");
    return;
  }

  const newAlarm = {
    id: Date.now().toString(),
    time: timeString,
    ampm: selectedPeriod,
    isActive: true
  };

  alarms.push(newAlarm);
  
  // Reset input fields
  hourInput.value = '';
  minuteInput.value = '';

  saveAlarms();
  renderAlarms();
});

// Render Alarms using the Stitch HTML template blocks
function renderAlarms() {
  alarmListContainer.innerHTML = '';
  
  let activeAlarms = alarms.filter(a => a.isActive).length;
  activeCountTxt.textContent = `${activeAlarms} ENABLED`;

  if (alarms.length === 0) {
    alarmListContainer.innerHTML = '<p class="text-on-surface-variant font-body">No alarms set. Add one above!</p>';
    return;
  }

  // Sort strictly by AM/PM then Time
  const sortedAlarms = [...alarms].sort((a, b) => {
    let aVal = (a.ampm === 'PM' ? 1200 : 0) + (parseInt(a.time.substring(0, 2)) % 12) * 100 + parseInt(a.time.substring(3, 5));
    let bVal = (b.ampm === 'PM' ? 1200 : 0) + (parseInt(b.time.substring(0, 2)) % 12) * 100 + parseInt(b.time.substring(3, 5));
    return aVal - bVal;
  });

  sortedAlarms.forEach((alarm) => {
    // Recreate the Stitch DOM structure for the alarm item
    const div = document.createElement('div');
    const bgClass = alarm.isActive ? 'bg-surface-container' : 'bg-[#1b0933] opacity-60'; // visually distinguish
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
        <!-- Toggle Pill purely cosmetic for visual -->
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

// Interactivity mappings for toggles and deletes
window.toggleActive = function(id) {
  alarms = alarms.map(a => {
    if(a.id === id) {
      return { ...a, isActive: !a.isActive };
    }
    return a;
  });
  saveAlarms();
  renderAlarms();
}

window.deleteAlarm = function(id) {
  alarms = alarms.filter(alarm => alarm.id !== id);
  saveAlarms();
  renderAlarms();
}

function saveAlarms() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

// Interactions for overlays
btnStopAlarm.addEventListener('click', stopAlarm);
btnSnooze.addEventListener('click', snoozeAlarm);

// Theme Toggling Functionality
function loadThemePreference() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    themeIcon.textContent = 'dark_mode';
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    themeIcon.textContent = 'light_mode';
  }
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
    themeIcon.textContent = 'dark_mode';
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    localStorage.setItem('theme', 'dark');
    themeIcon.textContent = 'light_mode';
  }
});

// Init
init();
