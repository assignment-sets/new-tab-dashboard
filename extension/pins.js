export function normalizePin(address, label) {
  const input = address.trim();
  const hasWebScheme = /^https?:\/\//i.test(input);
  const bareHost = /^(?:localhost|[^/:?#\s]+\.[^/:?#\s]+|\[[a-f0-9:.]+\])(?::\d+)?(?:[/?#]|$)/i;
  const addressError = 'Enter a valid HTTP or HTTPS address.';
  if ((!hasWebScheme && !bareHost.test(input)) || /[\s\\]/.test(input)) {
    throw new Error(addressError);
  }
  const candidate = hasWebScheme ? input : 'https://' + input;
  if (!URL.canParse(candidate)) throw new Error(addressError);
  const url = new URL(candidate);
  if (url.username || url.password) {
    throw new Error(addressError);
  }
  return { url: url.href, label: label.trim() || url.hostname };
}

export class DuplicatePinError extends Error {
  constructor() {
    super('This site is already pinned.');
  }
}

function pinHostname(url) {
  return new URL(url).hostname.replace(/\.$/, '');
}

function preparePin(pins, id, url, label, previousUrl) {
  const pin = normalizePin(url, label);
  const hostname = pinHostname(pin.url);
  if (previousUrl && pinHostname(previousUrl) === hostname) return { id, ...pin };
  if (pins.some(existing => pinHostname(existing.url) === hostname)) {
    throw new DuplicatePinError();
  }
  return { id, ...pin };
}

export function changePins(pins, { type, id, url, label, direction }) {
  if (type === 'add') return [...pins, preparePin(pins, id, url, label)];

  const index = pins.findIndex(pin => pin.id === id);
  if (index === -1) {
    if (type === 'edit') throw new Error('This pin was removed in another tab.');
    return pins;
  }

  switch (type) {
    case 'edit':
      return pins.with(index, preparePin(pins, id, url, label, pins[index].url));
    case 'remove':
      return pins.toSpliced(index, 1);
    case 'move': {
      if (direction !== -1 && direction !== 1) return pins;
      const target = index + direction;
      if (target < 0 || target >= pins.length) return pins;
      return pins.with(index, pins[target]).with(target, pins[index]);
    }
    default:
      throw new Error('Unknown pin action.');
  }
}
