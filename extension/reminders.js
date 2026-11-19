import { previewSize, titleLimit } from './tasks.js';

export function selectReminders(records) {
  const active = records.filter(r => r.completedAt === null).sort((a, b) => a.dueAt - b.dueAt);
  const completed = records.filter(r => r.completedAt !== null)
    .sort((a, b) => b.completedAt - a.completedAt || b.dueAt - a.dueAt);
  return { active, completed, preview: active.slice(0, previewSize) };
}

function change(records, action, now) {
  const { type, id, seconds } = action;
  if (type === 'clear') return [];
  if (type === 'delete') return records.filter(item => item.id !== id);
  if (type !== 'add' && type !== 'edit') throw Error('Unknown reminder action.');
  const title = action.title.trim();
  if (title.length > titleLimit) throw Error('Reminder message is too long.');
  let dueAt;
  if (type === 'add' || seconds !== undefined) {
    dueAt = now + seconds * 1000;
    if (!Number.isSafeInteger(seconds) || seconds < 30 || !Number.isFinite(new Date(dueAt).getTime())) {
      throw Error('Enter a whole duration of at least 30 seconds.');
    }
  }
  if (type === 'add') return [...records, { id, title, dueAt, completedAt: null }];
  const index = records.findIndex(item => item.id === id && item.completedAt === null);
  if (index < 0) throw Error('This reminder is no longer pending.');
  const item = records[index];
  return records.with(index, { ...item, title, dueAt: dueAt ?? item.dueAt });
}

export function createReminderScheduler({ read, write, schedule, deliver, clock = Date.now }) {
  let queue = Promise.resolve();
  async function reconcile(action) {
    const stored = await read();
    const now = clock();
    const records = action ? change(stored, action, now) : stored;
    const due = records.filter(item => item.completedAt === null && item.dueAt <= now);
    const updated = due.length ? records.map(item =>
      item.completedAt === null && item.dueAt <= now ? { ...item, completedAt: now } : item) : records;
    if (updated !== stored) await write(updated);
    await schedule(selectReminders(updated).active[0]?.dueAt ?? null);
    if (due.length) await deliver(due);
  }
  return action => {
    const result = queue.then(() => reconcile(action));
    queue = result.catch(() => {});
    return result;
  };
}
