import assert from 'node:assert/strict';
import test from 'node:test';
import { createScratchpadWriter, SCRATCHPAD_KEY } from '../extension/scratchpad-state.js';

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
