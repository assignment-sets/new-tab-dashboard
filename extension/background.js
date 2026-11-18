import { createTaskWriter } from './task-writer.js';

const writeTask = createTaskWriter(chrome.storage.local);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.kind !== 'task-action') return;

  const action = { ...message.action, at: Date.now() };
  if (action.type === 'add') action.id = crypto.randomUUID();

  writeTask(action).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false }),
  );
  return true;
});
