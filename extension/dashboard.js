import { normalizePin } from './pins.js';

const date = document.querySelector('#clock-date');
const time = document.querySelector('#clock-time');
const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function updateClock() {
  const now = new Date();
  const formattedDate = dateFormat.format(now);
  const formattedTime = timeFormat.format(now);
  if (date.textContent !== formattedDate) date.textContent = formattedDate;
  if (time.textContent !== formattedTime) time.textContent = formattedTime;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  date.dateTime = `${now.getFullYear()}-${month}-${day}`;
  time.dateTime = now.toTimeString().slice(0, 5);
}

updateClock();
setInterval(updateClock, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateClock();
});

const add = document.querySelector('#add-pin');
const manage = document.querySelector('#manage-pins');
const form = document.querySelector('#pin-form');
const url = form.elements.namedItem('url');
const label = form.elements.namedItem('label');
const submit = form.querySelector('[type="submit"]');
const cancel = document.querySelector('#cancel-pin');
const list = document.querySelector('#pin-list');
const empty = document.querySelector('#pin-empty');
const error = document.querySelector('#pin-error');

let pins = [];
let managing = false;
let editingId = null;
let saving = false;
let refreshVersion = 0;

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

function openForm(pin = null) {
  if (saving) return;
  editingId = pin?.id ?? null;
  url.value = pin?.url ?? '';
  label.value = pin?.label ?? '';
  submit.textContent = pin ? 'Save changes' : 'Save pin';
  form.hidden = false;
  showError('');
  url.focus();
}

function closeForm(id = editingId) {
  form.hidden = true;
  editingId = null;
  const same = [...list.querySelectorAll('[data-control="edit"]')]
    .find(control => control.dataset.pinId === id);
  (same ?? add).focus();
}

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

function makePinControl(pin, control, text, onClick, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = text;
  button.dataset.pinId = pin.id;
  button.dataset.control = control;
  button.setAttribute('aria-label', `${text} ${pin.label}`);
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

function renderPin(pin, index) {
  const row = document.createElement('li');
  const link = document.createElement('a');
  const mark = document.createElement('span');
  const title = document.createElement('span');
  link.className = 'pin-link';
  link.href = pin.url;
  link.referrerPolicy = 'no-referrer';
  link.title = pin.url;
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

  if (managing) {
    const controls = document.createElement('div');
    controls.className = 'pin-controls';
    controls.append(
      makePinControl(pin, 'edit', 'Edit', () => openForm(pin)),
      makePinControl(pin, 'earlier', 'Move earlier', () => save({ type: 'move', id: pin.id, direction: -1 }), index === 0),
      makePinControl(pin, 'later', 'Move later', () => save({ type: 'move', id: pin.id, direction: 1 }), index === pins.length - 1),
      makePinControl(pin, 'remove', 'Remove', async () => {
        if (await save({ type: 'remove', id: pin.id }) && editingId === pin.id) closeForm();
      }),
    );
    row.append(controls);
  }
  return row;
}

function render() {
  const { pinId, control } = document.activeElement.dataset;
  const hasPins = pins.length > 0;
  if (!hasPins) managing = false;
  manage.hidden = !hasPins;
  manage.textContent = managing ? 'Done' : 'Manage pins';
  list.classList.toggle('managing', managing);
  list.hidden = !hasPins;
  empty.hidden = hasPins;
  empty.textContent = 'Add a site you visit often.';
  const rows = document.createDocumentFragment();
  for (const [index, pin] of pins.entries()) rows.append(renderPin(pin, index));
  list.replaceChildren(rows);

  if (pinId) {
    const controls = [...list.querySelectorAll('[data-pin-id]')]
      .filter(element => element.dataset.pinId === pinId && !element.disabled);
    const match = controls.find(element => element.dataset.control === control);
    const edit = controls.find(element => element.dataset.control === 'edit');
    (match ?? edit ?? (hasPins ? manage : add)).focus();
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
manage.addEventListener('click', () => {
  managing = !managing;
  render();
});
cancel.addEventListener('click', () => {
  if (saving) return;
  showError('');
  closeForm();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving) return;

  let pin;
  try {
    pin = normalizePin(url.value, label.value);
  } catch (error) {
    showError(error.message);
    url.focus();
    return;
  }
  const id = editingId;
  if (await save({ type: id ? 'edit' : 'add', id, ...pin })) closeForm(id);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pins) void refresh();
});
void refresh();
