import { changeTasks } from './tasks.js';

export function createTaskWriter(storage) {
  return createListWriter(storage, 'tasks', changeTasks);
}

export function createListWriter(storage, key, changeList) {
  let pending = Promise.resolve();
  return (action) => {
    const result = pending.then(async () => {
      const { [key]: items = [] } = await storage.get(key);
      const updated = changeList(items, action);
      if (updated !== items) {
        await storage.set({ [key]: updated });
      }
    });
    pending = result.catch(() => {});
    return result;
  };
}
