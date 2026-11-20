import { attachActions, openMenu } from './item-actions.js';
import { parseInline, parseNote } from './scratchpad-format.js';
import { createDraftSaver, NOTE_TEXT_LIMIT, NOTE_TITLE_LIMIT, SCRATCHPAD_KEY } from './scratchpad-state.js';

const note = document.querySelector('#scratchpad-note');
const preview = document.querySelector('#scratchpad-preview');
const toggle = document.querySelector('#scratchpad-toggle');
const error = document.querySelector('#scratchpad-error');
const retry = document.querySelector('#scratchpad-retry');
const tabs = document.querySelector('#scratchpad-tabs');
const panel = document.querySelector('#scratchpad-panel');
const add = document.querySelector('#scratchpad-add');
const options = document.querySelector('#scratchpad-options');
const nameLabel = document.querySelector('#scratchpad-name');
const nameInput = nameLabel.querySelector('input');
nameInput.maxLength = NOTE_TITLE_LIMIT;
const dialog = document.querySelector('#scratchpad-dialog');
const form = document.querySelector('#scratchpad-form');
const confirmation = document.querySelector('#scratchpad-confirm');
const dialogError = document.querySelector('#scratchpad-dialog-error');
const cancel = document.querySelector('#scratchpad-cancel');
const confirmAction = document.querySelector('#scratchpad-confirm-action');

let workspace;
let initialChange;
let activeId;
let renderedId;
let tabSignature;
let feedback = '';
let loadFailed = false;
let dialogAction;
const drafts = new Map();

note.maxLength = NOTE_TEXT_LIMIT;

function appendInline(parent, text) {
  for (const token of parseInline(text)) {
    if (token.type === 'text') {
      parent.append(token.text);
    } else {
      const element = document.createElement(token.type === 'code' ? 'code' : 'strong');
      element.textContent = token.text;
      parent.append(element);
    }
  }
}

function renderPreview() {
  const fragment = document.createDocumentFragment();
  const blocks = parseNote(note.value);
  if (!blocks.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nothing to preview yet.';
    fragment.append(empty);
  }
  for (const block of blocks) {
    if (block.type === 'list') {
      const list = document.createElement('ul');
      for (const text of block.items) {
        const item = document.createElement('li');
        appendInline(item, text);
        list.append(item);
      }
      fragment.append(list);
    } else {
      const element = document.createElement(block.type === 'heading' ? 'h' + (block.level + 2) : 'p');
      appendInline(element, block.text);
      fragment.append(element);
    }
  }
  preview.replaceChildren(fragment);
}

function renderFeedback() {
  const failed = [...drafts.values()].filter(draft => draft.failed).length;
  const message = failed ? 'Couldn’t save some note changes.' : feedback;
  if (error.textContent !== message) error.textContent = message;
  retry.hidden = !loadFailed && !failed;
}

function render() {
  const signature = JSON.stringify(workspace.notes.map(({ id, title }) => [id, title]));
  const rebuilt = signature !== tabSignature;
  const focusedId = tabs.contains(document.activeElement) ? document.activeElement.dataset.id : null;
  if (rebuilt) {
    tabSignature = signature;
    tabs.replaceChildren(...workspace.notes.map(({ id, title }) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'secondary';
      tab.id = 'scratchpad-tab-' + id;
      tab.dataset.id = id;
      tab.textContent = title;
      tab.title = title;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      const row = document.createElement('div');
      row.setAttribute('role', 'presentation');
      row.append(tab);
      tab.ondblclick = () => openDialog('rename', id);
      attachActions(row, tab, title, [
        { label: 'Rename', run: () => openDialog('rename', id) },
        { label: 'Delete', disabled: workspace.notes.length === 1, run: () => openDialog('delete', id) },
      ]);
      return row;
    }));
  }

  const switched = renderedId !== activeId;
  if (rebuilt || switched) {
    const selectedTab = document.getElementById('scratchpad-tab-' + activeId);
    for (const tab of tabs.querySelectorAll('[role="tab"]')) {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', selectedTab.id);
    panel.removeAttribute('aria-label');
    if (focusedId && !tabs.contains(document.activeElement)) selectedTab.focus({ preventScroll: true });
    selectedTab.scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' });
  }
  if (switched) {
    renderedId = activeId;
  }
  const current = workspace.notes.find(item => item.id === activeId);
  const text = drafts.get(activeId)?.text ?? current.text;
  if (switched || note.value !== text) {
    const { selectionStart, selectionEnd, scrollTop } = note;
    note.value = text;
    if (switched) {
      note.setSelectionRange(0, 0);
      note.scrollTop = 0;
      preview.scrollTop = 0;
    } else {
      note.setSelectionRange(selectionStart, selectionEnd);
      note.scrollTop = scrollTop;
    }
    if (!preview.hidden) renderPreview();
  }
  note.disabled = toggle.disabled = options.disabled = false;
  renderFeedback();
}

