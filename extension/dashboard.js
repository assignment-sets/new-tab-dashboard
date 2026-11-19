import { attachActions } from './item-actions.js';
import { normalizePin, PinValidationError } from './pins.js';
import { dayPeriod as getDayPeriod } from './day-period.js';
import { drawPixelText } from './pixel-text.js';

const date = document.querySelector('#clock-date');
const dayPeriodLabel = document.querySelector('#clock-day-period');
const weekDays = document.querySelectorAll('.week-days > span');
const time = document.querySelector('#clock-time');
const yearLabel = document.querySelector('#clock-year');
const yearRow = document.querySelector('#year-row');
const yearMonths = document.querySelector('#year-months');
const yearPercent = document.querySelector('#year-percent');
const week = document.querySelector('#clock-week');
const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', month: 'long', day: 'numeric',
});
const readable = document.querySelector('#clock-readable');
const digits = document.querySelector('#clock-digits');
const period = document.querySelector('#clock-period');
const networkStatus = document.querySelector('#network-status');
function drawDigits(value) {
  drawPixelText(digits, value, getComputedStyle(time).color);
}

const dayLength = 24 * 60 * 60 * 1000;

function isoWeek(day) {
  // The ISO week belongs to the year that contains its Thursday.
  const thursday = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 3 - (day.getDay() + 6) % 7);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  return 1 + Math.round(((thursday - firstThursday) / dayLength - 3 + (firstThursday.getDay() + 6) % 7) / 7);
}

// Twelve 4-pixel month blocks; the current month fills column by column.
function drawYear(now) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthDays = new Date(year, month + 1, 0).getDate();
  const dayOfYear = Math.round((new Date(year, month, now.getDate()) - new Date(year, 0, 1)) / dayLength) + 1;
  const yearDays = Math.round((new Date(year + 1, 0, 1) - new Date(year, 0, 1)) / dayLength);
  const filledColumns = month * 4 + Math.round(now.getDate() / monthDays * 4);
  yearMonths.width = 12 * 5 - 1;
  const context = yearMonths.getContext('2d');
  context.fillStyle = getComputedStyle(yearMonths).color;
  for (let column = 0; column < 48; column++) {
    context.globalAlpha = column < filledColumns ? 1 : 0.28;
    context.fillRect(column + Math.floor(column / 4), 0, 1, 2);
  }
  const percent = Math.floor(dayOfYear / yearDays * 100);
  yearPercent.textContent = `${percent}%`;
  week.textContent = `W${isoWeek(now)}`;
  yearRow.title = `Day ${dayOfYear} of ${yearDays} · ${percent}% of ${year} · ISO week ${isoWeek(now)}`;
}

function updateClock() {
  const now = new Date();
  const formattedDate = dateFormat.format(now);
  const hours = now.getHours();
  const currentDayPeriod = getDayPeriod(now);
  if (dayPeriodLabel.textContent !== currentDayPeriod) {
    dayPeriodLabel.textContent = currentDayPeriod;
  }
  const value = (hours % 12 || 12) + ':' + String(now.getMinutes()).padStart(2, '0');
  const dayPeriod = hours < 12 ? 'AM' : 'PM';
  const formattedTime = value + ' ' + dayPeriod;
  if (date.textContent !== formattedDate) {
    date.textContent = formattedDate;
    const year = now.getFullYear();
    yearLabel.textContent = year;
    drawYear(now);
    const mondayFirstIndex = (now.getDay() + 6) % 7;
    weekDays.forEach((dot, index) => {
      dot.classList.toggle('today', index === mondayFirstIndex);
      dot.classList.toggle('past', index < mondayFirstIndex);
    });
  }
  if (readable.textContent !== formattedTime) {
    drawDigits(value);
    period.textContent = dayPeriod;
    readable.textContent = formattedTime;
  }
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  date.dateTime = `${now.getFullYear()}-${month}-${day}`;
  time.dateTime = now.toTimeString().slice(0, 5);
}

