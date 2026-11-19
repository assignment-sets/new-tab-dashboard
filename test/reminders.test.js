import test from 'node:test';
import assert from 'node:assert/strict';
import { createReminderScheduler, selectReminders } from '../extension/reminders.js';

function setup() {
  let records = [], now = 1000, next;
  const deliveries = [];
  const run = createReminderScheduler({
    read: async () => records, write: async value => { records = value; },
    schedule: async value => { next = value; }, deliver: async due => deliveries.push(due),
    clock: () => now,
  });
  return { run, deliveries, time: value => { now = value; }, next: () => next, records: () => records };
}

test('serialize writes, preserve deadline on message edits, reschedule and ignore stale alarms', async () => {
  const s = setup();
  await Promise.all(['a','b'].map(id => s.run({ type: 'add', id, seconds: 30, title: '' })));
  await s.run({ type: 'edit', id: 'a', title: ' Tea ' });
  assert.equal(s.records()[0].dueAt, 31000);
  assert.equal(s.records()[0].title, 'Tea');
  await s.run({ type: 'edit', id: 'a', title: 'Tea', seconds: 60 });
  await s.run({ type: 'delete', id: 'b' });
  assert.equal(s.next(), 61000);
  s.time(31000);
  await s.run();
  assert.equal(s.deliveries.length, 0);
  await s.run({ type: 'add', id: 'c', seconds: 30, title: '' });
  s.time(81000);
  await Promise.all([s.run(), s.run()]);
  assert.equal(s.deliveries.length, 1);
  assert.equal(s.deliveries[0].length, 2);
  assert.ok(s.records().every(item => item.completedAt === 81000));
  assert.equal(s.next(), null);
  await s.run({ type: 'clear' });
  assert.deepEqual(s.records(), []);
});

test('validate duration, sort pending and history', async () => {
  const s = setup();
  for (const seconds of [0, 29, 30.1, Infinity]) {
    await assert.rejects(s.run({ type: 'add', id: 'bad', seconds, title: '' }));
  }
  for (const [id, seconds] of [['later',60],['first',30]]) {
    await s.run({ type: 'add', id, seconds, title: '' });
  }
  assert.deepEqual(selectReminders(s.records()).active.map(r => r.id), ['first','later']);
  s.time(31000);
  await s.run();
  s.time(61000);
  await s.run();
  assert.deepEqual(selectReminders(s.records()).completed.map(r => r.id), ['later','first']);
});

test('startup reconciles missed reminders once, delivers a silent system alert and one chime', async t => {
  let records = ['one', 'two'].map(id => ({ id, title: id, completedAt: null, dueAt: 1 }));
  const notices = [], sounds = [], documents = [];
  let startup;
  const storage = {
    get: async () => ({ reminders: records }),
    set: async data => { records = data.reminders; },
  };
  const noopEvent = { addListener() {} };
  t.after(() => { delete globalThis.chrome; });
  globalThis.chrome = {
    storage: { local: storage },
    runtime: {
      onStartup: { addListener(fn) { startup = fn; } }, onInstalled: noopEvent,
      sendMessage: async message => { sounds.push(message); return true; },
    },
    alarms: { get: async () => undefined, onAlarm: noopEvent },
    notifications: {
      getPermissionLevel: async () => 'granted',
      create: async (id, options) => notices.push(options),
    },
    offscreen: { hasDocument: async () => false, createDocument: async options => documents.push(options) },
  };
  const { runReminders } = await import('../extension/reminder-service.js');
  await startup();
  await runReminders();
  assert.equal(notices.length, 1);
  assert.equal(notices[0].silent, true);
  assert.match(notices[0].message, /one · two/);
  assert.deepEqual(sounds, [{ kind: 'reminder-chime' }]);
  assert.deepEqual(documents[0].reasons, ['AUDIO_PLAYBACK']);
  assert.ok(records.every(item => item.completedAt > 0));
});
