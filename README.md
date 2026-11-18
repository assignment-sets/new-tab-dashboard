# Tab Tasks

See your three newest unfinished tasks every time you open a regular Chrome tab. Add or complete tasks from the New Tab page or the toolbar popup. **Show more** expands the active list. **Completed** opens your history, where you can restore a task.

## Install in Chrome

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Choose **Load unpacked** and select this project's `extension` folder.
3. Open a new tab. If Chrome asks whether to keep the new page, choose **Keep it**.
4. To pin Tab Tasks, open the puzzle-piece menu in Chrome's toolbar and select the pin next to **Tab Tasks**.

Tab Tasks supplies its own New Tab page in regular windows. It replaces Chrome's built-in wallpaper and shortcuts while enabled. Chrome controls which New Tab replacement is active if you install more than one.

Tasks stay in this Chrome profile and are available offline. Clearing cached files or browsing history preserves them. Uninstalling the extension or deleting the Chrome profile removes the saved tasks.

## Development

Run `npm test` with Node.js 20 or later. There are no npm dependencies to install and no build step. After changing extension files, reload Tab Tasks from `chrome://extensions`, then reopen the popup or New Tab.
