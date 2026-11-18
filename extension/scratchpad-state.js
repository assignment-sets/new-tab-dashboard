export const SCRATCHPAD_KEY = 'scratchpadWorkspace';
export const NOTE_TITLE_LIMIT = 60;
export const NOTE_TEXT_LIMIT = 16000;

function defaultWorkspace(text = '') {
  const id = crypto.randomUUID();
  return { notes: [{ id, title: 'Notes', text }], activeId: id };
}

function changeWorkspace(workspace, { type, id, title, text, resetId }) {
  const { notes, activeId } = workspace;
  if (type === 'load') return workspace;
  if (type === 'clear') {
    const empty = defaultWorkspace();
    return { ...empty, resetId: empty.activeId };
  }
  if (type === 'recover' && resetId !== workspace.resetId) {
    throw new Error('The scratchpad was cleared.');
  }
  if (type === 'add' || type === 'recover') {
    if (typeof id !== 'string' || !id) throw new Error('Invalid note ID.');
    if (notes.some(note => note.id === id)) return workspace;
    if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.length > NOTE_TITLE_LIMIT)) {
      throw new Error('Enter a name for the note.');
    }
    if (text !== undefined && (typeof text !== 'string' || text.length > NOTE_TEXT_LIMIT)) {
      throw new Error('This note is too long.');
    }
    const note = { id, title: title ?? 'Untitled', text: text ?? '' };
    return { notes: [...notes, note], activeId: id };
  }

  const index = notes.findIndex(note => note.id === id);
  if (index === -1) throw new Error('This note was deleted in another tab.');
  if (type === 'select') return id === activeId ? workspace : { notes, activeId: id };
  if (type === 'delete') {
    if (notes.length === 1) throw new Error('Keep at least one note.');
    const remaining = notes.filter(note => note.id !== id);
    return { notes: remaining, activeId: activeId === id
      ? remaining[Math.min(index, remaining.length - 1)].id
      : activeId };
  }

  const note = notes[index];
  let updated;
  if (type === 'rename') {
    const name = typeof title === 'string' ? title.trim() : '';
    if (!name || name.length > NOTE_TITLE_LIMIT) throw new Error('Enter a name for the note.');
    if (name === note.title) return workspace;
    updated = { ...note, title: name };
  } else if (type === 'save') {
    if (typeof text !== 'string' || text.length > NOTE_TEXT_LIMIT) throw new Error('This note is too long.');
    if (text === note.text) return workspace;
    updated = { ...note, text };
  } else {
    throw new Error('Unknown scratchpad action.');
  }
  return { notes: notes.map((item, i) => i === index ? updated : item), activeId };
}

export function createScratchpadWriter(storage) {
  let pending = Promise.resolve();
  return action => {
    const result = pending.then(async () => {
      const stored = await storage.get([SCRATCHPAD_KEY, 'scratchpad']);
      let workspace = stored[SCRATCHPAD_KEY];
      if (!workspace) {
        const text = typeof stored.scratchpad === 'string' ? stored.scratchpad : '';
        workspace = { ...defaultWorkspace(text), revision: 0 };
      }
      let next = changeWorkspace(workspace, action);
      if (next !== stored[SCRATCHPAD_KEY]) {
        next = { ...workspace, ...next, revision: workspace.revision + 1 };
        const changes = { [SCRATCHPAD_KEY]: next };
        if (action.type === 'clear') changes.scratchpad = '';
        await storage.set(changes);
      }
      return next;
    });
    pending = result.catch(() => {});
    return result;
  };
}