function applyWorkspace(next) {
  const priorIndex = workspace?.notes.findIndex(item => item.id === activeId) ?? -1;
  if (!workspace || next.revision > workspace.revision) {
    if (workspace && next.resetId !== workspace.resetId) {
      saver.cancelAll();
      feedback = '';
      activeId = next.activeId;
      setPreview(false);
    }
    workspace = next;
  }
  if (!workspace.notes.some(item => item.id === activeId)) {
    activeId = priorIndex < 0 ? workspace.activeId
      : workspace.notes[Math.min(priorIndex, workspace.notes.length - 1)].id;
  }
  render();
}

async function sendAction(action) {
  const response = await chrome.runtime.sendMessage({ kind: 'scratchpad-action', action });
  if (!response?.ok) throw new Error('Scratchpad action failed.');
  return response.workspace;
}

async function loadNotes() {
  loadFailed = false;
  feedback = '';
  renderFeedback();
  try {
    const loaded = await sendAction({ type: 'load' });
    applyWorkspace(initialChange?.revision > loaded.revision ? initialChange : loaded);
    initialChange = undefined;
    add.disabled = false;
  } catch {
    loadFailed = true;
    feedback = 'Couldn’t load your notes.';
    renderFeedback();
  }
}

const saver = createDraftSaver({
  drafts,
  save: (id, text, recover) => sendAction(recover
    ? { type: 'recover', id: crypto.randomUUID(), title: 'Recovered note', text, resetId: workspace.resetId }
    : { type: 'save', id, text }),
  onSuccess: applyWorkspace,
  onError: renderFeedback,
});

async function selectNote(id) {
  activeId = id;
  feedback = '';
  render();
  try {
    applyWorkspace(await sendAction({ type: 'select', id }));
  } catch {
    if (activeId !== id) return;
    feedback = 'Couldn’t remember the selected note.';
    renderFeedback();
  }
}

tabs.addEventListener('click', event => {
  const tab = event.target.closest('[role="tab"]');
  if (tab) void selectNote(tab.dataset.id);
});
tabs.addEventListener('keydown', event => {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  const items = [...tabs.querySelectorAll('[role="tab"]')];
  const index = items.indexOf(event.target);
  if (index < 0) return;
  event.preventDefault();
  const offset = event.key === 'ArrowLeft' ? -1 : 1;
  const next = event.key === 'Home' ? items[0] : event.key === 'End' ? items.at(-1)
    : items[(index + offset + items.length) % items.length];
  void selectNote(next.dataset.id);
  next.focus({ preventScroll: true });
});

add.addEventListener('click', async () => {
  const id = crypto.randomUUID();
  add.disabled = true;
  feedback = '';
  try {
    const next = await sendAction({ type: 'add', id });
    activeId = id;
    applyWorkspace(next);
    if (!preview.hidden) toggle.click();
    note.focus({ preventScroll: true });
  } catch {
    feedback = 'Couldn’t add a note.';
    renderFeedback();
  } finally {
    add.disabled = false;
  }
});

