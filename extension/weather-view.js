import { getCurrentWeather, searchCities } from './weather.js';
import { drawPixelText } from './pixel-text.js';

const edit = document.querySelector('#weather-edit');
const form = document.querySelector('#weather-form');
const dialog = form.closest('dialog');
const query = document.querySelector('#weather-query');
const cancel = document.querySelector('#weather-cancel');
const results = document.querySelector('#weather-results');
const feedback = document.querySelector('#weather-feedback');
const summary = document.querySelector('#weather-summary');
const warning = document.querySelector('#weather-warning');
const cityLabel = document.querySelector('#weather-city');
const icon = document.querySelector('#weather-icon');
const temperature = document.querySelector('#weather-temperature');
const unit = document.querySelector('#weather-unit');
const condition = document.querySelector('#weather-condition');
const refreshInterval = 15 * 60 * 1000;

let city;
let displayedWeather;
let search;
let request;
let refreshAt = 0;
let saving = false;
let iconTimer;
let iconFrame = 0;
const frameInterval = 750;
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

function clearSearch() {
  search?.abort();
  search = undefined;
  results.replaceChildren();
  results.hidden = true;
  feedback.textContent = '';
}

function openEditor() {
  document.querySelector('#weather-dialog-title').textContent = city ? 'Edit city' : 'Add city';
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
  (city ? cityLabel : edit).focus({ preventScroll: true });
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

function stopIconAnimation() {
  if (iconTimer !== undefined) {
    clearInterval(iconTimer);
    iconTimer = undefined;
  }
}

function syncIconAnimation() {
  stopIconAnimation();
  const frames = displayedWeather?.frames?.length
    ? displayedWeather.frames
    : (displayedWeather?.icon ? [displayedWeather.icon] : []);
  if (!frames.length) {
    paintWeatherIcon('');
    return;
  }
  iconFrame %= frames.length;
  paintWeatherIcon(frames[iconFrame]);
  if (frames.length < 2 || document.hidden || reducedMotion?.matches) return;
  iconTimer = setInterval(() => {
    iconFrame = (iconFrame + 1) % frames.length;
    paintWeatherIcon(frames[iconFrame]);
  }, frameInterval);
}

reducedMotion?.addEventListener?.('change', syncIconAnimation);

function displayWeather(weather) {
  displayedWeather = weather;
  iconFrame = 0;
  const reading = weather ? `${weather.temperature}°C` : '—°C';
  temperature.hidden = unit.hidden = !city;
  if (city) drawPixelText(temperature, weather ? String(weather.temperature) : '--', getComputedStyle(temperature).color);
  condition.textContent = weather?.condition ?? (city ? '—' : '');
  condition.hidden = !condition.textContent;
  summary.textContent = city ? `${reading} · ${condition.textContent}` : 'Weather';
  syncIconAnimation();
}

function cacheKey(place) {
  return `weather:${place.latitude},${place.longitude}`;
}

function readWeather(place) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(place)));
  } catch {
    return null;
  }
}

async function refreshWeather() {
  if (!city || request || Date.now() < refreshAt) return;
  const controller = new AbortController();
  request = controller;
  try {
    const weather = await getCurrentWeather(city, { signal: controller.signal });
    if (controller.signal.aborted) return;
    displayWeather(weather);
    warning.hidden = true;
    try {
      localStorage.setItem(cacheKey(city), JSON.stringify(weather));
    } catch {
      // Weather is still available in this tab if storage is unavailable.
    }
  } catch {
    if (controller.signal.aborted) return;
    warning.title = displayedWeather ? 'Couldn’t refresh. Showing cached weather.' : 'Couldn’t fetch weather.';
    warning.setAttribute('aria-label', warning.title);
    warning.hidden = false;
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
  edit.hidden = Boolean(city);
  displayWeather(city ? readWeather(city) : null);
  warning.hidden = true;
  cityLabel.textContent = city?.label ?? '';
  cityLabel.title = city ? `${city.label} — Edit city` : '';
  cityLabel.setAttribute('aria-label', city ? `${city.label}, edit city` : '');
  cityLabel.hidden = !city;
  void refreshWeather();
}

edit.addEventListener('click', openEditor);
cityLabel.addEventListener('click', openEditor);
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
  if (!cityChanged) {
    condition.textContent = 'Couldn’t load the saved city';
    condition.hidden = false;
    summary.textContent = condition.textContent;
  }
});

function refreshWhenVisible() {
  syncIconAnimation();
  if (!document.hidden) void refreshWeather();
}

document.addEventListener('visibilitychange', refreshWhenVisible);
setInterval(refreshWhenVisible, 60 * 1000);
