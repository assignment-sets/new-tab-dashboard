import { selectReminders } from './reminders.js';
import { previewSize, selectTasks, titleLimit } from './tasks.js';

const workspace = document.querySelector('.workspace');
const isPopup = document.body.classList.contains('popup');

function durationFields(editing) {
  const units = [['Seconds', 1], ['Minutes', 60], ['Hours', 3600]];
  return `<fieldset class="reminder-duration" hidden disabled aria-label="Reminder duration">
    <label>${editing ? 'Restart in' : 'Remind me in'} <input type="number" name="amount" min="1" step="1"
      ${editing ? 'placeholder="Keep time"' : 'value="5" required'}></label>
    <div class="duration-units" role="radiogroup" aria-label="Time unit">
      ${units.map(([name, seconds]) => `<label title="${name}">
        <input class="visually-hidden" type="radio" name="unit" value="${seconds}" aria-label="${name}" ${seconds === 60 ? 'checked' : ''}>
        <span aria-hidden="true">${name[0]}</span>
      </label>`).join('')}
    </div>
  </fieldset>`;
}

workspace.setAttribute('aria-label', 'Tasks and reminders');
workspace.innerHTML = `
    <header class="panel-bar">
      <div class="mode-tabs" role="tablist" aria-label="Workspace">
        <button type="button" role="tab" id="tasks-mode" aria-selected="true" aria-controls="collection-panel">Tasks</button>
        <button type="button" role="tab" id="reminders-mode" aria-selected="false" aria-controls="collection-panel" tabindex="-1">Reminders<span class="notice-dot" aria-hidden="true" hidden></span></button>
      </div>
      <div class="panel-actions">
        <button class="reminder-inbox" type="button" popovertarget="reminder-notices-popover" title="Missed reminders" aria-label="Missed reminders" hidden></button>
        <button class="reminder-permission" type="button" title="Enable desktop notifications" aria-label="Enable desktop notifications" hidden></button>
        <button class="secondary clear-tasks" type="button" aria-controls="task-dialog" aria-haspopup="dialog" disabled>Clear all</button>
      </div>
    </header>
    <div class="reminder-notices" id="reminder-notices-popover" popover="auto" aria-label="Missed reminders"></div>
    <div class="workspace-body" id="collection-panel" role="tabpanel" aria-labelledby="tasks-mode">
      <dialog class="action-dialog" id="task-dialog" aria-labelledby="task-dialog-title">
        <h3 id="task-dialog-title"></h3>
        <form>
          <label><span>Task title</span> <input type="text" maxlength="${titleLimit}" required></label>
          ${durationFields(true)}
          <p class="task-prompt"></p>
          <p class="error" role="alert"></p>
          <div class="dialog-actions">
            <button class="secondary" type="button">Cancel</button>
            <button type="submit"></button>
          </div>
        </form>
      </dialog>
      <div class="task-tabs" role="tablist" aria-label="Task status">
        <button id="current-tab" type="button" role="tab" aria-selected="true" aria-controls="current-panel">Current</button>
        <button id="completed-tab" type="button" role="tab" aria-selected="false" aria-controls="completed-panel" tabindex="-1">Completed</button>
      </div>
      <div id="current-panel" role="tabpanel" aria-labelledby="current-tab" tabindex="0">
        <form class="composer">
          ${durationFields(false)}
          <label class="visually-hidden" for="title">New task</label>
          <input id="title" name="title" type="text" placeholder="Add a task…" autocomplete="off" required maxlength="${titleLimit}">
          <button class="primary" type="submit" disabled>Add</button>
        </form>
      </div>
      <div id="completed-panel" role="tabpanel" aria-labelledby="completed-tab" tabindex="0" hidden></div>
      <div id="tasks" aria-busy="true">
        <p class="error" role="alert" hidden></p>
        <p class="empty">Loading tasks…</p>
        <ul id="task-list" class="task-list" hidden></ul>
        <button class="secondary more" type="button" aria-controls="task-list" aria-expanded="false" hidden></button>
      </div>
      <p class="visually-hidden" role="status"></p>
    </div>
`;

