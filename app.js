const storageKey = 'picoPlacaLastDigit';
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const anchorDate = new Date(2026, 8, 21);
const supportEndDate = new Date(2026, 11, 31);

const restrictionCycles = [
  [[8, 9], [0, 1], [2, 3], [4, 5], [6, 7]],
  [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]],
  [[2, 3], [4, 5], [6, 7], [8, 9], [0, 1]],
  [[4, 5], [6, 7], [8, 9], [0, 1], [2, 3]],
  [[6, 7], [8, 9], [0, 1], [2, 3], [4, 5]]
];

const carFreeDays = new Set([
  '2026-09-24',
  '2026-12-28'
]);

const monthNames = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const selectionScreen = document.getElementById('selection-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const digitGrid = document.getElementById('digit-grid');
const selectedDigitDisplay = document.getElementById('selected-digit-display');
const resultMessage = document.getElementById('result-message');
const nextRestrictionMessage = document.getElementById('next-restriction-message');
const listenStatusButton = document.getElementById('listen-status-btn');
const addCalendarButton = document.getElementById('add-calendar-btn');
const changePlateButton = document.getElementById('change-plate-btn');
const calendarScreen = document.getElementById('calendar-screen');
const calendarDatesList = document.getElementById('calendar-dates-list');
const addCarFreeDaysButton = document.getElementById('add-carfree-btn');
const calendarBackButton = document.getElementById('calendar-back-btn');

let currentSpeechText = '';
let hasUserInteracted = false;
let currentNextRestrictionDate = null;
let currentDigit = null;

function getLocalStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateKey(date) {
  const localDate = getLocalStartOfDay(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isCarFreeDay(date) {
  return carFreeDays.has(getDateKey(date));
}

function getMondayOfWeek(date) {
  const localDate = getLocalStartOfDay(date);
  const weekDay = localDate.getDay();
  const daysSinceMonday = weekDay === 0 ? 6 : weekDay - 1;
  localDate.setDate(localDate.getDate() - daysSinceMonday);
  return localDate;
}

function getCycleIndex(date) {
  const weekStart = getMondayOfWeek(date);
  const elapsedWeeks = Math.round((weekStart - anchorDate) / (7 * millisecondsPerDay));
  return ((elapsedWeeks % restrictionCycles.length) + restrictionCycles.length) % restrictionCycles.length;
}

function getRestrictedDigits(date) {
  if (isCarFreeDay(date)) {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  }

  const weekDay = getLocalStartOfDay(date).getDay();

  if (weekDay === 0 || weekDay === 6) {
    return [];
  }

  const cycleIndex = getCycleIndex(date);
  return restrictionCycles[cycleIndex][weekDay - 1];
}

function isPlateRestrictedOnDate(digit, date) {
  return getRestrictedDigits(date).includes(Number(digit));
}

function findNextRestrictionDate(digit, startDate) {
  const candidateDate = getLocalStartOfDay(startDate);
  candidateDate.setDate(candidateDate.getDate() + 1);

  while (candidateDate <= supportEndDate) {
    if (isPlateRestrictedOnDate(digit, candidateDate)) {
      return new Date(candidateDate);
    }

    candidateDate.setDate(candidateDate.getDate() + 1);
  }

  return null;
}

const dayNames = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
];

function formatDateInSpanish(date, includeYear = false) {
  const day = date.getDate();
  const month = monthNames[date.getMonth()];

  if (includeYear) {
    const dayName = dayNames[date.getDay()];
    return `${dayName} ${day} de ${month} de ${date.getFullYear()}`;
  }

  return `${day} de ${month}`;
}

function buildStatus(digit, date = new Date()) {
  const today = getLocalStartOfDay(date);

  if (today > supportEndDate) {
    return {
      isRestricted: false,
      isOutOfRange: true,
      message: 'Calendario no disponible.',
      details: 'Esta app solo tiene datos verificados de Pico y Placa hasta el 31 de diciembre de 2026. Pídele a Alexander que actualice el calendario de restricciones.',
      speechText: 'Esta aplicación solo tiene datos hasta el 31 de diciembre de 2026. Pídele a Alexander que la actualice.',
      nextRestrictionDate: null
    };
  }

  const nextDate = findNextRestrictionDate(digit, date);

  if (isCarFreeDay(date)) {
    return {
      isRestricted: true,
      message: 'Día sin carro ni moto.',
      details: 'La restricción aplica para todos los dígitos de placa.',
      speechText: 'Hoy es Día sin carro ni moto.',
      nextRestrictionDate: nextDate
    };
  }

  if (isPlateRestrictedOnDate(digit, date)) {
    return {
      isRestricted: true,
      message: 'Hoy tienes pico y placa.',
      details: 'No olvides verificar los horarios oficiales vigentes.',
      speechText: 'Hoy es tu día de pico y placa.',
      nextRestrictionDate: nextDate
    };
  }

  if (!nextDate) {
    return {
      isRestricted: false,
      message: 'Hoy no tienes pico y placa.',
      details: '',
      speechText: 'Hoy no tienes pico y placa.',
      nextRestrictionDate: null
    };
  }

  const formattedDateWithYear = formatDateInSpanish(nextDate, true);

  if (isCarFreeDay(nextDate)) {
    return {
      isRestricted: false,
      message: 'Hoy no tienes pico y placa.',
      details: `El próximo ${formattedDateWithYear} habrá "Día sin carro ni moto" y tampoco podrás circular ese día.`,
      speechText: `El próximo ${formattedDateWithYear} habrá Día sin carro ni moto.`,
      nextRestrictionDate: nextDate
    };
  }

  return {
    isRestricted: false,
    message: 'Hoy no tienes pico y placa.',
    details: `Tu próximo día de pico y placa es el ${formattedDateWithYear}.`,
    speechText: `Tu próximo día de pico y placa es el ${formattedDateWithYear}.`,
    nextRestrictionDate: nextDate
  };
}

function getPreferredSpanishVoice() {
  const voices = window.speechSynthesis.getVoices();
  const preferredLanguages = ['es-CO', 'es-419', 'es-ES'];

  for (const language of preferredLanguages) {
    const voice = voices.find((item) => item.lang.toLowerCase() === language.toLowerCase());
    if (voice) {
      return voice;
    }
  }

  return voices.find((item) => item.lang.toLowerCase().startsWith('es')) || null;
}

function speakStatus() {
  if (!currentSpeechText || !('speechSynthesis' in window)) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(currentSpeechText);
  const voice = getPreferredSpanishVoice();
  utterance.lang = voice ? voice.lang : 'es-CO';
  utterance.rate = 1;
  utterance.volume = 1;

  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
  return true;
}

function tryAutomaticSpeech() {
  speakStatus();
  listenStatusButton.classList.remove('hidden');
}

function toGoogleCalendarUtc(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function getUpcomingRestrictionDates(digit) {
  const dates = [];
  const candidateDate = getLocalStartOfDay(new Date());
  candidateDate.setDate(candidateDate.getDate() + 1);

  while (candidateDate <= supportEndDate) {
    if (isPlateRestrictedOnDate(digit, candidateDate)) {
      dates.push(new Date(candidateDate));
    }

    candidateDate.setDate(candidateDate.getDate() + 1);
  }

  return dates;
}

function buildSingleEventGoogleCalendarUrl(date) {
  const startLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0, 0);
  const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Día sin carro ni moto - Pasto',
    dates: `${toGoogleCalendarUtc(startLocal)}/${toGoogleCalendarUtc(endLocal)}`,
    details: 'Jornada de Día sin carro ni moto en Pasto, Nariño. Verifica siempre las fuentes oficiales vigentes.',
    location: 'Pasto, Nariño, Colombia'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildWeekdayRecurringGoogleCalendarUrl(firstDate) {
  const startLocal = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), 7, 0, 0);
  const endLocal = new Date(startLocal.getTime() + 60 * 60 * 1000);
  const recurrenceUntil = new Date(
    supportEndDate.getFullYear(), supportEndDate.getMonth(), supportEndDate.getDate(), 23, 59, 59
  );

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Pico y Placa Pasto',
    dates: `${toGoogleCalendarUtc(startLocal)}/${toGoogleCalendarUtc(endLocal)}`,
    details: 'Recordatorio de restricción de Pico y Placa en Pasto, Nariño. Verifica siempre las fuentes oficiales vigentes.',
    location: 'Pasto, Nariño, Colombia',
    recur: `RRULE:FREQ=WEEKLY;INTERVAL=5;UNTIL=${toGoogleCalendarUtc(recurrenceUntil)}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getUpcomingRestrictionsByWeekday(digit) {
  const dates = getUpcomingRestrictionDates(digit).filter((date) => !isCarFreeDay(date));
  const firstDateByWeekday = new Map();

  dates.forEach((date) => {
    const weekday = date.getDay();
    if (!firstDateByWeekday.has(weekday)) {
      firstDateByWeekday.set(weekday, date);
    }
  });

  return Array.from(firstDateByWeekday.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([weekday, firstDate]) => ({ weekday, firstDate }));
}

function getUpcomingCarFreeDays() {
  const today = getLocalStartOfDay(new Date());

  return Array.from(carFreeDays)
    .map((key) => {
      const [year, month, day] = key.split('-').map(Number);
      return new Date(year, month - 1, day);
    })
    .filter((date) => date >= today && date <= supportEndDate)
    .sort((a, b) => a - b);
}

function renderCalendarDatesList(digit) {
  const weekdayGroups = getUpcomingRestrictionsByWeekday(digit);
  calendarDatesList.innerHTML = '';

  if (weekdayGroups.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'calendar-empty';
    emptyMessage.textContent = 'No hay más fechas de restricción registradas hasta el 31 de diciembre de 2026.';
    calendarDatesList.appendChild(emptyMessage);
    return;
  }

  weekdayGroups.forEach(({ weekday, firstDate }) => {
    const item = document.createElement('div');
    item.className = 'calendar-date-item';

    const label = document.createElement('span');
    label.className = 'calendar-date-label';
    label.textContent = `Todos los ${dayNames[weekday]} (próximo: ${formatDateInSpanish(firstDate, true)})`;

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'calendar-date-add-btn';
    addButton.textContent = 'Añadir';
    addButton.addEventListener('click', () => {
      window.open(buildWeekdayRecurringGoogleCalendarUrl(firstDate), '_blank', 'noopener');
    });

    item.appendChild(label);
    item.appendChild(addButton);
    calendarDatesList.appendChild(item);
  });
}

function showCalendarScreen() {
  if (currentDigit === null) {
    return;
  }

  renderCalendarDatesList(currentDigit);
  dashboardScreen.classList.add('hidden');
  calendarScreen.classList.remove('hidden');
}

function hideCalendarScreen() {
  calendarScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
}

function renderDigitGrid() {
  for (let digit = 0; digit <= 9; digit += 1) {
    const digitButton = document.createElement('button');
    digitButton.className = 'digit-button';
    digitButton.type = 'button';
    digitButton.textContent = String(digit);
    digitButton.setAttribute('aria-label', `Seleccionar dígito ${digit}`);
    digitButton.addEventListener('click', () => {
      hasUserInteracted = true;
      selectPlateDigit(digit);
    });
    digitGrid.appendChild(digitButton);
  }
}

function selectPlateDigit(digit) {
  localStorage.setItem(storageKey, String(digit));
  showDashboard(digit, true);
}

function showDashboard(digit, shouldTrySpeech = false) {
  const status = buildStatus(digit);

  selectionScreen.classList.add('hidden');
  calendarScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  selectedDigitDisplay.textContent = String(digit);
  resultMessage.textContent = status.message;
  resultMessage.classList.toggle('restricted', status.isRestricted);
  resultMessage.classList.toggle('free', !status.isRestricted);
  nextRestrictionMessage.textContent = status.details;
  currentSpeechText = status.speechText;
  currentNextRestrictionDate = status.nextRestrictionDate;
  currentDigit = digit;
  addCalendarButton.classList.toggle('hidden', Boolean(status.isOutOfRange));

  if (shouldTrySpeech) {
    tryAutomaticSpeech();
  } else {
    listenStatusButton.classList.remove('hidden');
  }
}

function resetPlateSelection() {
  window.speechSynthesis?.cancel();
  localStorage.removeItem(storageKey);
  currentDigit = null;
  dashboardScreen.classList.add('hidden');
  calendarScreen.classList.add('hidden');
  selectionScreen.classList.remove('hidden');
  listenStatusButton.classList.add('hidden');
  addCalendarButton.classList.add('hidden');
}

function initializeApp() {
  const savedDigit = localStorage.getItem(storageKey);
  renderDigitGrid();

  if (savedDigit !== null && /^[0-9]$/.test(savedDigit)) {
    showDashboard(Number(savedDigit), true);
    return;
  }

  selectionScreen.classList.remove('hidden');
  dashboardScreen.classList.add('hidden');
}

listenStatusButton.addEventListener('click', () => {
  hasUserInteracted = true;
  speakStatus();
});

addCalendarButton.addEventListener('click', () => {
  showCalendarScreen();
});

addCarFreeDaysButton.addEventListener('click', () => {
  getUpcomingCarFreeDays().forEach((date) => {
    window.open(buildSingleEventGoogleCalendarUrl(date), '_blank', 'noopener');
  });
});

calendarBackButton.addEventListener('click', () => {
  hideCalendarScreen();
});

changePlateButton.addEventListener('click', resetPlateSelection);

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    getPreferredSpanishVoice();
  };
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('No se pudo registrar el Service Worker:', error);
    });
  });
}

initializeApp();
