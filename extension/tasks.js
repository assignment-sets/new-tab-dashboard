export const titleLimit = 240;
export const previewSize = 3;

function taskTitle(title) {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > titleLimit) {
    throw new Error('Enter a task between 1 and 240 characters.');
  }
  return trimmed;
}

export function changeTasks(tasks, { type, id, title, at }) {
  switch (type) {
    case 'add':
      return [...tasks, { id, title: taskTitle(title), createdAt: at, completedAt: null }];
    case 'clear':
      return tasks.length ? [] : tasks;
    case 'edit': {
      const index = tasks.findIndex(task => task.id === id);
      if (index === -1) throw new Error('This task was deleted in another view.');
      const trimmed = taskTitle(title);
      const task = tasks[index];
      return task.title === trimmed ? tasks : tasks.with(index, { ...task, title: trimmed });
    }
    case 'delete': {
      const index = tasks.findIndex(task => task.id === id);
      return index === -1 ? tasks : tasks.toSpliced(index, 1);
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