function updateNetworkStatus() {
  if (networkStatus) networkStatus.hidden = typeof navigator !== 'undefined' ? navigator.onLine : true;
}

updateClock();
updateNetworkStatus();
setInterval(updateClock, 1000);
if (typeof window !== 'undefined') {
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateClock();
    updateNetworkStatus();
  }
});

const add = document.querySelector('#add-pin');
const form = document.querySelector('#pin-form');
const dialog = form.closest('dialog');
const dialogError = document.querySelector('#pin-dialog-error');
const url = form.elements.namedItem('url');
const label = form.elements.namedItem('label');
const submit = form.querySelector('[type="submit"]');
const cancel = document.querySelector('#cancel-pin');
const list = document.querySelector('#pin-list');
const empty = document.querySelector('#pin-empty');
const error = document.querySelector('#pin-error');

let pins = [];
let draggedId;
let destination;
let editingId = null;
let saving = false;
let refreshVersion = 0;

function showError(message) {
  const target = dialog.open ? dialogError : error;
  target.textContent = message;
  target.hidden = !message;
}

function openForm(pin = null) {
  if (saving) return;
  editingId = pin?.id ?? null;
  url.value = pin?.url ?? '';
  label.value = pin?.label ?? '';
  submit.textContent = pin ? 'Save changes' : 'Save pin';
  document.querySelector('#pin-dialog-title').textContent = pin ? 'Edit pin' : 'Add pin';
  dialog.showModal();
  showError('');
  url.focus();
}

dialog.addEventListener('cancel', event => {
  if (saving) event.preventDefault();
});
dialog.addEventListener('close', () => {
  const link = [...list.querySelectorAll('.pin-link')].find(link => link.dataset.pinId === editingId);
  if (document.activeElement === document.body || !link) (link ?? add).focus({ preventScroll: true });
  editingId = null;
});

async function save(action) {
  if (saving) return false;
  saving = true;
  showError('');
  try {
    const result = await chrome.runtime.sendMessage({ kind: 'pin-action', action });
    if (result?.ok) return true;
    showError(result?.error ?? 'Couldn’t save the pin change. Try again.');
    return false;
  } catch {
    showError('Couldn’t save the pin change. Try again.');
    return false;
  } finally {
    saving = false;
  }
}

function renderPin(pin, index) {
  const row = document.createElement('li');
  const link = document.createElement('a');
  const mark = document.createElement('span');
  const title = document.createElement('span');
  link.className = 'pin-link';
  link.href = pin.url;
  link.referrerPolicy = 'no-referrer';
  link.title = pin.label + '\n' + pin.url;
  link.dataset.pinId = pin.id;
  link.dataset.control = 'link';
  mark.className = 'pin-mark';
  mark.textContent = Array.from(pin.label)[0].toLocaleUpperCase();
  mark.setAttribute('aria-hidden', 'true');
  const icon = document.createElement('img');
  icon.className = 'pin-icon';
  icon.alt = '';
  icon.width = 24;
  icon.height = 24;
  icon.referrerPolicy = 'no-referrer';
  icon.addEventListener('load', () => mark.replaceChildren(icon), { once: true });
  // Keep the letter visible until the site's favicon loads successfully.
  icon.src = new URL('/favicon.ico', pin.url).href;
  title.className = 'pin-label';
  title.textContent = pin.label;
  link.append(mark, title);
  row.append(link);

  attachActions(row, link, pin.label, [
    { label: 'Edit', run: () => openForm(pin) },
    { label: 'Remove', run: async () => {
      await save({ type: 'remove', id: pin.id });
    } },
    { label: 'Move earlier', disabled: index === 0, run: () => save({ type: 'move', id: pin.id, direction: -1 }) },
    { label: 'Move later', disabled: index === pins.length - 1, run: () => save({ type: 'move', id: pin.id, direction: 1 }) },
  ]);
  icon.draggable = false;
  link.addEventListener('dragstart', event => {
    draggedId = pin.id;
    event.dataTransfer.clearData();
    event.dataTransfer.setData('application/x-tab-tasks-pin', pin.id);
    event.dataTransfer.effectAllowed = 'move';
  });
  return row;
}

