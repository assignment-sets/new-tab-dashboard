import { getCurrentWeather, searchCities } from './weather.js';

const edit = document.querySelector('#weather-edit');
const editLabel = document.querySelector('#weather-edit-label');
const pencil = document.querySelector('#weather-pencil');
const form = document.querySelector('#weather-form');
const dialog = form.closest('dialog');
const query = document.querySelector('#weather-query');
const cancel = document.querySelector('#weather-cancel');
const results = document.querySelector('#weather-results');
const feedback = document.querySelector('#weather-feedback');
const summary = document.querySelector('#weather-summary');
const cityLabel = document.querySelector('#weather-city');
const icon = document.querySelector('#weather-icon');
const visual = document.querySelector('.weather-visual');
const refreshInterval = 15 * 60 * 1000;

let city;
let search;
let request;
let refreshAt = 0;
let saving = false;

function clearSearch() {
  search?.abort();
  search = undefined;
  results.replaceChildren();
  results.hidden = true;
  feedback.textContent = '';
}

function openEditor() {
  document.querySelector('#weather-dialog-title').textContent = editLabel.textContent;
  query.value = city?.name ?? '';
  dialog.showModal();
  query.focus();
  query.select();
}

dialog.addEventListener('cancel', event => {
  if (saving) event.preventDefault();
});
dialog.addEventListener('close', () => {
  clearSearch();
  edit.focus({ preventScroll: true });
});

async function saveCity(place) {
  if (saving) return;
  saving = true;
  query.disabled = true;
  try {
    await chrome.storage.local.set({ weatherCity: place });
  } catch {
    feedback.textContent = 'Couldn’t save the city. Try again.';
    return;
  } finally {
    query.disabled = false;
    saving = false;
  }
  dialog.close();
}

function paintWeatherIcon(art) {
  icon.hidden = !art;
  if (!art) return;

  const context = icon.getContext('2d');
  const lines = art.split('\n');
  const width = Math.max(...lines.map(line => line.length));
  const left = Math.floor((icon.width - width) / 2);
  const top = Math.floor((icon.height - lines.length * 2) / 2);
  context.clearRect(0, 0, icon.width, icon.height);
  context.fillStyle = getComputedStyle(icon).color;

  // Each block character describes two square pixels stacked vertically.
  lines.forEach((line, row) => {
    for (let column = 0; column < line.length; column++) {
      const block = line[column];
      const x = left + column;
      const y = top + row * 2;
      if (block === '▀' || block === '█') context.fillRect(x, y, 1, 1);
      if (block === '▄' || block === '█') context.fillRect(x, y + 1, 1, 1);
    }
  });
}

async function refreshWeather() {
  if (!city || request || Date.now() < refreshAt) return;
  const controller = new AbortController();
  request = controller;
  try {
    const weather = await getCurrentWeather(city, { signal: controller.signal });
    if (controller.signal.aborted) return;
    summary.textContent = `${weather.temperature}°C · ${weather.condition}`;
    paintWeatherIcon(weather.icon);
    visual.hidden = false;
  } catch {
    if (controller.signal.aborted) return;
    summary.textContent = 'Weather unavailable';
    visual.hidden = true;
  } finally {
    if (request === controller) {
      request = undefined;
      refreshAt = Date.now() + refreshInterval;
    }
  }
}

function showCity(place) {
  request?.abort();
  request = undefined;
  refreshAt = 0;
  city = place;
  editLabel.textContent = city ? 'Edit city' : 'Add city';
  editLabel.classList.toggle('visually-hidden', Boolean(city));
  edit.classList.toggle('icon-only', Boolean(city));
  edit.title = editLabel.textContent;
  pencil.hidden = !city;
  summary.textContent = city ? 'Loading weather…' : 'Weather';
  cityLabel.textContent = city?.label ?? '';
  cityLabel.hidden = !city;
  visual.hidden = true;
  void refreshWeather();
}

edit.addEventListener('click', openEditor);
cancel.addEventListener('click', () => { if (!saving) dialog.close(); });
query.addEventListener('input', clearSearch);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving) return;
  clearSearch();
  const name = query.value.trim();
  if (name.length < 2) {
    feedback.textContent = 'Enter at least two characters.';
    return;
  }
  const controller = new AbortController();
  search = controller;
  feedback.textContent = 'Searching…';
  try {
    const matches = await searchCities(name, { signal: controller.signal });
    if (controller.signal.aborted) return;
    if (matches.length === 1) {
      feedback.textContent = '';
      await saveCity(matches[0]);
      return;
    }
    if (matches.length === 0) {
      feedback.textContent = 'No matches. Try another city or add a region.';
      return;
    }
    for (const place of matches) {
      const item = document.createElement('li');
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.className = 'secondary';
      choose.textContent = place.label;
      choose.addEventListener('click', () => void saveCity(place));
      item.append(choose);
      results.append(item);
    }
    feedback.textContent = 'Choose a city.';
    results.hidden = false;
    results.querySelector('button').focus();
  } catch {
    if (!controller.signal.aborted) feedback.textContent = 'Couldn’t search for cities. Try again.';
  }
});

let cityChanged = false;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.weatherCity) return;
  cityChanged = true;
  showCity(changes.weatherCity.newValue);
});
chrome.storage.local.get('weatherCity').then(({ weatherCity }) => {
  if (!cityChanged && weatherCity) showCity(weatherCity);
}).catch(() => {
  if (!cityChanged) summary.textContent = 'Couldn’t load the saved city';
});

function refreshWhenVisible() {
  if (!document.hidden) void refreshWeather();
}

document.addEventListener('visibilitychange', refreshWhenVisible);
setInterval(refreshWhenVisible, 60 * 1000);
