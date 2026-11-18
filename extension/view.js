import { previewSize, selectTasks, titleLimit } from './tasks.js';

const workspace = document.querySelector('.workspace');
const isPopup = document.body.classList.contains('popup');

workspace.innerHTML = `
    <header class="panel-bar">
      <h2>Tasks</h2>
      <button class="secondary clear-tasks" type="button" aria-controls="task-dialog" aria-haspopup="dialog" disabled>Clear all</button>
    </header>
    <div class="workspace-body">
      <dialog class="action-dialog" id="task-dialog" aria-labelledby="task-dialog-title">
        <h3 id="task-dialog-title"></h3>
        <form>
          <label>Task title <input type="text" maxlength="${titleLimit}" required></label>
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
const clear = workspace.querySelector('.clear-tasks');
const dialog = document.querySelector('#task-dialog');
const editorForm = dialog.querySelector('form');
const titleField = editorForm.querySelector('input');
const prompt = editorForm.querySelector('.task-prompt');
const confirm = editorForm.querySelector('[type="submit"]');
const cancel = editorForm.querySelector('[type="button"]');
const dialogError = dialog.querySelector('.error');
const tabs = [...workspace.querySelectorAll('[role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const section = document.querySelector('#tasks');
panels[0].append(section);
const list = document.querySelector('#task-list');
const empty = workspace.querySelector('.empty');
const more = document.querySelector('.more');
const error = section.querySelector('.error');
const status = workspace.querySelector('[role="status"]');
const completionDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

let tasks = [];
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
    const result = await chrome.runtime.sendMessage({ kind: 'task-action', action });
    if (!result?.ok) throw new Error('Task write failed');
    return true;
  } catch {
    report('Couldn’t save the change. Try again.');
    return false;
  }
}

function taskButton(task, key, text, className, label = text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.dataset.taskControl = key;
  button.setAttribute('aria-label', label + ' ' + task.title);
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
  dialog.querySelector('h3').textContent = editing ? 'Edit task' : clearing ? 'Clear all tasks?' : 'Delete task?';
  titleField.parentElement.hidden = titleField.disabled = !editing;
  titleField.value = task?.title ?? '';
  prompt.hidden = editing;
  prompt.textContent = clearing ? 'Delete all current and completed tasks?' : 'Delete “' + titleField.value + '”?';
  confirm.textContent = editing ? 'Save' : clearing ? 'Delete all tasks' : 'Delete task';
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
    if (!action.title) {
      dialogError.textContent = 'Enter a task title.';
      titleField.focus();
      return;
    }
  }
  submitting = titleField.readOnly = confirm.disabled = cancel.disabled = true;
  const saved = await save(action, message => { dialogError.textContent = message; });
  if (saved) {
    status.textContent = { clear: 'All tasks deleted.', edit: 'Task updated.', delete: 'Task deleted.' }[mode];
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
  title.textContent = task.title;
  title.title = task.title;
  details.append(title);

  const type = completed ? 'restore' : 'complete';
  const control = taskButton(task, type, completed ? 'Restore' : '', completed ? 'secondary restore' : 'check',
    completed ? 'Restore' : 'Complete');
  if (completed) {
    const date = document.createElement('time');
    const timestamp = new Date(task.completedAt);
    date.dateTime = timestamp.toISOString();
    date.textContent = completionDate.format(timestamp);
    details.append(date);
    row.append(details);
  } else {
    row.append(control, details);
  }

  control.addEventListener('click', () => {
    void updateTask(task, type, completed ? 'Task restored.' : 'Task completed.');
  });
  const actions = document.createElement('div');
  actions.className = 'task-actions';
  const edit = taskButton(task, 'edit', 'Edit', 'task-text-action');
  const remove = taskButton(task, 'delete', 'Delete', 'task-text-action');
  edit.addEventListener('click', () => openTaskEditor(task, 'edit'));
  remove.addEventListener('click', () => openTaskEditor(task, 'delete'));
  if (completed) actions.append(control);
  actions.append(edit, remove);
  row.append(actions);
  return row;
}

function render() {
  const focused = document.activeElement;
  const focusedRow = focused?.closest('[data-task-id]');
  const focusedTask = focusedRow?.dataset.taskId;
  const previousIndex = focusedRow ? [...list.children].indexOf(focusedRow) : -1;
  const focusedControl = focused?.dataset.taskControl;
  const { active, preview, completed } = selectTasks(tasks);
  const visible = showingHistory ? completed : !isPopup || expanded ? active : preview;
  const selectedTab = tabs[Number(showingHistory)];
  clear.disabled = tasks.length === 0;
  if (dialog.open && !submitting && (taskEditor.id
    ? !visible.some(task => task.id === taskEditor.id) : !tasks.length)) dialog.close();

  section.setAttribute('aria-busy', 'false');
  empty.hidden = visible.length > 0;
  empty.textContent = showingHistory ? 'Completed tasks will appear here.' : 'All clear. Add a task when you’re ready.';
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
  add.disabled = !loaded || savingNewTask || !input.value.trim();
}

async function refresh() {
  const version = ++refreshVersion;
  try {
    const { tasks: stored = [] } = await chrome.storage.local.get('tasks');
    if (version !== refreshVersion) return;
    tasks = stored;
    loaded = true;
    render();
    updateAddButton();
  } catch {
    if (version !== refreshVersion) return;
    section.setAttribute('aria-busy', 'false');
    if (!loaded) empty.hidden = true;
    showError('Couldn’t load tasks. Open this view again to retry.');
  }
}

input.addEventListener('input', updateAddButton);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = input.value;
  const title = value.trim();
  if (!loaded || savingNewTask || !title || title.length > titleLimit) return;

  savingNewTask = true;
  updateAddButton();
  const saved = await save({ type: 'add', title });
  if (saved) {
    if (input.value === value) input.value = '';
    status.textContent = 'Task added.';
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
  if (area === 'local' && changes.tasks) void refresh();
});
void refresh();
