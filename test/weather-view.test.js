import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';

test('new tabs show cached weather while refreshing and keep it on failure', async t => {
  const elements = new Map();
  const document = {
    addEventListener() {},
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, {
        closest: () => document.querySelector('dialog'),
        addEventListener() {},
        classList: { toggle() {} },
        style: {},
        setAttribute() {},
        getContext: () => ({ clearRect() {}, fillRect() {} }),
      });
      return elements.get(selector);
    },
  };
  const cache = new Map();
  const city = { latitude: 1, longitude: 2, label: 'Test City' };
  const globals = {
    document,
    localStorage: { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) },
    chrome: { storage: { local: { get: async () => ({ weatherCity: city }) }, onChanged: { addListener() {} } } },
    getComputedStyle: () => ({}),
  };
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => original ? Object.defineProperty(globalThis, name, original) : delete globalThis[name]);
  }
  t.mock.method(globalThis, 'setInterval', () => {});
  let respond;
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { respond = resolve; }));
  const openTab = async id => {
    elements.clear();
    await import(`../extension/weather-view.js?tab=${id}`);
    await setImmediate();
  };
  const summary = () => document.querySelector('#weather-summary').textContent;
  const warning = () => document.querySelector('#weather-warning');
  const succeed = temperature => respond(new Response(JSON.stringify({
    current: { temperature_2m: temperature, weather_code: 0, is_day: 1 },
  })));

  await openTab(1);
  assert.match(summary(), /—/);
  respond(new Response(null, { status: 503 }));
  await setImmediate();
  assert.match(summary(), /—/);
  assert.equal(warning().hidden, false);
  assert.equal(warning().title, 'Couldn’t fetch weather.');

  await openTab(2);
  succeed(24);
  await setImmediate();
  assert.match(summary(), /24°C/);

  await openTab(3);
  assert.match(summary(), /24°C/);
  respond(new Response(null, { status: 503 }));
  await setImmediate();
  assert.match(summary(), /24°C/);
  assert.match(warning().title, /cached/i);

  await openTab(4);
  succeed(25);
  await setImmediate();
  assert.match(summary(), /25°C/);
  assert.equal(warning().hidden, true);
});
