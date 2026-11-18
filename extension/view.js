import { previewSize, selectTasks, titleLimit } from './tasks.js';

const workspace = document.querySelector('.workspace');
const isPopup = document.body.classList.contains('popup');

workspace.innerHTML = `
    <header class="panel-bar">
      <h2>Tasks</h2>
      <button class="secondary clear-tasks" type="button" aria-controls="clear-tasks-confirm" aria-expanded="false" disabled>Clear all</button>
    </header>
    <div class="workspace-body">
      <div class="clear-tasks-confirm" id="clear-tasks-confirm" hidden>
        <p>Delete all current and completed tasks?</p>
        <div class="task-actions">
          <button class="danger-action" id="confirm-clear-tasks" type="button">Delete all tasks</button>
          <button class="secondary" id="cancel-clear-tasks" type="button">Cancel</button>
        </div>
      </div>
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

const form = workspace.querySelector('form');
const input = document.querySelector('#title');
const add = form.querySelector('button');
const clear = workspace.querySelector('.clear-tasks');
const clearConfirm = workspace.querySelector('.clear-tasks-confirm');
const confirmClear = workspace.querySelector('#confirm-clear-tasks');
const cancelClear = workspace.querySelector('#cancel-clear-tasks');
const tabs = [...workspace.querySelectorAll('[role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const section = document.querySelector('#tasks');
panels[0].append(section);
const list = document.querySelector('#task-list');
const empty = workspace.querySelector('.empty');
const more = document.querySelector('.more');
const error = workspace.querySelector('.error');
const status = workspace.querySelector('[role="status"]');
const completionDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

let tasks = [];
let expanded = false;
let showingHistory = false;
let savingNewTask = false;
let refreshVersion = 0;
let loaded = false;
let clearing = false;
let taskEditor = null;
const pendingTasks = new Set();

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

async function save(action) {
  showError('');
  try {
    const result = await chrome.runtime.sendMessage({ kind: 'task-action', action });
    if (!result?.ok) throw new Error('Task write failed');
    return true;
  } catch {
    showError('Couldn’t save the change. Try again.');
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
  if (pendingTasks.has(task.id)) return;
  taskEditor = { id: task.id, mode, draft: task.title };
  showError('');
  render();
  const field = taskRow(task.id)?.querySelector(mode === 'edit' ? 'input' : '[data-task-control="cancel"]');
  field?.focus();
  if (mode === 'edit') field?.select();
}

async function updateTask(task, type, message, title) {
  if (pendingTasks.has(task.id)) return;
  const editor = taskEditor;
  pendingTasks.add(task.id);
  render();
  const saved = await save({ type, id: task.id, title });
  pendingTasks.delete(task.id);
  if (saved) {
    if (taskEditor === editor && editor?.id === task.id) taskEditor = null;
    status.textContent = message;
    await refresh();
  } else {
    render();
  }
}

function renderTaskEditor(row, task, editor) {
  const editing = editor.mode === 'edit';
  const form = document.createElement('form');
  form.className = 'task-editor';
  if (editing) {
    const field = document.createElement('input');
    field.className = 'edit-title';
    field.type = 'text';
    field.required = true;
    field.maxLength = titleLimit;
    field.value = editor.draft;
    field.readOnly = pendingTasks.has(task.id);
    field.dataset.taskControl = 'edit-title';
    field.setAttribute('aria-label', 'Task title');
    field.addEventListener('input', () => { editor.draft = field.value; });
    form.append(field);
  } else {
    const prompt = document.createElement('p');
    prompt.textContent = 'Delete “' + task.title + '”?';
    form.append(prompt);
  }

  const actions = document.createElement('div');
  actions.className = 'task-actions';
  const confirm = taskButton(task, 'confirm', editing ? 'Save' : 'Delete task', editing ? 'primary' : 'danger-action');
  confirm.type = 'submit';
  const cancel = taskButton(task, 'cancel', 'Cancel', 'secondary', 'Cancel ' + editor.mode + ' for');
  cancel.addEventListener('click', () => {
    if (pendingTasks.has(task.id)) return;
    taskEditor = null;
    showError('');
    render();
    taskRow(task.id)?.querySelector('[data-task-control="' + editor.mode + '"]')?.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const title = editor.draft.trim();
    if (editing && !title) {
      showError('Enter a task title.');
      form.querySelector('input').focus();
      return;
    }
    void updateTask(task, editor.mode, editing ? 'Task updated.' : 'Task deleted.', title);
  });
  form.addEventListener('keydown', event => {
    if (event.key === 'Escape') cancel.click();
  });
  actions.append(confirm, cancel);
  form.append(actions);
  row.append(form);
}

function renderTask(task) {
  const completed = task.completedAt !== null;
  const row = document.createElement('li');
  row.dataset.taskId = task.id;
  if (taskEditor?.id === task.id) {
    renderTaskEditor(row, task, taskEditor);
    return row;
  }
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
  clear.disabled = clearing || tasks.length === 0;
  if (!tasks.length && !clearConfirm.hidden) {
    const confirmFocused = clearConfirm.contains(focused) || focused === clear;
    setClearConfirm(false);
    if (confirmFocused) selectedTab.focus();
  }
  if (taskEditor && !visible.some(task => task.id === taskEditor.id)) taskEditor = null;

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

function setClearConfirm(open) {
  clearConfirm.hidden = !open;
  clear.setAttribute('aria-expanded', String(open));
}

clear.addEventListener('click', () => {
  setClearConfirm(clearConfirm.hidden);
  if (!clearConfirm.hidden) cancelClear.focus();
});

function dismissClear() {
  if (clearing) return;
  setClearConfirm(false);
  clear.focus();
}

cancelClear.addEventListener('click', dismissClear);
clearConfirm.addEventListener('keydown', event => {
  if (event.key === 'Escape') dismissClear();
});

confirmClear.addEventListener('click', async () => {
  if (clearing) return;
  clearing = true;
  clear.disabled = true;
  confirmClear.setAttribute('aria-disabled', 'true');
  cancelClear.setAttribute('aria-disabled', 'true');
  const saved = await save({ type: 'clear' });
  clearing = false;
  confirmClear.removeAttribute('aria-disabled');
  cancelClear.removeAttribute('aria-disabled');
  if (saved) {
    const wasFocused = clearConfirm.contains(document.activeElement);
    setClearConfirm(false);
    if (wasFocused) tabs[Number(showingHistory)].focus();
    status.textContent = 'All tasks deleted.';
    await refresh();
  } else {
    render();
  }
});
