import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseNote, parseInline } from '../extension/scratchpad-format.js';

test('parses headings, paragraphs, and consecutive bullets in scratchpad notes', () => {
  assert.deepEqual(parseNote('  \r\n# Today\r\n\r\nReview\r\nthe draft\r\n- First\r\n* Second\r\n\r\nAfterward'), [
    { type: 'heading', level: 1, text: 'Today' },
    { type: 'paragraph', text: 'Review the draft' },
    { type: 'list', items: ['First', 'Second'] },
    { type: 'paragraph', text: 'Afterward' },
  ]);
  assert.deepEqual(parseNote(' \n \t'), []);
});

test('tokenizes bold and inline code while keeping HTML and links as literal text', () => {
  assert.deepEqual(parseInline('Use **bold** or `**code**` <img src=x> [link](https://example.com)'), [
    { type: 'text', text: 'Use ' },
    { type: 'bold', text: 'bold' },
    { type: 'text', text: ' or ' },
    { type: 'code', text: '**code**' },
    { type: 'text', text: ' <img src=x> [link](https://example.com)' },
  ]);
  assert.deepEqual(parseInline('Unclosed **markup'), [{ type: 'text', text: 'Unclosed **markup' }]);
});