const form = workspace.querySelector('.composer');
const input = document.querySelector('#title');
const add = form.querySelector('button');
const inboxButton = workspace.querySelector('.reminder-inbox');
const reminderDot = workspace.querySelector('#reminders-mode .notice-dot');
const permissionButton = workspace.querySelector('.reminder-permission');
const clear = workspace.querySelector('.clear-tasks');
const dialog = document.querySelector('#task-dialog');
const editorForm = dialog.querySelector('form');
const titleField = editorForm.querySelector('input');
const prompt = editorForm.querySelector('.task-prompt');
const confirm = editorForm.querySelector('[type="submit"]');
const cancel = editorForm.querySelector('[type="button"]');
const dialogError = dialog.querySelector('.error');
const tabs = [...workspace.querySelectorAll('.workspace-body [role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const section = document.querySelector('#tasks');
panels[0].append(section);
const list = document.querySelector('#task-list');
const empty = workspace.querySelector('.empty');
const more = document.querySelector('.more');
const error = section.querySelector('.error');
const status = workspace.querySelector('[role="status"]');
const completionDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

let remindersMode = false;
let permissionAsked = false;
let tasks = [];

function setDuration(form, visible) {
  const fields = form.querySelector('.reminder-duration');
  fields.hidden = fields.disabled = !visible;
}

function secondsFrom(form) {
  return form.elements.amount.valueAsNumber * Number(form.elements.unit.value);
}
let expanded = false;
let showingHistory = false;
let savingNewTask = false;
let refreshVersion = 0;
let loaded = false;
let submitting = false;
let taskEditor = null;
const pendingTasks = new Set();

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

async function save(action, report = showError) {
  report('');
  try {
    const result = await chrome.runtime.sendMessage({ kind: remindersMode ? 'reminder-action' : 'task-action', action });
    if (!result?.ok) throw new Error('Task write failed');
    return true;
  } catch {
    report('Couldn’t save the change. Try again.');
    return false;
  }
}

// Pixel-art glyphs on a 16px grid, drawn as solid rects so they stay crisp like the clock digits.
const rect = ([x, y, w = 1, h = 1]) => `M${x} ${y}h${w}v${h}h-${w}z`;
const pencil = [...Array(9)].flatMap((_, k) => k === 6 ? [] : [[3 + k, 11 - k, 3, 2]]).concat([[2, 12, 1, 2], [3, 13, 1, 1]]);
const glyphs = {
  edit: pencil,
  delete: [[6, 1, 4], [2, 3, 12, 2], [3, 6, 1, 8], [12, 6, 1, 8], [3, 14, 10], [6, 7, 1, 5], [9, 7, 1, 5]],
  restore: [[2, 6, 1, 2], [3, 5, 1, 4], [4, 4, 1, 6], [5, 6, 8, 2], [12, 8, 2, 4], [6, 11, 7, 2]],
  complete: [[2, 7, 2, 2], [4, 9, 2, 2], [6, 7, 2, 2], [8, 5, 2, 2], [10, 3, 2, 2]],
  bell: [[7, 1, 2, 1], [5, 2, 6, 1], [4, 3, 1, 2], [11, 3, 1, 2], [3, 5, 1, 5], [12, 5, 1, 5], [2, 10, 12, 1], [6, 12, 4, 2]],
  bellOff: [[7, 1, 2, 1], [5, 2, 6, 1], [4, 3, 1, 2], [11, 3, 1, 2], [3, 5, 1, 5], [12, 5, 1, 5], [2, 10, 12, 1], [6, 12, 4, 2], ...[...Array(11)].map((_, k) => [2 + k, 2 + k, 2, 1])],
};

function glyph(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', glyphs[name].map(rect).join(''));
  svg.append(path);
  return svg;
}

function taskButton(task, key, text, className, label = text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  if (glyphs[key]) {
    button.append(glyph(key));
    if (key !== 'complete') button.title = label;
  } else button.textContent = text;
  button.dataset.taskControl = key;
  button.setAttribute('aria-label', label + ' ' + (task.title || 'reminder'));
  if (pendingTasks.has(task.id)) button.setAttribute('aria-disabled', 'true');
  return button;
}

function taskRow(id) {
  return [...list.children].find(row => row.dataset.taskId === id);
}

function openTaskEditor(task, mode) {
  if (pendingTasks.has(task?.id)) return;
  taskEditor = { id: task?.id, mode };
  const editing = mode === 'edit';
  const clearing = mode === 'clear';
  const noun = remindersMode ? 'reminder' : 'task';
  dialog.querySelector('h3').textContent = editing ? 'Edit ' + noun : clearing ? 'Clear all ' + noun + 's?' : 'Delete ' + noun + '?';
  titleField.required = !remindersMode;
  titleField.parentElement.querySelector('span').textContent = remindersMode ? 'Message (optional)' : 'Task title';
  setDuration(editorForm, remindersMode && editing);
  editorForm.elements.amount.value = '';
  editorForm.elements.unit.value = '60';
  editorForm.elements.amount.min = '1';
  titleField.parentElement.hidden = titleField.disabled = !editing;
  titleField.value = task?.title ?? '';
  prompt.hidden = editing;
  prompt.textContent = clearing ? 'Delete all pending and completed ' + noun + 's?' : 'Delete “' + (titleField.value || 'Reminder') + '”?';
  confirm.textContent = editing ? 'Save' : clearing ? 'Delete all ' + noun + 's' : 'Delete ' + noun;
  confirm.className = editing ? 'primary' : 'danger-action';
  dialogError.textContent = '';
  dialog.showModal();
  if (editing) {
    titleField.focus();
    titleField.select();
  } else cancel.focus();
}

clear.addEventListener('click', () => openTaskEditor(null, 'clear'));
cancel.addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', event => {
  if (submitting) event.preventDefault();
});
dialog.addEventListener('close', () => {
  const { id, mode } = taskEditor;
  const trigger = id ? taskRow(id)?.querySelector('[data-task-control="' + mode + '"]') : clear;
  (trigger && !trigger.disabled ? trigger : tabs[Number(showingHistory)]).focus({ preventScroll: true });
  taskEditor = null;
});

editorForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  const { id, mode } = taskEditor;
  const action = { type: mode, id };
  if (mode === 'edit') {
    action.title = titleField.value.trim();
    if (remindersMode && editorForm.elements.amount.value) action.seconds = secondsFrom(editorForm);
    if (!remindersMode && !action.title) {
      dialogError.textContent = 'Enter a task title.';
      titleField.focus();
      return;
    }
  }
  submitting = titleField.readOnly = confirm.disabled = cancel.disabled = true;
  const saved = await save(action, message => { dialogError.textContent = message; });
  if (saved) {
    status.textContent = remindersMode ? 'Reminders updated.' : { clear: 'All tasks deleted.', edit: 'Task updated.', delete: 'Task deleted.' }[mode];
    await refresh();
    dialog.close();
  }
  submitting = titleField.readOnly = confirm.disabled = cancel.disabled = false;
});

async function updateTask(task, type, message) {
  if (pendingTasks.has(task.id)) return;
  pendingTasks.add(task.id);
  render();
  const saved = await save({ type, id: task.id });
  pendingTasks.delete(task.id);
  if (saved) {
    status.textContent = message;
    await refresh();
  } else {
    render();
  }
}

function renderTask(task) {
  const completed = task.completedAt !== null;
  const row = document.createElement('li');
  row.dataset.taskId = task.id;
  const details = document.createElement('div');
  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title || 'Reminder';
  title.title = task.title;
  details.append(title);

  const type = completed ? 'restore' : 'complete';
  const control = taskButton(task, type, '', completed ? 'task-icon restore' : 'check',
    completed ? 'Restore' : 'Complete');
  if (completed || remindersMode) {
    const date = document.createElement('time');
    const timestamp = new Date(task.completedAt ?? task.dueAt);
    date.dateTime = timestamp.toISOString();
    date.textContent = remindersMode
      ? (completed ? 'Fired ' : 'Due ') + timestamp.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : completionDate.format(timestamp);
    details.append(date);
    row.append(details);
  } else {
    row.append(control, details);
  }

  control.addEventListener('click', () => {
    if (!completed && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      if (row.classList.contains('completing')) return;
      row.classList.add('completing');
      setTimeout(() => void updateTask(task, type, 'Task completed.'), 160);
      return;
    }
    void updateTask(task, type, completed ? 'Task restored.' : 'Task completed.');
  });
  const actions = document.createElement('div');
  actions.className = 'task-actions';
  const edit = taskButton(task, 'edit', 'Edit', 'task-icon');
  const remove = taskButton(task, 'delete', 'Delete', 'task-icon task-delete');
  edit.addEventListener('click', () => openTaskEditor(task, 'edit'));
  remove.addEventListener('click', () => openTaskEditor(task, 'delete'));
  if (completed && !remindersMode) actions.append(control);
  if (!completed || !remindersMode) actions.append(edit);
  actions.append(remove);
  row.append(actions);
  return row;
}

