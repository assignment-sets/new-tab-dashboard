import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changePins, normalizePin } from '../extension/pins.js';

test('normalizes web addresses and defaults missing labels to the hostname', () => {
  assert.deepEqual(normalizePin(' example.com/docs ', ' '), {
    url: 'https://example.com/docs', label: 'example.com',
  });
  assert.deepEqual(normalizePin('http://localhost:3000', ' Dev '), {
    url: 'http://localhost:3000/', label: 'Dev',
  });
  assert.equal(normalizePin('https://example.com:8080', 'Example').label, 'Example');
  assert.equal(normalizePin('localhost:3000', '').url, 'https://localhost:3000/');
});

test('rejects empty, malformed, credential-bearing and non-web addresses', () => {
  for (const url of ['', 'not a url', 'https://', 'https://user:pass@example.com',
    'javascript:alert(1)', 'file:///tmp/file', 'chrome://settings', '//example.com']) {
    assert.throws(() => normalizePin(url, ''));
  }
});

test('adds, edits, reorders and removes pins without changing other entries', () => {
  const first = { id: 'a', url: 'https://example.com/', label: 'example.com' };
  const second = { id: 'b', url: 'https://example.net/', label: 'Example' };
  const added = changePins([first], { type: 'add', id: 'b', url: 'example.net', label: 'Example' });
  assert.deepEqual(added, [first, second]);
  const edited = changePins(added, { type: 'edit', id: 'b', url: 'example.org', label: '' });
  const updated = { id: 'b', url: 'https://example.org/', label: 'example.org' };
  assert.deepEqual(edited, [first, updated]);
  assert.equal(changePins(edited, { type: 'move', id: 'a', direction: -1 }), edited);
  const moved = changePins(edited, { type: 'move', id: 'b', direction: -1 });
  assert.deepEqual(moved, [updated, first]);
  assert.deepEqual(changePins(moved, { type: 'remove', id: 'b' }), [first]);
  assert.throws(() => changePins(moved, { type: 'edit', id: 'missing', url: 'example.com', label: '' }));
});

test('rejects equivalent URLs regardless of label or trailing slash', () => {
  const pins = [{ id: 'a', url: 'https://example.com/', label: 'Example' }];
  for (const [url, label] of [
    ['https://example.com/', 'Example'],
    ['https://example.com/', 'Another name'],
    ['https://EXAMPLE.com:443', 'Another name'],
    ['example.com', 'Example'],
  ]) {
    assert.throws(() => changePins(pins, { type: 'add', id: 'b', url, label }),
      { message: 'This site is already pinned.' });
  }
});

test('allows separate pins for a domain and its subdomains', () => {
  const pins = [{ id: 'a', url: 'https://example.com/', label: 'Example' }];
  const result = changePins(pins, { type: 'add', id: 'b', url: 'docs.example.com/page', label: '' });
  assert.deepEqual(result, [...pins,
    { id: 'b', url: 'https://docs.example.com/page', label: 'docs.example.com' },
  ]);
});

test('rejects edits that move a pin to another pin’s URL', () => {
  const pins = [
    { id: 'a', url: 'https://example.com/', label: 'Example' },
    { id: 'b', url: 'https://docs.example.com/', label: 'Docs' },
  ];
  assert.throws(() => changePins(pins, { type: 'edit', id: 'b', url: 'example.com/', label: '' }),
    { message: 'This site is already pinned.' });
});

test('allows renaming a pin even if its URL was duplicated before the update', () => {
  const pins = [
    { id: 'a', url: 'https://example.com/', label: 'Example' },
    { id: 'b', url: 'https://example.com/', label: 'Example' },
  ];
  const result = changePins(pins, { type: 'edit', id: 'b', url: 'example.com', label: 'New name' });
  assert.deepEqual(result, [pins[0], { ...pins[1], label: 'New name' }]);
});

test('places pins relative to a stable neighbor in the latest list', () => {
  const pins = ['a', 'b', 'new', 'c'].map(id => ({ id }));
  function place(id, neighborId, after) {
    return changePins(pins, { type: 'place', id, neighborId, after }).map(pin => pin.id);
  }
  assert.deepEqual(place('a', 'c', true), ['b', 'new', 'c', 'a']);
  assert.deepEqual(place('c', 'b', false), ['a', 'c', 'b', 'new']);
  assert.deepEqual(place('a', 'removed', false), ['a', 'b', 'new', 'c']);
  assert.deepEqual(place('a', 'a', true), ['a', 'b', 'new', 'c']);
});

test('allows distinct paths, queries, fragments, schemes and ports on the same host', () => {
  const pins = [{ id: 'a', url: 'https://example.com/docs?x=1#intro', label: 'Docs' }];
  for (const url of [
    'https://example.com/other?x=1#intro',
    'https://example.com/Docs?x=1#intro',
    'https://example.com/docs?x=2#intro',
    'https://example.com/docs?x=1#other',
    'http://example.com/docs?x=1#intro',
    'https://example.com:8080/docs?x=1#intro',
  ]) {
    assert.equal(changePins(pins, { type: 'add', id: 'b', url, label: '' }).length, 2);
  }
});

test('ignores a trailing path slash when checking adds and edits for duplicates', () => {
  const pins = [
    { id: 'a', url: 'https://example.com/docs/?x=1#intro', label: 'Docs' },
    { id: 'b', url: 'https://example.com/other', label: 'Other' },
  ];
  for (const type of ['add', 'edit']) {
    assert.throws(() => changePins(pins, {
      type, id: 'b', url: 'https://EXAMPLE.com:443/docs?x=1#intro', label: '',
    }), { message: 'This site is already pinned.' });
  }
  const edited = changePins(pins, {
    type: 'edit', id: 'b', url: 'https://example.com/new-page', label: '',
  });
  assert.equal(edited[1].url, 'https://example.com/new-page');
});