function render() {
  const { pinId, control } = document.activeElement.dataset;
  const hasPins = pins.length > 0;
  list.hidden = !hasPins;
  empty.hidden = hasPins;
  empty.textContent = 'Add a site you visit often.';
  const rows = document.createDocumentFragment();
  for (const [index, pin] of pins.entries()) rows.append(renderPin(pin, index));
  clearMarker();
  list.replaceChildren(rows);

  if (pinId) {
    const controls = [...list.querySelectorAll('[data-pin-id]')]
      .filter(element => element.dataset.pinId === pinId && !element.disabled);
    const match = controls.find(element => element.dataset.control === control);
    (match ?? add).focus({ preventScroll: true });
  }
}

async function refresh() {
  const version = ++refreshVersion;
  try {
    const { pins: stored = [] } = await chrome.storage.local.get('pins');
    if (version !== refreshVersion) return;
    pins = stored;
    add.disabled = false;
    render();
  } catch {
    if (version !== refreshVersion) return;
    empty.hidden = true;
    showError('Couldn’t load pins. Open this tab again to retry.');
  }
}

add.addEventListener('click', () => openForm());
function clearMarker() {
  list.removeAttribute('data-drop');
  destination = null;
}

function dropPosition(event) {
  const rows = [...list.children];
  // In gaps, choose the nearest row vertically, then the nearest tile horizontally.
  let closest;
  let vertical = Infinity;
  let horizontal = Infinity;
  for (const row of rows) {
    const rect = row.getBoundingClientRect();
    const dy = Math.max(rect.top - event.clientY, event.clientY - rect.bottom, 0);
    const dx = Math.max(rect.left - event.clientX, event.clientX - rect.right, 0);
    if (dy < vertical || (dy === vertical && dx < horizontal)) {
      closest = row;
      vertical = dy;
      horizontal = dx;
    }
  }
  if (!closest) return;
  const rect = closest.getBoundingClientRect();
  const gap = rows.indexOf(closest) + (event.clientX >= rect.left + rect.width / 2 ? 1 : 0);
  const source = pins.findIndex(pin => pin.id === draggedId);
  if (source < 0 || gap === source || gap === source + 1) return;
  const after = gap === rows.length;
  const index = after ? gap - 1 : gap;
  const row = rows[index];
  return { neighborId: pins[index].id, after, row };
}

list.addEventListener('dragover', event => {
  if (!draggedId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const position = dropPosition(event);
  if (!position) return clearMarker();
  const { row, after, neighborId } = position;
  destination = { neighborId, after };
  const inset = row.offsetLeft === 0 || after ? 0 : parseFloat(getComputedStyle(list).columnGap) / 2;
  list.style.setProperty('--drop-x', (row.offsetLeft + (after ? row.offsetWidth : -inset)) + 'px');
  list.style.setProperty('--drop-y', row.offsetTop + 'px');
  list.style.setProperty('--drop-height', row.offsetHeight + 'px');
  list.setAttribute('data-drop', '');
});
list.addEventListener('dragleave', event => {
  if (!list.contains(event.relatedTarget)) clearMarker();
});
list.addEventListener('drop', event => {
  if (!draggedId) return;
  event.preventDefault();
  if (destination) void save({ type: 'place', id: draggedId, ...destination });
  draggedId = null;
  clearMarker();
});
document.addEventListener('dragend', () => {
  draggedId = null;
  clearMarker();
});
cancel.addEventListener('click', () => {
  if (saving) return;
  showError('');
  dialog.close();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving) return;

  let pin;
  try {
    pin = normalizePin(url.value, label.value, pins.find(pin => pin.id === editingId)?.label);
  } catch (error) {
    showError(error.message);
    (error instanceof PinValidationError ? label : url).focus();
    return;
  }
  const id = editingId;
  if (await save({ type: id ? 'edit' : 'add', id, url: pin.url, label: label.value })) dialog.close();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pins) void refresh();
});
void refresh();