function render() {
  const focused = document.activeElement;
  const focusedRow = focused?.closest('[data-task-id]');
  const focusedTask = focusedRow?.dataset.taskId;
  const previousIndex = focusedRow ? [...list.children].indexOf(focusedRow) : -1;
  const focusedControl = focused?.dataset.taskControl;
  const { active, preview, completed } = remindersMode ? selectReminders(tasks) : selectTasks(tasks);
  const visible = showingHistory ? completed : !isPopup || expanded ? active : preview;
  const selectedTab = tabs[Number(showingHistory)];
  clear.disabled = tasks.length === 0;
  if (dialog.open && !submitting && (taskEditor.id
    ? !visible.some(task => task.id === taskEditor.id) : !tasks.length)) dialog.close();

  section.setAttribute('aria-busy', 'false');
  empty.hidden = visible.length > 0;
  empty.textContent = remindersMode ? (showingHistory ? 'Completed reminders will appear here.' : 'No pending reminders.') : showingHistory ? 'Completed tasks will appear here.' : 'All clear. Add a task when you’re ready.';
  list.hidden = visible.length === 0;
  const rows = document.createDocumentFragment();
  for (const task of visible) rows.append(renderTask(task));
  const previousScroll = list.scrollTop;
  list.replaceChildren(rows);
  list.scrollTop = previousScroll;
  more.hidden = !isPopup || showingHistory || active.length <= previewSize;
  more.textContent = expanded ? 'Show less' : `Show more (${active.length - previewSize})`;
  more.setAttribute('aria-expanded', String(expanded));

  if (focusedTask) {
    const row = taskRow(focusedTask);
    const same = row?.querySelector('[data-task-control="' + focusedControl + '"]');
    const neighbor = list.children[Math.min(previousIndex, list.children.length - 1)];
    (same ?? row?.querySelector('button') ?? neighbor?.querySelector('button') ?? selectedTab)
      .focus({ preventScroll: Boolean(same) });
    if (same instanceof HTMLInputElement && focused instanceof HTMLInputElement) {
      same.setSelectionRange(focused.selectionStart, focused.selectionEnd);
    }
  } else if (focused === more && more.hidden) {
    selectedTab.focus();
  }
}

function updateAddButton() {
  add.disabled = !loaded || savingNewTask || (remindersMode ? !form.elements.amount.validity.valid : !input.value.trim());
}

async function refresh() {
  const version = ++refreshVersion;
  try {
    const key = remindersMode ? 'reminders' : 'tasks';
    const { [key]: stored = [], reminderPermissionAsked: storedPermission } = await chrome.storage.local.get([key, 'reminderPermissionAsked']);
    if (version !== refreshVersion) return;
    tasks = stored;
    permissionAsked ||= Boolean(storedPermission);
    loaded = true;
    render();
    updateAddButton();
  } catch {
    if (version !== refreshVersion) return;
    section.setAttribute('aria-busy', 'false');
    if (!loaded) empty.hidden = true;
    showError('Couldn’t load this list. Open this view again to retry.');
  }
}

