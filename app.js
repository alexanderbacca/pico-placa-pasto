const storageKey = 'picoPlacaLastDigit';

const selectionScreen = document.getElementById('selection-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const digitGrid = document.getElementById('digit-grid');
const selectedDigitDisplay = document.getElementById('selected-digit-display');
const resultMessage = document.getElementById('result-message');
const changePlateButton = document.getElementById('change-plate-btn');

function renderDigitGrid() {
  for (let digit = 0; digit <= 9; digit += 1) {
    const digitButton = document.createElement('button');
    digitButton.className = 'digit-button';
    digitButton.type = 'button';
    digitButton.textContent = String(digit);
    digitButton.setAttribute('aria-label', `Seleccionar dígito ${digit}`);
    digitButton.addEventListener('click', () => selectPlateDigit(digit));
    digitGrid.appendChild(digitButton);
  }
}

function selectPlateDigit(digit) {
  localStorage.setItem(storageKey, String(digit));
  showDashboard(digit);
}

function showDashboard(digit) {
  selectionScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  selectedDigitDisplay.textContent = String(digit);
  resultMessage.textContent = 'Aquí se mostrará si hoy tienes restricción.';
}

function resetPlateSelection() {
  localStorage.removeItem(storageKey);
  dashboardScreen.classList.add('hidden');
  selectionScreen.classList.remove('hidden');
}

function initializeApp() {
  const savedDigit = localStorage.getItem(storageKey);
  renderDigitGrid();

  if (savedDigit !== null && /^[0-9]$/.test(savedDigit)) {
    showDashboard(Number(savedDigit));
    return;
  }

  selectionScreen.classList.remove('hidden');
  dashboardScreen.classList.add('hidden');
}

changePlateButton.addEventListener('click', resetPlateSelection);
initializeApp();
