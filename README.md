# New Tab Dashboard

A calm, personal dashboard that takes over Chrome's New Tab page.

New Tab Dashboard brings the small things you reach for throughout the day into one place: tasks, pinned sites, a scratchpad, a local clock, and optional weather. It runs as a lightweight Chrome extension and keeps your personal data in the current Chrome profile.

## What it includes

- **Tasks** — Add, edit, complete, and delete tasks. Switch between current tasks and completed history, or clear everything after confirmation.
- **Pinned sites** — Save frequently used links, use their favicons when available, drag them into a new order, and manage them from a context menu.
- **Scratchpad** — Keep multiple notes, rename or delete them, save as you type, and preview simple Markdown-style formatting such as headings, bullets, bold text, and inline code.
- **Clock and date** — See the current local date and time in a compact dashboard display.
- **Weather** — Look up a city and see the current temperature and a small block-art weather icon. Weather data comes from [Open-Meteo](https://open-meteo.com/).
- **Popup access** — Review and manage tasks from the extension toolbar popup without leaving the page you are on.
- **Keyboard-friendly controls** — Context menus support right-click, `Shift+F10`, and the Context Menu key.

## Install in Chrome

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Select **Load unpacked** and choose the repository's `extension` folder.
4. Open a new tab. If Chrome asks whether to keep the new page, choose **Keep it**.
5. To keep the toolbar popup handy, open Chrome's puzzle-piece menu and pin **New Tab**.

The extension supplies its own New Tab page in regular Chrome windows. It replaces Chrome's built-in wallpaper and shortcuts while enabled. If multiple extensions provide a New Tab page, Chrome decides which one is active.

## Privacy and storage

Tasks, pinned sites, and scratchpad notes are stored locally in Chrome extension storage for the current profile. They are available offline and are not sent to a server by this extension.

The optional weather feature needs an internet connection and uses Open-Meteo to search for cities and retrieve current weather. Pinned-site favicons may be requested from the pinned sites' standard favicon URLs.

Uninstalling the extension or deleting the Chrome profile removes its saved data. Clearing cached files or browsing history does not.

## Development

The project has no build step and no runtime npm dependencies. It uses native browser APIs and ES modules.

```bash
npm test
```

Tests require Node.js 20 or later. After changing files in `extension`, reload **New Tab** from `chrome://extensions`, then reopen the popup or a New Tab page.

## Project structure

```text
extension/   Chrome extension source and assets
test/        Node.js tests for task, pin, scratchpad, and weather logic
```

## License

This project is available under the [MIT License](LICENSE).
