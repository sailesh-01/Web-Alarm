// DOM Elements
const timeDisplay = document.getElementById('time');
const ampmDisplay = document.getElementById('ampm');
const dateDisplay = document.getElementById('date');
const hourSelect = document.getElementById('alarm-hour');
const minuteSelect = document.getElementById('alarm-minute');
const ampmSelect = document.getElementById('alarm-ampm');
const btnSetAlarm = document.getElementById('btn-set-alarm');
const alarmListContainer = document.getElementById('alarm-list');
const themeToggleBtn = document.getElementById('theme-toggle');
const darkIcon = document.querySelector('.dark-icon');
const lightIcon = document.querySelector('.light-icon');
const ringingOverlay = document.getElementById('ringing-overlay');
const ringingTimeTxt = document.getElementById('ringing-time');
const btnStopAlarm = document.getElementById('btn-stop-alarm');
const btnSnooze = document.getElementById('btn-snooze');
const alarmSound = document.getElementById('alarm-sound');

// App State
let alarms = JSON.parse(localStorage.getItem('alarms')) || [];
let activeRingingAlarmId = null;

// Initialization
function init() {
  populateSelectOptions();
  loadThemePreference();
  setInterval(updateClock, 1000);
  updateClock(); // Initial call to avoid 1sec delay
  renderAlarms();
}

// Populate Hour and Minute Dropdowns
function populateSelectOptions() {
  // Hours (1 to 12)
  for (let i = 1; i <= 12; i++) {
    const formattedVal = i.toString().padStart(2, '0');
    hourSelect.options.add(new Option(formattedVal, formattedVal));
  }
  // Minutes (00 to 59)
  for (let i = 0; i < 60; i++) {
    const formattedVal = i.toString().padStart(2, '0');
    minuteSelect.options.add(new Option(formattedVal, formattedVal));
  }
}

// Update the Clock Real-Time
function updateClock() {
  const now = new Date();
  
  // Format Date
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  dateDisplay.textContent = now.toLocaleDateString('en-US', options);

  // Format Time
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  let ampm = hours >= 12 ? 'PM' : 'AM';

  // Convert to 12-hour format
  hours = hours % 12 || 12;

  // Add leading zeros
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');

  // Inject into DOM
  timeDisplay.textContent = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  ampmDisplay.textContent = ampm;

  // Check Alarms
  checkAlarms(`${formattedHours}:${formattedMinutes}`, ampm, now.getSeconds());
}

// Ensure alarm triggers only exactly once at second 0
function checkAlarms(currentTimeString, currentAMPM, currentSeconds) {
  if (currentSeconds !== 0) return; // Only trigger exact match at the start of the minute

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

// Stop the currently ringing alarm
function stopAlarm() {
  ringingOverlay.classList.remove('active');
  alarmSound.pause();
  alarmSound.currentTime = 0;
  
  // Inactivate the alarm so it doesn't trigger again immediately
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
        // AM PM flip
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
  const h = hourSelect.value;
  const m = minuteSelect.value;
  const period = ampmSelect.value;

  if (!h || !m) {
    alert("Please select both hour and minute to set an alarm.");
    return;
  }

  const timeString = `${h}:${m}`;
  
  // Avoid duplicate alarms conceptually
  if (alarms.some(a => a.time === timeString && a.ampm === period)) {
    alert("This alarm is already set.");
    return;
  }

  const newAlarm = {
    id: Date.now().toString(),
    time: timeString,
    ampm: period,
    isActive: true
  };

  alarms.push(newAlarm);
  
  // Reset fields loosely
  hourSelect.value = '';
  minuteSelect.value = '';

  saveAlarms();
  renderAlarms();
});

// Render the Alarm List in DOM
function renderAlarms() {
  alarmListContainer.innerHTML = '';

  if (alarms.length === 0) {
    alarmListContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No alarms active.</p>';
    return;
  }

  // Sort alarms chronologically (roughly)
  const sortedAlarms = [...alarms].sort((a, b) => {
    let aVal = (a.ampm === 'PM' ? 1200 : 0) + (parseInt(a.time.substring(0, 2)) % 12) * 100 + parseInt(a.time.substring(3, 5));
    let bVal = (b.ampm === 'PM' ? 1200 : 0) + (parseInt(b.time.substring(0, 2)) % 12) * 100 + parseInt(b.time.substring(3, 5));
    return aVal - bVal;
  });

  sortedAlarms.forEach(alarm => {
    const alarmDiv = document.createElement('div');
    alarmDiv.className = 'alarm-item';
    alarmDiv.style.opacity = alarm.isActive ? '1' : '0.5';

    alarmDiv.innerHTML = `
      <div class="alarm-item-time">
        ${alarm.time} <span>${alarm.ampm}</span>
        ${alarm.isSnoozed ? '<span style="font-size: 0.75rem; background: var(--secondary-bg); padding: 2px 6px; border-radius: 4px; margin-left:8px; color:var(--on-surface)">Snoozed</span>' : ''}
      </div>
      <button class="btn-clear" onclick="deleteAlarm('${alarm.id}')" aria-label="Delete alarm">
        <span class="material-symbols-rounded">delete</span>
      </button>
    `;

    alarmListContainer.appendChild(alarmDiv);
  });
}

// Delete Alarm - globally accessible for inline onclick
window.deleteAlarm = function(id) {
  alarms = alarms.filter(alarm => alarm.id !== id);
  saveAlarms();
  renderAlarms();
}

function saveAlarms() {
  localStorage.setItem('alarms', JSON.stringify(alarms));
}

// Interactions for Overlays
btnStopAlarm.addEventListener('click', stopAlarm);
btnSnooze.addEventListener('click', snoozeAlarm);

// Theme Toggling functionality
function loadThemePreference() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    lightIcon.style.display = 'block';
    darkIcon.style.display = 'none';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    darkIcon.style.display = 'block';
    lightIcon.style.display = 'none';
  }
}

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  if (newTheme === 'dark') {
    lightIcon.style.display = 'block';
    darkIcon.style.display = 'none';
  } else {
    darkIcon.style.display = 'block';
    lightIcon.style.display = 'none';
  }
});

// Run Init
init();
