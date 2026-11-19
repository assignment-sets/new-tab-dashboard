import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { dayPeriod } from '../extension/day-period.js';
import { drawPixelText } from '../extension/pixel-text.js';

test('labels local day periods at every transition and midnight', () => {
  for (const [hour, minute, expected] of [
    [0, 0, 'Night'], [4, 59, 'Night'], [5, 0, 'Dawn'],
    [5, 59, 'Dawn'], [6, 0, 'Morning'], [11, 59, 'Morning'],
    [12, 0, 'Afternoon'], [16, 59, 'Afternoon'], [17, 0, 'Evening'],
    [19, 59, 'Evening'], [20, 0, 'Night'], [23, 59, 'Night'],
  ]) {
    assert.equal(dayPeriod(new Date(2026, 10, 19, hour, minute)), expected);
  }
});

test('clock renders the period initially, on ticks, and when the tab resumes', async () => {
  const source = await readFile(new URL('../extension/dashboard.js', import.meta.url), 'utf8');
  const elements = new Map();
  const listeners = {};
  let tick;
  let now = new Date(2026, 10, 19, 11, 59);
  let writes = 0;
  const label = {
    get textContent() { return this.value; },
    set textContent(value) { this.value = value; writes++; },
  };
  elements.set('#clock-day-period', label);
  const document = {
    hidden: false,
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, {
        textContent: '', getContext: () => ({ fillRect() {} }),
      });
      return elements.get(selector);
    },
    querySelectorAll: () => [],
    addEventListener: (event, callback) => { listeners[event] = callback; },
  };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
  }
  vm.runInNewContext(source.slice(source.indexOf('const date ='), source.indexOf('const add =')), {
    document, Date: ClockDate, Intl, getDayPeriod: dayPeriod, drawPixelText,
    getComputedStyle: () => ({ color: '#e5d6b8' }),
    setInterval: callback => { tick = callback; },
  });
  assert.equal(label.textContent, 'Morning');
  tick();
  assert.equal(writes, 1);
  now = new Date(2026, 10, 19, 12, 0);
  tick();
  assert.equal(label.textContent, 'Afternoon');
  now = new Date(2026, 10, 19, 20, 0);
  listeners.visibilitychange();
  assert.equal(label.textContent, 'Night');
});
