import { runReminders } from './reminder-service.js';
import { changePins, PinValidationError } from './pins.js';
import { createListWriter, createTaskWriter } from './task-writer.js';
import { createScratchpadWriter } from './scratchpad-state.js';

const writeTask = createTaskWriter(chrome.storage.local);
const writePin = createListWriter(chrome.storage.local, 'pins', changePins);
const writeScratchpad = createScratchpadWriter(chrome.storage.local);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.kind === 'scratchpad-action') {
    writeScratchpad(message.action).then(
      workspace => sendResponse({ ok: true, workspace }),
      () => sendResponse({ ok: false }),
    );
    return true;
  }
  const writer = message?.kind === 'task-action' ? writeTask
    : message?.kind === 'reminder-action' ? runReminders
    : message?.kind === 'pin-action' ? writePin : null;
  if (!writer) return;

  const action = { ...message.action, at: Date.now() };
  if (action.type === 'add') action.id = crypto.randomUUID();

  writer(action).then(
    () => sendResponse({ ok: true }),
    error => sendResponse(error instanceof PinValidationError
      ? { ok: false, error: error.message }
      : { ok: false }),
  );
  return true;
});