input.addEventListener('input', updateAddButton);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = input.value;
  const title = value.trim();
  if (!loaded || savingNewTask || (!title && !remindersMode) || title.length > titleLimit) return;

  savingNewTask = true;
  updateAddButton();
  const action = { type: 'add', title };
  if (remindersMode) {
    action.seconds = secondsFrom(form);
    if (!permissionAsked) {
      permissionAsked = true;
      try {
        await chrome.permissions.request({ permissions: ['notifications'] });
        await chrome.storage.local.set({ reminderPermissionAsked: true });
      } catch { permissionAsked = false; }
      void updatePermissionButton();
    }
  }
  const saved = await save(action);
  if (saved) {
    if (input.value === value) input.value = '';
    status.textContent = remindersMode ? 'Reminder added.' : 'Task added.';
  }
  savingNewTask = false;
  updateAddButton();
  if (document.activeElement === document.body) input.focus();
});

function selectTab(index) {
  const changed = showingHistory !== (index === 1);
  showingHistory = index === 1;
  for (const [position, tab] of tabs.entries()) {
    const selected = position === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[position].hidden = !selected;
  }
  panels[index].append(section);
  tabs[index].focus();
  if (loaded) render();
  if (changed) list.scrollTop = 0;
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(index));
  tab.addEventListener('keydown', event => {
    const next = { ArrowLeft: 1 - index, ArrowRight: 1 - index, Home: 0, End: 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(next);
  });
});

more.addEventListener('click', () => {
  expanded = !expanded;
  render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[remindersMode ? 'reminders' : 'tasks']) void refresh();
});
void refresh();

