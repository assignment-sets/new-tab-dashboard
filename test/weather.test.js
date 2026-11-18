import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCurrentWeather, searchCities } from '../extension/weather.js';

test('city search keeps same-name locations distinguishable', async () => {
  const fetcher = async url => {
    assert.equal(url.origin, 'https://geocoding-api.open-meteo.com');
    assert.equal(url.searchParams.get('name'), 'Paris');
    return Response.json({ results: [
      { name: 'Paris', admin1: 'Île-de-France', country: 'France', latitude: 48.85, longitude: 2.35 },
      { name: 'Paris', admin1: 'Texas', country: 'United States', latitude: 33.66, longitude: -95.55 },
    ] });
  };

  assert.deepEqual(await searchCities(' Paris ', { fetcher }), [
    { name: 'Paris', label: 'Paris, Île-de-France, France', latitude: 48.85, longitude: 2.35 },
    { name: 'Paris', label: 'Paris, Texas, United States', latitude: 33.66, longitude: -95.55 },
  ]);
});

test('city search handles Open-Meteo omitting results when there are no matches', async () => {
  const fetcher = async () => Response.json({ generationtime_ms: 0.1 });
  assert.deepEqual(await searchCities('Missing City', { fetcher }), []);
});

test('current weather uses the chosen coordinates and draws a crescent for a clear night', async () => {
  const fetcher = async url => {
    assert.equal(url.origin, 'https://api.open-meteo.com');
    assert.equal(url.searchParams.get('latitude'), '33.66');
    assert.equal(url.searchParams.get('longitude'), '-95.55');
    assert.equal(url.searchParams.get('current'), 'temperature_2m,weather_code,is_day');
    return Response.json({ current: { temperature_2m: 19.6, weather_code: 0, is_day: 0 } });
  };

  const { temperature, condition, icon } = await getCurrentWeather({ latitude: 33.66, longitude: -95.55 }, { fetcher });
  assert.equal(temperature, 20);
  assert.equal(condition, 'Clear');
  assert.match(icon, /█/);
  assert.notEqual(icon, (await getCurrentWeather({ latitude: 33.66, longitude: -95.55 }, {
    fetcher: async () => Response.json({ current: { temperature_2m: 19.6, weather_code: 0, is_day: 1 } }),
  })).icon);
});

test('weather conditions have distinct block-character silhouettes', async () => {
  const city = { latitude: 48.85, longitude: 2.35 };
  const icons = await Promise.all([0, 2, 3, 45, 51, 61, 71, 95].map(async weather_code => {
    const fetcher = async () => Response.json({ current: { temperature_2m: 12, weather_code, is_day: 1 } });
    return (await getCurrentWeather(city, { fetcher })).icon;
  }));
  assert.equal(new Set(icons).size, icons.length);
  for (const icon of icons) {
    assert.match(icon, /^[ ▀▄█\n]+$/u);
    assert.ok(icon.includes('█'));
  }
});

test('unavailable weather cannot be displayed as a temperature', async () => {
  const city = { latitude: 48.85, longitude: 2.35 };
  await assert.rejects(getCurrentWeather(city, { fetcher: async () => new Response(null, { status: 503 }) }));
  const fetcher = async () => Response.json({ current: { temperature_2m: null, weather_code: 0 } });
  await assert.rejects(getCurrentWeather(city, { fetcher }));
});
