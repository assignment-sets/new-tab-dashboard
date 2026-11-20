import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraftSaver, createScratchpadWriter, SCRATCHPAD_KEY } from '../extension/scratchpad-state.js';

function localStorage(initial = {}) {
  const data = structuredClone(initial);
  return {
    async get(keys) {
      return Object.fromEntries(keys.map(key => [key, structuredClone(data[key])]));
    },
    async set(values) {
      Object.assign(data, structuredClone(values));
    },
  };
}

test('migrates the legacy note once and retains its text verbatim', async () => {
  const text = '# Draft\n\n  Details  \n';
  const storage = localStorage({ scratchpad: text });
  const write = createScratchpadWriter(storage);
  const [first, second] = await Promise.all([write({ type: 'load' }), write({ type: 'load' })]);
  assert.deepEqual(first, second);
  assert.deepEqual(first.notes, [{ id: first.activeId, title: 'Notes', text }]);
  await write({ type: 'save', id: first.activeId, text: '' });
  const restored = await createScratchpadWriter(storage)({ type: 'load' });
  assert.equal(restored.notes[0].text, '');
  assert.equal((await storage.get(['scratchpad'])).scratchpad, text);
});

test('serializes saves by note ID and remembers the last selected note', async () => {
  const storage = localStorage();
  const write = createScratchpadWriter(storage);
  const { activeId } = await write({ type: 'load' });
  await write({ type: 'add', id: 'other' });
  await Promise.all([
    write({ type: 'save', id: activeId, text: 'First note' }),
    write({ type: 'save', id: 'other', text: 'Second note' }),
    write({ type: 'rename', id: 'other', title: '  Work  ' }),
    write({ type: 'select', id: activeId }),
  ]);
  const restored = (await storage.get([SCRATCHPAD_KEY]))[SCRATCHPAD_KEY];
  assert.equal(restored.activeId, activeId);
  assert.deepEqual(restored.notes, [
    { id: activeId, title: 'Notes', text: 'First note' },
    { id: 'other', title: 'Work', text: 'Second note' },
  ]);
});

test('selects a neighbor on deletion, keeps one tab, and rejects writes to deleted tabs', async () => {
  const write = createScratchpadWriter(localStorage());
  const { activeId } = await write({ type: 'load' });
  await write({ type: 'add', id: 'second' });
  await write({ type: 'add', id: 'third' });
  await write({ type: 'select', id: 'second' });
  assert.equal((await write({ type: 'delete', id: 'second' })).activeId, 'third');
  await assert.rejects(write({ type: 'save', id: 'second', text: 'Stale draft' }));
  await write({ type: 'delete', id: 'third' });
  await assert.rejects(write({ type: 'delete', id: activeId }));
  assert.deepEqual((await write({ type: 'load' })).notes.map(note => note.id), [activeId]);
});

test('clears every note and legacy text, leaving a fresh Notes tab after reopening', async () => {
  const storage = localStorage({ scratchpad: 'Old scratchpad text' });
  const write = createScratchpadWriter(storage);
  const initial = await write({ type: 'load' });
  await write({ type: 'add', id: 'work' });
  await write({ type: 'rename', id: 'work', title: 'Work' });
  await write({ type: 'save', id: 'work', text: 'Work draft' });

  const cleared = await write({ type: 'clear' });
  assert.notEqual(cleared.activeId, initial.activeId);
  assert.deepEqual(cleared.notes, [{ id: cleared.activeId, title: 'Notes', text: '' }]);
  assert.equal((await storage.get(['scratchpad'])).scratchpad, '');
  assert.deepEqual(await createScratchpadWriter(storage)({ type: 'load' }), cleared);
});

test('rejects delayed saves and recovery requests for drafts from before clear all', async () => {
  const write = createScratchpadWriter(localStorage());
  const initial = await write({ type: 'load' });
  const clearing = write({ type: 'clear' });
  const lateSave = write({ type: 'save', id: initial.activeId, text: 'Old draft' });
  const lateRecovery = write({ type: 'recover', id: 'recovered', text: 'Old draft', resetId: initial.resetId });
  await assert.rejects(lateSave);
  await assert.rejects(lateRecovery);
  assert.deepEqual(await write({ type: 'load' }), await clearing);
});

test('coalesces rapid edits and keeps at most one save in flight per note', async () => {
  const drafts = new Map();
  const calls = [];
  const results = [];
  let resolveCurrent;
  const saver = createDraftSaver({
    drafts,
    delay: 15,
    save: (id, text, recover) => new Promise(resolve => {
      calls.push({ id, text, recover });
      resolveCurrent = resolve;
    }),
    onSuccess: next => results.push(next),
  });

  saver.schedule('a', '1');
  saver.schedule('a', '12');
  saver.schedule('a', '123');
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(calls, [{ id: 'a', text: '123', recover: false }]);

  saver.schedule('a', '1234');
  const flushing = saver.flushAll();
  assert.equal(calls.length, 1);

  resolveCurrent({ rev: 1 });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls, [
    { id: 'a', text: '123', recover: false },
    { id: 'a', text: '1234', recover: false },
  ]);

  resolveCurrent({ rev: 2 });
  await flushing;
  assert.equal(drafts.size, 0);
  assert.deepEqual(results, [{ rev: 1 }, { rev: 2 }]);
});

test('flushAll sends pending drafts immediately and cancel/cancelAll drops them', async () => {
  const drafts = new Map();
  const saved = [];
  const saver = createDraftSaver({
    drafts,
    delay: 200,
    save: async (id, text) => {
      saved.push([id, text]);
      return { id, text };
    },
  });

  saver.schedule('a', 'alpha');
  saver.schedule('b', 'beta');
  saver.cancel('a');
  await saver.flushAll();
  assert.deepEqual(saved, [['b', 'beta']]);
  assert.equal(drafts.size, 0);

  saver.schedule('b', 'dropped');
  saver.cancelAll();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(saved, [['b', 'beta']]);
  assert.equal(drafts.size, 0);
});

test('marks failed drafts and retries newer edits made while a failing save is in flight', async () => {
  const drafts = new Map();
  const calls = [];
  let errors = 0;
  let settleFirst;
  const saver = createDraftSaver({
    drafts,
    delay: 15,
    save: (id, text, recover) => {
      calls.push({ id, text, recover });
      if (calls.length === 1) {
        return new Promise((_resolve, reject) => {
          settleFirst = reject;
        });
      }
      if (text === 'bad') return Promise.reject(new Error('fail'));
      return Promise.resolve({ id, text });
    },
    onError: () => { errors += 1; },
  });

  saver.schedule('a', 'v1');
  const firstFlush = saver.flush('a');
  saver.schedule('a', 'v2');
  const secondFlush = saver.flushAll();
  settleFirst(new Error('network'));
  await Promise.all([firstFlush, secondFlush]);

  assert.equal(errors, 0);
  assert.equal(drafts.size, 0);
  assert.deepEqual(calls, [
    { id: 'a', text: 'v1', recover: false },
    { id: 'a', text: 'v2', recover: false },
  ]);

  saver.schedule('a', 'bad');
  await saver.flush('a', true);
  assert.equal(errors, 1);
  assert.deepEqual(drafts.get('a'), { text: 'bad', failed: true });
  assert.deepEqual(calls.at(-1), { id: 'a', text: 'bad', recover: true });
});
