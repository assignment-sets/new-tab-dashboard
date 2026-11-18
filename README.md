# Tab Tasks

Open a regular Chrome tab to see your local date and time, pinned sites, and task sidebar. Use **Add pin** to save a URL and **Manage pins** to edit, reorder, or remove shortcuts. Tab Tasks tries each pinned site's standard favicon URL directly and shows an initial if the icon is unavailable.

Use **Add city** in the clock panel to look up your city and see the current temperature in Celsius with a block-character weather icon. Click the pencil beside the city to change the saved location. Weather comes from [Open-Meteo](https://open-meteo.com/) and requires an internet connection.

Use the **Current** and **Completed** tabs to switch between unfinished tasks and history. Use **Edit** to rename a task or **Delete** to remove it after confirming. These controls are available in the sidebar and toolbar popup. The sidebar shows the full current list. The popup starts with the three newest tasks and offers **Show more**.

Use **Clear all** in the Tasks header to delete both current and completed tasks after confirming.

The **Scratchpad** on the New Tab page saves as you type. Use **Preview** to see headings, bullets, bold text, and inline code.

## Install in Chrome

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Choose **Load unpacked** and select this project's `extension` folder.
3. Open a new tab. If Chrome asks whether to keep the new page, choose **Keep it**.
4. To pin Tab Tasks, open the puzzle-piece menu in Chrome's toolbar and select the pin next to **Tab Tasks**.

Tab Tasks supplies its own New Tab page in regular windows. It replaces Chrome's built-in wallpaper and shortcuts while enabled. Chrome controls which New Tab replacement is active if you install more than one.

To hide Chrome's attribution bar, right-click the footer and select **Hide footer on New Tab page**.

Tasks, pinned sites, and the scratchpad stay in this Chrome profile and are available offline. Clearing cached files or browsing history preserves them. Uninstalling the extension or deleting the Chrome profile removes the saved data.

## Development

Run `npm test` with Node.js 20 or later. There are no npm dependencies to install and no build step. After changing extension files, reload Tab Tasks from `chrome://extensions`, then reopen the popup or New Tab.
