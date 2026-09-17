/* ==========================================================================
   Pico&Placa Pasto - Core application logic
   Handles plate-digit selection, persistence, and screen switching.
   ========================================================================== */

// Key used to persist the last plate digit in the browser
const STORAGE_KEY = 'picoPlacaLastDigit';

// DOM references
const selectionScreen = document.getElementById('selection-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const digitGrid = document.getElementById('digit-grid');
const selectedDigitDisplay = document.getElementById('selected-digit-display');
const resultMessage = document.getElementById('result-message');
const changePlateBtn = document.getElementById('change-plate-btn');

/**
 * Builds the 0-9 digit selection grid dynamically and
 * attaches a click handler to each button.
 */
function renderDigitGrid() {
  for (let digit = 0; digit <= 9; digit++) {
    const button = document.createElement('button');
    button.classList.add('digit-btn');
    button.type = 'button';
    button.textContent = digit;
    button.setAttribute('aria-label', `Seleccionar dígito ${digit}`);
    button.addEventListener('click', () => handleDigitSelection(digit));
    digitGrid.appendChild(button);
  }
}

/**
 * Saves the selected digit to localStorage and shows the dashboard.
 * @param {number} digit - The last digit of the user's license plate.
 */
function handleDigitSelection(digit) {
  localStorage.setItem(STORAGE_KEY, String(digit));
  showDashboard(digit);
}

/**
 * Removes the saved digit from localStorage and returns
 * the user to the selection screen.
 */
function handleChangePlate() {
  localStorage.removeItem(STORAGE_KEY);
  dashboardScreen.classList.add('hidden');
  selectionScreen.classList.remove('hidden');
}

/**
 * Displays the dashboard screen with the currently saved digit.
 * The actual restriction logic (day/date checking) will be added later;
 * for now this only shows a placeholder message.
 * @param {number} digit
 */
function showDashboard(digit) {
  selectionScreen.classList.add('hidden');
  dashboardScreen.classList.remove('hidden');
  selectedDigitDisplay.textContent = digit;

  // Placeholder text until the restriction-calendar logic is implemented
  resultMessage.textContent = 'Aquí se mostrará si hoy tienes restricción.';
  resultMessage.classList.remove('restricted', 'free');
}

/**
 * Checks localStorage on load. If a digit is already stored,
 * bypasses the selection screen and jumps straight to the dashboard.
 */
function initApp() {
  const savedDigit = localStorage.getItem(STORAGE_KEY);

  if (savedDigit !== null) {
    showDashboard(Number(savedDigit));
  } else {
    selectionScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
  }
}

// Event listeners
changePlateBtn.addEventListener('click', handleChangePlate);

// Bootstrap the app
renderDigitGrid();
initApp();
