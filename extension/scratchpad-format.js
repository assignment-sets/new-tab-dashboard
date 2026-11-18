export function parseNote(source) {
  const blocks = [];
  let current = null;

  for (const line of source.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) {
      current = null;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(text);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      current = null;
      continue;
    }

    const bullet = /^[-*+]\s+(.+)$/.exec(text);
    if (bullet) {
      if (current?.type !== 'list') {
        current = { type: 'list', items: [] };
        blocks.push(current);
      }
      current.items.push(bullet[1]);
    } else if (current?.type === 'paragraph') {
      current.text += ' ' + text;
    } else {
      current = { type: 'paragraph', text };
      blocks.push(current);
    }
  }
  return blocks;
}

export function parseInline(text) {
  const tokens = [];
  let cursor = 0;
  for (const match of text.matchAll(/`([^`]+)`|\*\*([^*`]+)\*\*/g)) {
    if (match.index > cursor) tokens.push({ type: 'text', text: text.slice(cursor, match.index) });
    tokens.push(match[1] ? { type: 'code', text: match[1] } : { type: 'bold', text: match[2] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) tokens.push({ type: 'text', text: text.slice(cursor) });
  return tokens;
}
