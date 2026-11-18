// All action menus share a single top-layer popover.
const menu = document.createElement('div');
menu.popover = 'auto';
menu.id = 'item-menu';
let invoker;
menu.addEventListener('beforetoggle', event => {
  invoker?.setAttribute('aria-expanded', String(event.newState === 'open'));
});
menu.className = 'item-menu';
menu.setAttribute('role', 'menu');
document.body.append(menu);

menu.addEventListener('keydown', event => {
  const items = [...menu.querySelectorAll('button:enabled')];
  const index = items.indexOf(document.activeElement);
  const next = { ArrowDown: items[(index + 1) % items.length],
    ArrowUp: items[(index - 1 + items.length) % items.length], Home: items[0], End: items.at(-1) }[event.key];
  if (next) {
    event.preventDefault();
    next.focus();
  }
  if (event.key === 'Tab') menu.hidePopover();
});

export function attachActions(row, trigger, title, actions) {
  row.classList.add('action-item');
  trigger.setAttribute('aria-haspopup', 'menu');
  const open = event => openMenu(event, trigger, title, actions);
  row.addEventListener('contextmenu', open);
  row.addEventListener('keydown', event => {
    if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') open(event);
  });
}

export function openMenu(event, trigger, title, actions) {
  if (event.target instanceof HTMLInputElement) return;
  event.preventDefault();
  if (menu.matches(':popover-open')) {
    menu.hidePopover();
    if (event.type === 'click' && trigger === invoker) return;
  }
  invoker = trigger;
  trigger.focus({ preventScroll: true });
  menu.setAttribute('aria-label', title);
  menu.replaceChildren(...actions.map(action => {
    const button = document.createElement('button');
    button.className = action.className ?? 'secondary';
    button.setAttribute('role', 'menuitem');
    button.textContent = action.label;
    button.disabled = Boolean(action.disabled);
    button.onclick = () => {
      menu.hidePopover();
      action.run();
    };
    return button;
  }));
  menu.showPopover({ source: trigger });
  const box = trigger.getBoundingClientRect();
  const mouse = event.type === 'contextmenu' && event.button === 2;
  const left = event.type === 'click' ? box.right - menu.offsetWidth : box.left;
  menu.style.left = Math.max(0, Math.min(mouse ? event.clientX : left, innerWidth - menu.offsetWidth)) + 'px';
  menu.style.top = Math.max(0, Math.min(mouse ? event.clientY : box.bottom, innerHeight - menu.offsetHeight)) + 'px';
  menu.querySelector('button:enabled').focus({ preventScroll: true });
}
