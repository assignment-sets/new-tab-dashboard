import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changeTasks, selectTasks, titleLimit } from '../extension/tasks.js';
import { createTaskWriter } from '../extension/task-writer.js';

const makeTask = (id, createdAt, completedAt = null) => ({
  id, title: id, createdAt, completedAt,
});

test('adds trimmed task titles and rejects blank and overlong titles', () => {
  const task = { ...makeTask('a', 10), title: 'Buy apples' };
  assert.deepEqual(changeTasks([], {
    type: 'add', id: 'a', title: '  Buy apples  ', at: 10,
  }), [task]);
  for (const title of ['   ', 'a'.repeat(titleLimit + 1)]) {
    assert.throws(() => changeTasks([], { type: 'add', id: 'a', title, at: 10 }));
  }
});

test('returns a three-task preview and orders active and completed lists independently', () => {
  const tasks = [
    makeTask('old', 1), makeTask('second', 4), makeTask('third', 3),
    makeTask('first', 5), makeTask('done earlier', 6, 8), makeTask('done later', 2, 9),
  ];
  const ids = (items) => items.map(({ id }) => id);
  const { active, preview, completed } = selectTasks(tasks);
  assert.deepEqual(ids(active), ['first', 'second', 'third', 'old']);
  assert.deepEqual(ids(preview), ['first', 'second', 'third']);
  assert.deepEqual(ids(completed), ['done later', 'done earlier']);
});

test('records completion once and restores the original active position', () => {
  const tasks = [makeTask('a', 3), makeTask('b', 5)];
  const completed = changeTasks(tasks, { type: 'complete', id: 'a', at: 10 });
  assert.deepEqual(selectTasks(completed).active, [tasks[1]]);
  assert.deepEqual(selectTasks(completed).completed, [makeTask('a', 3, 10)]);
  assert.equal(changeTasks(completed, { type: 'complete', id: 'a', at: 12 }), completed);
  const restored = changeTasks(completed, { type: 'restore', id: 'a' });
  assert.deepEqual(selectTasks(restored).active, [tasks[1], tasks[0]]);
  assert.deepEqual(selectTasks(restored).completed, []);
});

test('serializes overlapping writes and keeps accepting changes after a storage failure', async () => {
  let saved = [];
  let failNextWrite = true;
  const write = createTaskWriter({
    async get() {
      return { tasks: saved };
    },
    async set({ tasks }) {
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error('Storage unavailable');
      }
      saved = tasks;
    },
  });
  const add = (id, at) => write({ type: 'add', id, title: id, at });
  const failed = add('failed', 1);
  const first = add('first', 2);
  const second = add('second', 3);
  await assert.rejects(failed, /Storage unavailable/);
  await Promise.all([first, second]);
  assert.deepEqual(saved, [makeTask('first', 2), makeTask('second', 3)]);
});

test('edits active and completed titles without changing task order or completion', () => {
  const tasks = [makeTask('a', 10), makeTask('b', 20, 30)];
  const activeEdited = changeTasks(tasks, { type: 'edit', id: 'a', title: ' Active ' });
  const bothEdited = changeTasks(activeEdited, { type: 'edit', id: 'b', title: 'Completed' });
  assert.deepEqual(bothEdited, [
    { ...tasks[0], title: 'Active' }, { ...tasks[1], title: 'Completed' },
  ]);
  for (const title of ['   ', 'a'.repeat(titleLimit + 1)]) {
    assert.throws(() => changeTasks(tasks, { type: 'edit', id: 'a', title }));
  }
  assert.equal(changeTasks(tasks, { type: 'edit', id: 'a', title: 'a' }), tasks);
  assert.throws(() => changeTasks(tasks, { type: 'edit', id: 'gone', title: 'New title' }));
});

test('deletes active or completed tasks and leaves other records intact', () => {
  const active = makeTask('a', 10);
  const completed = makeTask('b', 20, 30);
  const tasks = [active, completed];
  assert.deepEqual(changeTasks(tasks, { type: 'delete', id: 'a' }), [completed]);
  assert.deepEqual(changeTasks(tasks, { type: 'delete', id: 'b' }), [active]);
  assert.equal(changeTasks(tasks, { type: 'delete', id: 'gone' }), tasks);
});

test('clears current and completed tasks without modifying the original list', () => {
  const tasks = [makeTask('active', 10), makeTask('completed', 20, 30)];
  assert.deepEqual(changeTasks(tasks, { type: 'clear' }), []);
  assert.equal(tasks.length, 2);
  const empty = [];
  assert.equal(changeTasks(empty, { type: 'clear' }), empty);
});