const modeTabs = [...workspace.querySelectorAll('.mode-tabs button')];
function switchMode(index) {
  if (savingNewTask || submitting || remindersMode === Boolean(index)) return;
  remindersMode = Boolean(index);
  loaded = expanded = false;
  tasks = [];
  input.value = '';
  status.textContent = '';
  showError('');
  modeTabs.forEach((tab, i) => {
    tab.setAttribute('aria-selected', String(index === i));
    tab.tabIndex = index === i ? 0 : -1;
  });
  document.querySelector('#collection-panel').setAttribute('aria-labelledby', modeTabs[index].id);
  tabs[0].textContent = remindersMode ? 'Pending' : 'Current';
  tabs[0].parentElement.setAttribute('aria-label', remindersMode ? 'Reminder status' : 'Task status');
  input.required = !remindersMode;
  input.placeholder = remindersMode ? 'Message (optional)' : 'Add a task…';
  form.querySelector('[for="title"]').textContent = remindersMode ? 'Reminder message (optional)' : 'New task';
  add.textContent = remindersMode ? 'Add reminder' : 'Add';
  setDuration(form, remindersMode);
  selectTab(0);
  modeTabs[index].focus();
  render();
  updateAddButton();
  section.setAttribute('aria-busy', 'true');
  empty.textContent = remindersMode ? 'Loading reminders…' : 'Loading tasks…';
  void updatePermissionButton();
  void refresh();
}
modeTabs.forEach((tab, i) => {
  tab.addEventListener('click', () => switchMode(i));
  tab.addEventListener('keydown', event => {
    const next = { ArrowLeft: 1 - i, ArrowRight: 1 - i, Home: 0, End: 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    switchMode(next);
  });
});
for (const target of [form, editorForm]) {
  target.querySelector('.duration-units').addEventListener('change', () => {
    target.elements.amount.min = target.elements.unit.value === '1' ? '30' : '1';
    updateAddButton();
  });
}
form.elements.amount.addEventListener('input', updateAddButton);

permissionButton.append(glyph('bellOff'));

async function updatePermissionButton() {
  if (!remindersMode) {
    permissionButton.hidden = true;
    return;
  }
  let granted = false;
  try {
    granted = Boolean(await chrome.permissions?.contains?.({ permissions: ['notifications'] }));
  } catch {
    granted = false;
  }
  permissionButton.hidden = granted;
}

permissionButton.addEventListener('click', async () => {
  try {
    const granted = await chrome.permissions.request({ permissions: ['notifications'] });
    permissionAsked = true;
    await chrome.storage.local.set({ reminderPermissionAsked: true });
    if (granted) {
      permissionButton.hidden = true;
      status.textContent = 'Notifications enabled.';
    } else {
      status.textContent = 'Notification permission not granted.';
    }
  } catch {
    status.textContent = 'Couldn’t request notification permission.';
  }
});

chrome.permissions?.onAdded?.addListener(() => void updatePermissionButton());
chrome.permissions?.onRemoved?.addListener(() => void updatePermissionButton());

const notices = workspace.querySelector('.reminder-notices');
const noticePrefix = 'reminder-notice-';
const inboxDot = document.createElement('span');
inboxDot.className = 'notice-dot';
inboxDot.setAttribute('aria-hidden', 'true');
inboxButton.append(glyph('bell'), inboxDot);

const noticesHeader = document.createElement('div');
noticesHeader.className = 'reminder-notices-header';
const noticesHeading = document.createElement('span');
noticesHeading.textContent = 'Missed reminders';
const dismissAll = document.createElement('button');
dismissAll.type = 'button';
dismissAll.className = 'task-text-action';
dismissAll.textContent = 'Dismiss all';
const noticeList = document.createElement('div');
noticeList.className = 'reminder-notices-list';
noticesHeader.append(noticesHeading, dismissAll);
notices.append(noticesHeader, noticeList);

const activeNotices = new Map();
function syncNoticeIndicators() {
  const count = activeNotices.size;
  const hasNotices = count > 0;
  inboxButton.hidden = !hasNotices;
  reminderDot.hidden = !hasNotices;
  const label = count === 1 ? '1 missed reminder' : `${count} missed reminders`;
  inboxButton.title = label;
  inboxButton.setAttribute('aria-label', label);
  if (!hasNotices && notices.matches(':popover-open')) notices.hidePopover();
}

dismissAll.addEventListener('click', () => {
  if (!activeNotices.size) return;
  void chrome.storage.local.remove([...activeNotices.keys()]);
});

notices.addEventListener('beforetoggle', event => {
  if (event.newState !== 'open') return;
  const rect = inboxButton.getBoundingClientRect();
  notices.style.top = `${Math.round(rect.bottom + 6)}px`;
  notices.style.right = `${Math.max(8, Math.round(window.innerWidth - rect.right))}px`;
});

function renderNotice(key, notice, announce = false) {
  document.getElementById(key)?.remove();
  if (!notice) {
    activeNotices.delete(key);
    syncNoticeIndicators();
    return;
  }
  activeNotices.set(key, notice);
  const row = document.createElement('div');
  row.id = key;
  const message = document.createElement('p');
  message.textContent = notice.title + ' — ' + notice.message;
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'task-text-action';
  dismiss.textContent = 'Dismiss';
  dismiss.addEventListener('click', () => chrome.storage.local.remove(key));
  row.append(message, dismiss);
  noticeList.append(row);
  syncNoticeIndicators();
  if (announce) status.textContent = message.textContent;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  for (const [key, change] of Object.entries(changes)) {
    if (key.startsWith(noticePrefix)) renderNotice(key, change.newValue, Boolean(change.newValue));
  }
});

async function loadNotices() {
  const storage = chrome.storage.local;
  const keys = storage.getKeys ? (await storage.getKeys()).filter(key => key.startsWith(noticePrefix)) : null;
  for (const [key, notice] of Object.entries(await storage.get(keys))) {
    if (key.startsWith(noticePrefix)) renderNotice(key, notice);
  }
}
void loadNotices();
