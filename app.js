const storageKey = 'picoPlacaLastDigit';
const millisecondsPerDay = 24 * 60 * 60 * 1000;
const anchorDate = new Date(2026, 8, 21);

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
const changePlateButton = document.getElementById('change-plate-btn');

let currentSpeechText = '';
let hasUserInteracted = false;

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

  for (let dayOffset = 0; dayOffset < 42; dayOffset += 1) {
    if (isPlateRestrictedOnDate(digit, candidateDate)) {
      return new Date(candidateDate);
    }

    candidateDate.setDate(candidateDate.getDate() + 1);
  }

  return null;
}

function formatDateInSpanish(date, includeYear = false) {
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  return includeYear ? `${day} de ${month} de ${date.getFullYear()}` : `${day} de ${month}`;
}

function buildStatus(digit, date = new Date()) {
  if (isCarFreeDay(date)) {
    return {
      isRestricted: true,
      message: 'Día sin carro ni moto.',
      details: 'La restricción aplica para todos los dígitos de placa.',
      speechText: 'Hoy es Día sin carro ni moto.'
    };
  }

  if (isPlateRestrictedOnDate(digit, date)) {
    return {
      isRestricted: true,
      message: 'Hoy tienes pico y placa.',
      details: 'No olvides verificar los horarios oficiales vigentes.',
      speechText: 'Hoy es tu día de pico y placa.'
    };
  }

  const nextDate = findNextRestrictionDate(digit, date);
  const formattedDate = nextDate ? formatDateInSpanish(nextDate) : '';

  return {
    isRestricted: false,
    message: 'Hoy no tienes pico y placa.',
    details: nextDate ? `Tu próximo día de pico y placa es el ${formatDateInSpanish(nextDate, true)}.` : '',
    speechText: nextDate ? `Tu próximo día de pico y placa es el ${formattedDate}.` : 'Hoy no tienes pico y placa.'
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
  if (!hasUserInteracted) {
    listenStatusButton.classList.remove('hidden');
    return;
  }

  speakStatus();
  listenStatusButton.classList.remove('hidden');
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
  dashboardScreen.classList.remove('hidden');
  selectedDigitDisplay.textContent = String(digit);
  resultMessage.textContent = status.message;
  resultMessage.classList.toggle('restricted', status.isRestricted);
  resultMessage.classList.toggle('free', !status.isRestricted);
  nextRestrictionMessage.textContent = status.details;
  currentSpeechText = status.speechText;

  if (shouldTrySpeech) {
    tryAutomaticSpeech();
  } else {
    listenStatusButton.classList.remove('hidden');
  }
}

function resetPlateSelection() {
  window.speechSynthesis?.cancel();
  localStorage.removeItem(storageKey);
  dashboardScreen.classList.add('hidden');
  selectionScreen.classList.remove('hidden');
  listenStatusButton.classList.add('hidden');
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

changePlateButton.addEventListener('click', resetPlateSelection);

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    getPreferredSpanishVoice();
  };
}

initializeApp();
