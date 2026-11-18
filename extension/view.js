import { previewSize, selectTasks, titleLimit } from './tasks.js';

document.body.innerHTML = `
  <main class="workspace">
    <header class="header">
      <h1>Tasks</h1>
      <button class="secondary" id="history" type="button" aria-controls="tasks">Completed</button>
    </header>
    <form class="composer">
      <label class="visually-hidden" for="title">New task</label>
      <input id="title" name="title" type="text" placeholder="Add a task…" autocomplete="off" required maxlength="${titleLimit}">
      <button class="primary" type="submit" disabled>Add</button>
    </form>
    <p class="error" role="alert" hidden></p>
    <section id="tasks" aria-labelledby="list-heading" aria-busy="true">
      <h2 id="list-heading" tabindex="-1">Active tasks</h2>
      <p class="empty">Loading tasks…</p>
      <ul id="task-list" class="task-list" hidden></ul>
      <button class="secondary more" type="button" aria-controls="task-list" aria-expanded="false" hidden></button>
    </section>
    <p class="visually-hidden" role="status"></p>
  </main>
`;

const form = document.querySelector('form');
const input = document.querySelector('#title');
const add = form.querySelector('button');
const history = document.querySelector('#history');
const section = document.querySelector('#tasks');
const list = document.querySelector('#task-list');
const heading = document.querySelector('#list-heading');
const empty = document.querySelector('.empty');
const more = document.querySelector('.more');
const error = document.querySelector('.error');
const status = document.querySelector('[role="status"]');
const completionDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

let tasks = [];
let expanded = false;
let showingHistory = false;
let savingNewTask = false;
let refreshVersion = 0;
let loaded = false;
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

function renderTask(task) {
  const completed = task.completedAt !== null;
  const row = document.createElement('li');
  const details = document.createElement('div');
  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;
  details.append(title);

  const control = document.createElement('button');
  control.type = 'button';
  control.dataset.taskId = task.id;
  if (pendingTasks.has(task.id)) control.setAttribute('aria-disabled', 'true');
  if (completed) {
    const date = document.createElement('time');
    const timestamp = new Date(task.completedAt);
    date.dateTime = timestamp.toISOString();
    date.textContent = completionDate.format(timestamp);
    details.append(date);
    control.className = 'secondary restore';
    control.textContent = 'Restore';
    control.setAttribute('aria-label', `Restore ${task.title}`);
    row.append(details, control);
  } else {
    control.className = 'check';
    control.setAttribute('aria-label', `Complete ${task.title}`);
    row.append(control, details);
  }

  control.addEventListener('click', async () => {
    if (pendingTasks.has(task.id)) return;
    pendingTasks.add(task.id);
    // Keep the control focusable while Chrome confirms the write.
    control.setAttribute('aria-disabled', 'true');
    const type = completed ? 'restore' : 'complete';
    const saved = await save({ type, id: task.id });
    pendingTasks.delete(task.id);
    render();
    if (saved) status.textContent = completed ? 'Task restored.' : 'Task completed.';
  });
  return row;
}

function render() {
  const focused = document.activeElement;
  const focusedTask = focused?.dataset.taskId;
  const previousIndex = focusedTask ? Array.from(list.querySelectorAll('button')).indexOf(focused) : -1;
  const { active, preview, completed } = selectTasks(tasks);
  const visible = showingHistory ? completed : expanded ? active : preview;

  section.setAttribute('aria-busy', 'false');
  history.textContent = showingHistory ? 'Back to tasks' : 'Completed';
  heading.textContent = showingHistory ? 'Completed tasks' : 'Active tasks';
  form.hidden = showingHistory;
  empty.hidden = visible.length > 0;
  empty.textContent = showingHistory ? 'Completed tasks will appear here.' : 'All clear. Add a task when you’re ready.';
  list.hidden = visible.length === 0;
  const rows = document.createDocumentFragment();
  for (const task of visible) rows.append(renderTask(task));
  list.replaceChildren(rows);
  more.hidden = showingHistory || active.length <= previewSize;
  more.textContent = expanded ? 'Show less' : `Show more (${active.length - previewSize})`;
  more.setAttribute('aria-expanded', String(expanded));

  if (focusedTask) {
    const controls = Array.from(list.querySelectorAll('button'));
    const same = controls.find((button) => button.dataset.taskId === focusedTask);
    (same ?? controls[Math.min(previousIndex, controls.length - 1)] ?? heading).focus({ preventScroll: Boolean(same) });
  } else if (focused === more && more.hidden) {
    heading.focus();
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

history.addEventListener('click', () => {
  if (!loaded) return;
  showingHistory = !showingHistory;
  render();
});

more.addEventListener('click', () => {
  expanded = !expanded;
  render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.tasks) void refresh();
});
void refresh();
