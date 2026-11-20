import { createReminderScheduler } from './reminders.js';

const alarmName = 'next-reminder';
const storage = chrome.storage.local;

async function schedule(when) {
  const alarm = await chrome.alarms.get(alarmName);
  if (when === null) {
    if (alarm) await chrome.alarms.clear(alarmName);
  } else if (alarm?.scheduledTime !== when) {
    await chrome.alarms.create(alarmName, { when });
  }
}

async function chime() {
  if (!await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.createDocument({
      url: 'chime.html', reasons: ['AUDIO_PLAYBACK'], justification: 'Play a short reminder chime.',
    });
  }
  await chrome.runtime.sendMessage({ kind: 'reminder-chime' });
}

async function deliver(items) {
  const title = items.length === 1 ? 'Reminder' : items.length + ' reminders are due';
  const message = items.length === 1 ? items[0].title || 'Your reminder is due.'
    : items.map(item => item.title || 'Reminder').join(' · ');
  async function notify() {
    try {
      if (!chrome.notifications || await chrome.notifications.getPermissionLevel() !== 'granted') {
        throw Error('Desktop notifications are unavailable');
      }
      await chrome.notifications.create(items[0].id, {
        type: 'basic', title, message, iconUrl: 'icons/icon-128.png', silent: true,
      });
    } catch {
      // Each missed batch remains available until the user dismisses it.
      await storage.set({ ['reminder-notice-' + items[0].id]: { title, message } });
    }
  }
  await Promise.all([notify(), chime().catch(error => console.warn('Reminder audio unavailable', error))]);
}

export const runReminders = createReminderScheduler({
  read: async () => (await storage.get('reminders')).reminders ?? [],
  write: reminders => storage.set({ reminders }), schedule, deliver,
});

const recover = () => runReminders().catch(error => console.error('Reminder scheduling failed', error));
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === alarmName) void recover(); });
chrome.runtime.onStartup.addListener(recover);
chrome.runtime.onInstalled.addListener(recover);
void recover();
