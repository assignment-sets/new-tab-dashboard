import { changeTasks } from './tasks.js';

export function createTaskWriter(storage) {
  let pending = Promise.resolve();
  return (action) => {
    const result = pending.then(async () => {
      const { tasks = [] } = await storage.get('tasks');
      const updated = changeTasks(tasks, action);
      if (updated !== tasks) {
        await storage.set({ tasks: updated });
      }
    });
    pending = result.catch(() => {});
    return result;
  };
}
