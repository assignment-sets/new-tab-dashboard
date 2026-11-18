import { getCurrentWeather, searchCities } from './weather.js';

const edit = document.querySelector('#weather-edit');
const editLabel = document.querySelector('#weather-edit-label');
const pencil = document.querySelector('#weather-pencil');
const form = document.querySelector('#weather-form');
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

function toggleEditor(open) {
  if (saving) return;
  clearSearch();
  form.hidden = !open;
  edit.setAttribute('aria-expanded', String(open));
  if (open) {
    query.value = city?.name ?? '';
    query.focus();
    query.select();
  } else {
    edit.focus();
  }
}

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
  toggleEditor(false);
}

async function refreshWeather() {
  if (!city || request || Date.now() < refreshAt) return;
  const controller = new AbortController();
  request = controller;
  try {
    const weather = await getCurrentWeather(city, { signal: controller.signal });
    if (controller.signal.aborted) return;
    summary.textContent = `${weather.temperature}°C · ${weather.condition}`;
    icon.textContent = weather.icon;
    icon.hidden = !weather.icon;
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

edit.addEventListener('click', () => toggleEditor(form.hidden));
cancel.addEventListener('click', () => toggleEditor(false));
query.addEventListener('input', clearSearch);
form.addEventListener('keydown', event => {
  if (event.key === 'Escape') toggleEditor(false);
});
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