options.addEventListener('click', event => {
  openMenu(event, options, 'Scratchpad options', [
    { label: 'Clear all tabs', className: 'danger-action', run: () => openDialog('clear') },
  ]);
});

function openDialog(type, id = activeId) {
  const current = workspace.notes.find(item => item.id === id);
  if (!current) return;
  const clearing = type === 'clear';
  const renaming = type === 'rename';
  nameLabel.hidden = nameInput.disabled = !renaming;
  nameInput.value = current.title;
  confirmation.hidden = renaming;
  dialogAction = { type, id: current.id };
  document.querySelector('#scratchpad-dialog-title').textContent = clearing ? 'Clear all tabs?'
    : renaming ? 'Rename note' : 'Delete note?';
  confirmation.textContent = clearing ? 'All scratchpad notes will be deleted and replaced with one empty Notes tab.'
    : '“' + current.title + '” will be permanently deleted.';
  confirmAction.textContent = clearing ? 'Clear all tabs' : renaming ? 'Save' : 'Delete note';
  confirmAction.className = renaming ? 'primary' : 'danger-action';
  dialogError.textContent = '';
  dialog.showModal();
  if (renaming) {
    nameInput.focus();
    nameInput.select();
  } else cancel.focus();
}

cancel.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  const target = dialogAction.type === 'clear' ? options
    : document.getElementById('scratchpad-tab-' + dialogAction.id) ?? document.getElementById('scratchpad-tab-' + activeId);
  if (!tabs.contains(document.activeElement) && document.activeElement !== options) {
    target.focus({ preventScroll: true });
  }
});
dialog.addEventListener('cancel', event => {
  if (confirmAction.disabled) event.preventDefault();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (confirmAction.disabled) return;
  const action = dialogAction;
  if (action.type === 'rename') {
    action.title = nameInput.value.trim();
    if (!action.title) {
      dialogError.textContent = 'Enter a name for the note.';
      nameInput.focus();
      return;
    }
  }
  nameInput.readOnly = confirmAction.disabled = cancel.disabled = true;
  try {
    const next = await sendAction(action);
    if (action.type === 'delete') saver.cancel(action.id);
    applyWorkspace(next);
    dialog.close();
  } catch {
    dialogError.textContent = action.type === 'clear' ? 'Couldn’t clear the scratchpad.'
      : action.type === 'rename' ? 'Couldn’t rename this note.' : 'Couldn’t delete this note.';
  } finally {
    nameInput.readOnly = confirmAction.disabled = cancel.disabled = false;
  }
});

function setPreview(showPreview) {
  if (showPreview) renderPreview();
  preview.hidden = !showPreview;
  note.hidden = showPreview;
  toggle.setAttribute('aria-pressed', String(showPreview));
}
toggle.addEventListener('click', () => setPreview(preview.hidden));

note.addEventListener('input', () => {
  saver.schedule(activeId, note.value);
  renderFeedback();
});
retry.addEventListener('click', async () => {
  if (loadFailed) await loadNotes();
  else {
    const failed = [...drafts].filter(([, draft]) => draft.failed);
    const saves = failed.map(([id]) => saver.flush(id, !workspace.notes.some(item => item.id === id)));
    renderFeedback();
    await Promise.all(saves);
  }
  if (retry.hidden && document.activeElement === document.body) {
    (preview.hidden ? note : toggle).focus({ preventScroll: true });
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) void saver.flushAll();
});
window.addEventListener('pagehide', () => void saver.flushAll());
chrome.storage.onChanged.addListener((changes, area) => {
  const next = changes[SCRATCHPAD_KEY]?.newValue;
  if (area !== 'local' || !next) return;
  if (workspace) applyWorkspace(next);
  else initialChange = next;
});
void loadNotes();
