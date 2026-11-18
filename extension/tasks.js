export const titleLimit = 240;
export const previewSize = 3;

export function changeTasks(tasks, { type, id, title, at }) {
  switch (type) {
    case 'add': {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || trimmedTitle.length > titleLimit) {
        throw new Error('Enter a task between 1 and 240 characters.');
      }
      return [...tasks, { id, title: trimmedTitle, createdAt: at, completedAt: null }];
    }
    case 'complete':
    case 'restore': {
      const task = tasks.find((item) => item.id === id);
      const completedAt = type === 'complete' ? at : null;
      if (!task || (task.completedAt === null) === (completedAt === null)) {
        return tasks;
      }
      return tasks.map((item) => item === task ? { ...task, completedAt } : item);
    }
    default:
      throw new Error('Unknown task action.');
  }
}

export function selectTasks(tasks) {
  const active = [];
  const completed = [];
  // Start from the most recently inserted task for timestamps that tie.
  for (const task of tasks.toReversed()) {
    (task.completedAt === null ? active : completed).push(task);
  }
  active.sort((first, second) => second.createdAt - first.createdAt);
  completed.sort((first, second) => second.completedAt - first.completedAt);
  return { active, completed, preview: active.slice(0, previewSize) };
}
