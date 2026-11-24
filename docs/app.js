// Authentic 3x5 pixel glyphs from extension/pixel-text.js
const PIXEL_GLYPHS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  ':': ['0', '1', '0', '1', '0'],
  '-': ['00', '00', '11', '00', '00'],
};

function drawPixelText(canvas, value, color) {
  if (!canvas) return;
  const characters = [...String(value)].map((ch) => PIXEL_GLYPHS[ch]).filter(Boolean);
  canvas.width = Math.max(1, characters.reduce((width, rows) => width + rows[0].length + 1, -1));
  canvas.height = 5;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  let left = 0;
  for (const rows of characters) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '1') context.fillRect(left + x, y, 1, 1);
      }
    });
    left += rows[0].length + 1;
  }
}

// Authentic dayPeriod from extension/day-period.js
function dayPeriod(date) {
  const hour = date.getHours();
  if (hour < 5 || hour >= 20) return 'Night';
  if (hour < 6) return 'Dawn';
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

// Authentic half-block weather art from extension/weather.js
const BLOCK_GLYPHS = [' ', '▀', '▄', '█'];

function drawWeather(rows) {
  const width = Math.max(...rows.map((row) => row.length));
  const lines = [];
  for (let row = 0; row < rows.length; row += 2) {
    const top = rows[row];
    const bottom = rows[row + 1] ?? '';
    const line = Array.from({ length: width }, (_, column) => {
      const upperHalf = Number(top[column] === '#');
      const lowerHalf = Number(bottom[column] === '#');
      return BLOCK_GLYPHS[upperHalf + 2 * lowerHalf];
    });
    lines.push(line.join(''));
  }
  return lines.join('\n');
}

function drawWeatherFrames(frames) {
  const height = Math.max(...frames.map((rows) => rows.length));
  const width = Math.max(...frames.flatMap((rows) => rows.map((row) => row.length)));
  return frames.map((rows) => {
    const padded = Array.from({ length: height }, (_, i) => (rows[i] ?? '').padEnd(width, ' '));
    return drawWeather(padded);
  });
}

const LOW_CLOUD = [
  '     ####',
  '    ######',
  '  #########',
  ' ###########',
  '#############',
  '#############',
  ' ###########',
];

const WEATHER_SCENES = [
  {
    key: 'sun',
    label: 'Clear',
    temp: 18,
    frames: drawWeatherFrames([
      [
        '       #',
        '       #',
        '  #         #',
        '   #       #',
        '      ###',
        '     #####',
        '    #######',
        '##  #######  ##',
        '    #######',
        '     #####',
        '      ###',
        '   #       #',
        '  #         #',
        '       #',
        '       #',
      ],
      [
        '',
        '       #',
        '   #       #',
        '  #         #',
        '      ###',
        '     #####',
        '    #######',
        ' #  #######  #',
        '    #######',
        '     #####',
        '      ###',
        '  #         #',
        '   #       #',
        '       #',
        '',
      ],
    ]),
  },
  {
    key: 'moon',
    label: 'Night',
    temp: 11,
    frames: drawWeatherFrames([
      [
        '      ####',
        '    #####',
        '   #####',
        '  #####      #',
        '  ####      ###',
        ' #####       #',
        ' #####',
        ' #####',
        '  #####',
        '  ######',
        '   ########  ##',
        '    ##########',
        '      ######',
      ],
      [
        '      ####',
        '    #####',
        '   #####',
        '  #####',
        '  ####       #',
        ' #####',
        ' #####',
        ' #####          #',
        '  #####',
        '  ######',
        '   ########  ##',
        '    ##########',
        '      ######',
      ],
      [
        '      ####',
        '    #####',
        '   #####',
        '  #####      #',
        '  ####      ###',
        ' #####       #',
        ' #####          #',
        ' #####         ###',
        '  #####         #',
        '  ######',
        '   ########  ##',
        '    ##########',
        '      ######',
      ],
    ]),
  },
  {
    key: 'partlyCloudy',
    label: 'Partly cloudy',
    temp: 16,
    frames: drawWeatherFrames([
      [
        '    #',
        ' #  #  #',
        '  #   #',
        '   ###',
        '  #####',
        '########  ###',
        '  #####  #####',
        '   ###  #######',
        '  #   #########',
        '     ###########',
        '     ###########',
        '      #########',
      ],
      [
        '',
        '    #',
        ' #     #',
        '   ###',
        '  #####',
        ' #######  ###',
        '  #####  #####',
        '   ###  #######',
        ' #    #########',
        '     ###########',
        '     ###########',
        '      #########',
      ],
      [
        '    #',
        '    #   #',
        '  #   #',
        '   ###',
        '  #####',
        '########  ###',
        '  #####  #####',
        '   ###  #######',
        '      #########',
        '     ###########',
        '     ###########',
        '      #########',
      ],
    ]),
  },
  {
    key: 'cloud',
    label: 'Overcast',
    temp: 14,
    frames: drawWeatherFrames([
      [
        '      ####',
        '     ######',
        '    ########',
        '  ###########',
        ' ##############',
        '################',
        '################',
        ' ##############',
      ],
      [
        '       ####',
        '      ######',
        '    #########',
        '  ############',
        ' ##############',
        '################',
        '################',
        ' ##############',
      ],
      [
        '     ####',
        '    ######',
        '   #########',
        '  ###########',
        ' ##############',
        '################',
        '################',
        ' ##############',
      ],
    ]),
  },
  {
    key: 'fog',
    label: 'Fog',
    temp: 9,
    frames: drawWeatherFrames([
      [
        '',
        '    ####',
        '   ######',
        '  ########',
        ' ##########',
        '  ########',
        '',
        ' #########',
        '',
        '   #########',
        '',
        '',
      ],
      [
        '',
        '    ####',
        '   ######',
        '  ########',
        ' ##########',
        '  ########',
        '',
        '  #########',
        '',
        '  #########',
        '',
        '',
      ],
      [
        '',
        '    ####',
        '   ######',
        '  ########',
        ' ##########',
        '  ########',
        '',
        '   #########',
        '',
        ' #########',
        '',
        '',
      ],
      [
        '',
        '    ####',
        '   ######',
        '  ########',
        ' ##########',
        '  ########',
        '',
        '  #########',
        '',
        '  #########',
        '',
        '',
      ],
    ]),
  },
  {
    key: 'drizzle',
    label: 'Drizzle',
    temp: 12,
    frames: drawWeatherFrames([
      [...LOW_CLOUD, '', '   #   #', '', '     #   #', '', ''],
      [...LOW_CLOUD, '', '', '   #   #', '', '     #   #', ''],
      [...LOW_CLOUD, '     #   #', '', '   #   #', '', '', ''],
    ]),
  },
  {
    key: 'rain',
    label: 'Rain',
    temp: 13,
    frames: drawWeatherFrames([
      [...LOW_CLOUD, '', '   #  #  #', '  #  #  #', ' #  #  #', '', ''],
      [...LOW_CLOUD, '    #  #  #', '   #  #  #', '  #  #  #', '', '', ''],
      [...LOW_CLOUD, '', '', '   #  #  #', '  #  #  #', ' #  #  #', ''],
    ]),
  },
  {
    key: 'snow',
    label: 'Snow',
    temp: -2,
    frames: drawWeatherFrames([
      [...LOW_CLOUD, '', '   #   #', '  ### ###', '   #   #', '', ''],
      [...LOW_CLOUD, '', '', '    #   #', '   ### ###', '    #   #', ''],
      [...LOW_CLOUD, '', '  #   #', ' ### ###', '  #   #', '', ''],
      [...LOW_CLOUD, '', '', '   #   #', '  ### ###', '   #   #', ''],
    ]),
  },
  {
    key: 'storm',
    label: 'Storm',
    temp: 15,
    frames: drawWeatherFrames([
      [...LOW_CLOUD, '     ###', '    ###', '     ###', '      ##', '     ##', '     #'],
      [...LOW_CLOUD, '   #     #', '  #     #', '     ##', '    ##', '    #', ''],
      [...LOW_CLOUD, '', '   #   #', '  #   #', ' #   #', '', ''],
      [...LOW_CLOUD, '     ###', '    ###', '   # ### #', '  #   ##', '     ##', '     #'],
    ]),
  },
];

function paintWeatherCanvas(canvas, art) {
  if (!canvas || !art) return;
  const context = canvas.getContext('2d');
  const lines = art.split('\n');
  const width = Math.max(...lines.map((line) => line.length));
  const left = Math.floor((canvas.width - width) / 2);
  const top = Math.floor((canvas.height - lines.length * 2) / 2);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = getComputedStyle(canvas).color || '#e5d6b8';
  lines.forEach((line, row) => {
    for (let column = 0; column < line.length; column++) {
      const block = line[column];
      const x = left + column;
      const y = top + row * 2;
      if (block === '▀' || block === '█') context.fillRect(x, y, 1, 1);
      if (block === '▄' || block === '█') context.fillRect(x, y + 1, 1, 1);
    }
  });
}

// Authentic Markdown parser from extension/scratchpad-format.js
function parseNote(source) {
  const blocks = [];
  let current = null;

  for (const line of source.split(/\r?\n/)) {
    const text = line.trim();
    if (!text) {
      current = null;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(text);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      current = null;
      continue;
    }

    const bullet = /^[-*+]\s+(.+)$/.exec(text);
    if (bullet) {
      if (current?.type !== 'list') {
        current = { type: 'list', items: [] };
        blocks.push(current);
      }
      current.items.push(bullet[1]);
    } else if (current?.type === 'paragraph') {
      current.text += ' ' + text;
    } else {
      current = { type: 'paragraph', text };
      blocks.push(current);
    }
  }
  return blocks;
}

function parseInline(text) {
  const tokens = [];
  let cursor = 0;
  for (const match of text.matchAll(/`([^`]+)`|\*\*([^*`]+)\*\*/g)) {
    if (match.index > cursor) tokens.push({ type: 'text', text: text.slice(cursor, match.index) });
    tokens.push(match[1] ? { type: 'code', text: match[1] } : { type: 'bold', text: match[2] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) tokens.push({ type: 'text', text: text.slice(cursor) });
  return tokens;
}

function appendInline(parent, text) {
  for (const token of parseInline(text)) {
    if (token.type === 'text') {
      parent.append(token.text);
    } else {
      const el = document.createElement(token.type === 'code' ? 'code' : 'strong');
      el.textContent = token.text;
      parent.append(el);
    }
  }
}

function renderFormattedNote(container, source) {
  const fragment = document.createDocumentFragment();
  const blocks = parseNote(source);
  if (!blocks.length) {
    const empty = document.createElement('p');
    empty.className = 'ext-empty';
    empty.textContent = 'Nothing to preview yet.';
    fragment.append(empty);
  }
  for (const block of blocks) {
    if (block.type === 'list') {
      const list = document.createElement('ul');
      for (const itemText of block.items) {
        const li = document.createElement('li');
        appendInline(li, itemText);
        list.append(li);
      }
      fragment.append(list);
    } else {
      const el = document.createElement(block.type === 'heading' ? 'h' + (block.level + 3) : 'p');
      appendInline(el, block.text);
      fragment.append(el);
    }
  }
  container.replaceChildren(fragment);
}

// Crisp 16x16 pixel-art SVGs matching extension/view.js
const rectPath = ([x, y, w = 1, h = 1]) => `M${x} ${y}h${w}v${h}h-${w}z`;
const PIXEL_ICONS = {
  delete: [[6, 1, 4], [2, 3, 12, 2], [3, 6, 1, 8], [12, 6, 1, 8], [3, 14, 10], [6, 7, 1, 5], [9, 7, 1, 5]],
  restore: [[2, 6, 1, 2], [3, 5, 1, 4], [4, 4, 1, 6], [5, 6, 8, 2], [12, 8, 2, 4], [6, 11, 7, 2]],
  complete: [[2, 7, 2, 2], [4, 9, 2, 2], [6, 7, 2, 2], [8, 5, 2, 2], [10, 3, 2, 2]],
  bell: [[7, 1, 2, 1], [5, 2, 6, 1], [4, 3, 1, 2], [11, 3, 1, 2], [3, 5, 1, 5], [12, 5, 1, 5], [2, 10, 12, 1], [6, 12, 4, 2]],
  bellOff: [[7, 1, 2, 1], [5, 2, 6, 1], [4, 3, 1, 2], [11, 3, 1, 2], [3, 5, 1, 5], [12, 5, 1, 5], [2, 10, 12, 1], [6, 12, 4, 2], ...[...Array(11)].map((_, k) => [2 + k, 2 + k, 2, 1])],
};

function createPixelSvg(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', PIXEL_ICONS[name].map(rectPath).join(''));
  svg.append(path);
  return svg;
}

// 1. Sticky Header & Mobile Drawer
function initNavigation() {
  const header = document.querySelector('#site-header');
  const toggle = document.querySelector('#mobile-menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');

  const syncScrollHairline = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 4);
  };
  syncScrollHairline();
  window.addEventListener('scroll', syncScrollHairline, { passive: true });

  const setMenuOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    mobileMenu.hidden = !open;
  };

  toggle.addEventListener('click', () => {
    setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileMenu.hidden) {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
    if (event.matches && !mobileMenu.hidden) setMenuOpen(false);
  });
}

// Generic keyboard-accessible tablist helper
function initTablist(tablistEl, onSelect, { focusOnSelect = true } = {}) {
  const tabs = [...tablistEl.querySelectorAll('[role="tab"]')];
  const activate = (index, shouldFocus) => {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    if (tablistEl.classList.contains('segmented')) {
      tablistEl.style.setProperty('--active-index', String(index));
    }
    if (shouldFocus) tabs[index].focus();
    onSelect(index, tabs[index]);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index, false));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      activate(next, focusOnSelect);
    });
  });

  return activate;
}

// 2. Hero Clock, Year Progress & Weather Sync
const DAY_MS = 24 * 60 * 60 * 1000;

function isoWeek(day) {
  const thursday = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 3 - ((day.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  return 1 + Math.round((((thursday - firstThursday) / DAY_MS) - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

function drawYearBar(now, canvas, yearLabel, percentEl, weekEl, rowEl) {
  if (!canvas) return;
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthDays = new Date(year, month + 1, 0).getDate();
  const dayOfYear = Math.round((new Date(year, month, now.getDate()) - new Date(year, 0, 1)) / DAY_MS) + 1;
  const yearDays = Math.round((new Date(year + 1, 0, 1) - new Date(year, 0, 1)) / DAY_MS);
  const filledColumns = month * 4 + Math.round((now.getDate() / monthDays) * 4);

  canvas.width = 12 * 5 - 1;
  canvas.height = 2;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = getComputedStyle(canvas).color || '#e5d6b8';
  for (let column = 0; column < 48; column++) {
    context.globalAlpha = column < filledColumns ? 1 : 0.28;
    context.fillRect(column + Math.floor(column / 4), 0, 1, 2);
  }
  context.globalAlpha = 1;

  const percent = Math.floor((dayOfYear / yearDays) * 100);
  const weekNum = isoWeek(now);
  if (yearLabel) yearLabel.textContent = String(year);
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (weekEl) weekEl.textContent = `W${weekNum}`;
  if (rowEl) rowEl.title = `Day ${dayOfYear} of ${yearDays} · ${percent}% of ${year} · ISO week ${weekNum}`;
}

function initClockAndYear() {
  const readable = document.querySelector('#demo-clock-readable');
  const digits = document.querySelector('#demo-clock-digits');
  const period = document.querySelector('#demo-clock-period');
  const timeEl = document.querySelector('#demo-clock-time');
  const dateEl = document.querySelector('#demo-clock-date');
  const dayPeriodEl = document.querySelector('#demo-clock-day-period');
  const weekDays = document.querySelectorAll('#demo-week-days > span');

  const demoYearLabel = document.querySelector('#demo-clock-year');
  const demoYearCanvas = document.querySelector('#demo-year-months');
  const demoYearPercent = document.querySelector('#demo-year-percent');
  const demoYearWeek = document.querySelector('#demo-clock-week');
  const demoYearRow = document.querySelector('#demo-year-row');

  const bentoYearLabel = document.querySelector('#bento-year-label');
  const bentoYearCanvas = document.querySelector('#bento-year-months');
  const bentoYearPercent = document.querySelector('#bento-year-percent');
  const bentoYearWeek = document.querySelector('#bento-year-week');

  const dateFormat = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const update = () => {
    const now = new Date();
    const hours = now.getHours();
    const value = `${hours % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
    const amPm = hours < 12 ? 'AM' : 'PM';
    const formattedTime = `${value} ${amPm}`;
    const formattedDate = dateFormat.format(now);
    const currentPeriod = dayPeriod(now);

    if (dayPeriodEl.textContent !== currentPeriod) {
      dayPeriodEl.textContent = currentPeriod;
    }

    if (dateEl.textContent !== formattedDate) {
      dateEl.textContent = formattedDate;
      drawYearBar(now, demoYearCanvas, demoYearLabel, demoYearPercent, demoYearWeek, demoYearRow);
      drawYearBar(now, bentoYearCanvas, bentoYearLabel, bentoYearPercent, bentoYearWeek, null);
      const mondayFirst = (now.getDay() + 6) % 7;
      weekDays.forEach((cell, idx) => {
        cell.classList.toggle('today', idx === mondayFirst);
        cell.classList.toggle('past', idx < mondayFirst);
      });
    }

    if (readable.textContent !== formattedTime) {
      drawPixelText(digits, value, getComputedStyle(timeEl).color || '#e5d6b8');
      period.textContent = amPm;
      readable.textContent = formattedTime;
    }

    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    dateEl.dateTime = `${now.getFullYear()}-${month}-${day}`;
    timeEl.dateTime = now.toTimeString().slice(0, 5);
  };

  update();
  setInterval(update, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) update();
  });
}

// 3. Weather Sync (Hero Weather + Bento 9-Condition Gallery + Pause Toggle)
function initWeather() {
  const heroIcon = document.querySelector('#demo-weather-icon');
  const heroTemp = document.querySelector('#demo-weather-temp');
  const heroConditionText = document.querySelector('#demo-weather-condition');
  const heroConditionBtn = document.querySelector('#demo-weather-condition-btn');
  const heroSummary = document.querySelector('#demo-weather-summary');
  const bentoGrid = document.querySelector('#bento-weather-grid');
  const bentoStatus = document.querySelector('#bento-weather-status');
  const pauseBtn = document.querySelector('#bento-weather-pause');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

  let selectedIndex = 0;
  let tick = 0;
  let userPaused = false;
  let timerId = null;

  const bentoItems = WEATHER_SCENES.map((scene, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bento-weather-btn';
    btn.setAttribute('aria-pressed', String(index === selectedIndex));
    btn.title = `${scene.label} (${scene.frames.length} frames)`;

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    canvas.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = scene.label;

    btn.append(canvas, label);
    btn.addEventListener('click', () => {
      selectedIndex = index;
      renderAll();
    });
    bentoGrid.append(btn);
    return { btn, canvas, scene };
  });

  const renderHeroWeather = () => {
    const scene = WEATHER_SCENES[selectedIndex];
    const frame = scene.frames[tick % scene.frames.length];
    paintWeatherCanvas(heroIcon, frame);
    drawPixelText(heroTemp, String(scene.temp), getComputedStyle(heroTemp).color || '#e5d6b8');
    heroConditionText.textContent = scene.label;
    heroConditionBtn.setAttribute('aria-label', `Cycle weather condition, currently ${scene.label}`);
    heroSummary.textContent = `${scene.temp}°C, ${scene.label}`;
  };

  const renderGallery = () => {
    bentoItems.forEach(({ btn, canvas, scene }, idx) => {
      btn.setAttribute('aria-pressed', String(idx === selectedIndex));
      const frame = scene.frames[tick % scene.frames.length];
      paintWeatherCanvas(canvas, frame);
    });
    const active = WEATHER_SCENES[selectedIndex];
    bentoStatus.textContent = `${active.label} · ${active.frames.length} frames`;
  };

  const renderAll = () => {
    renderHeroWeather();
    renderGallery();
  };

  const syncAnimation = () => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    const paused = userPaused || document.hidden || Boolean(reducedMotion?.matches);
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.textContent = userPaused ? 'Play' : 'Pause';
    if (!paused) {
      timerId = setInterval(() => {
        tick += 1;
        renderAll();
      }, 750);
    }
  };

  heroConditionBtn.addEventListener('click', () => {
    selectedIndex = (selectedIndex + 1) % WEATHER_SCENES.length;
    renderAll();
  });

  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    syncAnimation();
  });

  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion?.addEventListener?.('change', syncAnimation);

  renderAll();
  syncAnimation();
}

// 4. Shared Interactive Tasks & Reminders Workspace (Hero New Tab + 360px Toolbar Popup)
function initWorkspaces() {
  const newTabHost = document.querySelector('#demo-newtab-workspace');
  const popupHost = document.querySelector('#demo-popup-workspace');
  const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const now = Date.now();

  const state = {
    mode: 'tasks',
    showingHistory: false,
    popupExpanded: false,
    amount: 5,
    unitSeconds: 60,
    tasks: [
      { id: 't1', title: 'Review manifest permissions in extension', createdAt: now - 1000 * 60 * 12, completedAt: null },
      { id: 't2', title: 'Test 30s minimum duration on reminders', createdAt: now - 1000 * 60 * 35, completedAt: null },
      { id: 't3', title: 'Export updated unpacked folder', createdAt: now - 1000 * 60 * 90, completedAt: null },
      { id: 't4', title: 'Check Markdown preview inline code styling', createdAt: now - 1000 * 60 * 150, completedAt: null },
      { id: 't5', title: 'Pin MDN Docs and Open-Meteo', createdAt: now - 1000 * 60 * 300, completedAt: now - 1000 * 60 * 45 },
      { id: 't6', title: 'Verify offline local storage persistence', createdAt: now - 1000 * 60 * 520, completedAt: now - 1000 * 60 * 180 },
    ],
    reminders: [
      { id: 'r1', title: 'Standup sync', dueAt: now + 1000 * 60 * 18, completedAt: null },
      { id: 'r2', title: 'Stretch and refill water', dueAt: now + 1000 * 60 * 55, completedAt: null },
      { id: 'r3', title: 'Check build output', dueAt: now - 1000 * 60 * 40, completedAt: now - 1000 * 60 * 40 },
    ],
    notices: [
      { id: 'n1', title: 'Reminder', message: 'Standup prep was due 12 minutes ago' },
      { id: 'n2', title: 'Reminder', message: 'Posture break was due 1 hour ago' },
    ],
    noticesOpen: false,
    statusNote: '',
  };

  function createWorkspaceInstance(host, { isPopup }) {
    const header = document.createElement('div');
    header.className = 'ext-panel-bar';

    const modeTabs = document.createElement('div');
    modeTabs.className = 'ext-mode-tabs';
    modeTabs.setAttribute('role', 'tablist');
    modeTabs.setAttribute('aria-label', 'Workspace mode');

    const tasksTab = document.createElement('button');
    tasksTab.type = 'button';
    tasksTab.setAttribute('role', 'tab');
    tasksTab.textContent = 'Tasks';

    const remindersTab = document.createElement('button');
    remindersTab.type = 'button';
    remindersTab.setAttribute('role', 'tab');
    remindersTab.textContent = 'Reminders';
    const reminderDot = document.createElement('span');
    reminderDot.className = 'ext-notice-dot';
    reminderDot.setAttribute('aria-hidden', 'true');
    remindersTab.append(reminderDot);
    modeTabs.append(tasksTab, remindersTab);

    const actions = document.createElement('div');
    actions.className = 'ext-panel-actions';

    const inboxBtn = document.createElement('button');
    inboxBtn.type = 'button';
    inboxBtn.className = 'ext-icon-square';
    inboxBtn.title = 'Missed reminders';
    inboxBtn.setAttribute('aria-label', 'Missed reminders');
    inboxBtn.setAttribute('aria-expanded', 'false');
    const inboxDot = document.createElement('span');
    inboxDot.className = 'ext-notice-dot';
    inboxDot.setAttribute('aria-hidden', 'true');
    inboxBtn.append(createPixelSvg('bell'), inboxDot);

    const permBtn = document.createElement('button');
    permBtn.type = 'button';
    permBtn.className = 'ext-icon-square is-danger';
    permBtn.title = 'Desktop notifications stay optional';
    permBtn.setAttribute('aria-label', 'Desktop notifications stay optional');
    permBtn.append(createPixelSvg('bellOff'));

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'ext-btn';
    clearBtn.textContent = 'Clear all';

    actions.append(inboxBtn, permBtn, clearBtn);
    header.append(modeTabs, actions);

    // Missed reminders popover
    const popover = document.createElement('div');
    popover.className = 'ext-reminder-notices';
    popover.hidden = true;
    popover.setAttribute('role', 'region');
    popover.setAttribute('aria-label', 'Missed reminders');

    const popHeader = document.createElement('div');
    popHeader.className = 'ext-reminder-notices-header';
    const popTitle = document.createElement('span');
    popTitle.textContent = 'Missed reminders';
    const dismissAllBtn = document.createElement('button');
    dismissAllBtn.type = 'button';
    dismissAllBtn.className = 'ext-text-action';
    dismissAllBtn.textContent = 'Dismiss all';
    popHeader.append(popTitle, dismissAllBtn);

    const popList = document.createElement('div');
    popList.className = 'ext-reminder-notices-list';
    popover.append(popHeader, popList);

    // Status sub-tabs
    const subTabs = document.createElement('div');
    subTabs.className = 'ext-task-tabs';
    subTabs.setAttribute('role', 'tablist');
    subTabs.setAttribute('aria-label', 'Filter items');

    const activeTab = document.createElement('button');
    activeTab.type = 'button';
    activeTab.setAttribute('role', 'tab');
    activeTab.textContent = 'Current';

    const historyTab = document.createElement('button');
    historyTab.type = 'button';
    historyTab.setAttribute('role', 'tab');
    historyTab.textContent = 'Completed';
    subTabs.append(activeTab, historyTab);

    // Composer form
    const form = document.createElement('form');
    form.className = 'ext-composer';

    const durationFieldset = document.createElement('fieldset');
    durationFieldset.className = 'ext-reminder-duration';
    durationFieldset.setAttribute('aria-label', 'Reminder duration');
    const durLabel = document.createElement('label');
    durLabel.textContent = 'Remind me in ';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.min = '1';
    amountInput.step = '1';
    amountInput.value = String(state.amount);
    durLabel.append(amountInput);

    const unitsWrap = document.createElement('div');
    unitsWrap.className = 'ext-duration-units';
    unitsWrap.setAttribute('role', 'radiogroup');
    unitsWrap.setAttribute('aria-label', 'Time unit');

    const unitGroupName = isPopup ? 'popup-unit' : 'newtab-unit';
    const unitRadios = [
      ['Seconds', 1],
      ['Minutes', 60],
      ['Hours', 3600],
    ].map(([unitName, seconds]) => {
      const label = document.createElement('label');
      label.title = unitName;
      const radio = document.createElement('input');
      radio.className = 'visually-hidden';
      radio.type = 'radio';
      radio.name = unitGroupName;
      radio.value = String(seconds);
      radio.setAttribute('aria-label', unitName);
      radio.checked = seconds === state.unitSeconds;
      const pill = document.createElement('span');
      pill.setAttribute('aria-hidden', 'true');
      pill.textContent = unitName[0];
      label.append(radio, pill);
      unitsWrap.append(label);
      return radio;
    });
    durationFieldset.append(durLabel, unitsWrap);

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.maxLength = 240;
    titleInput.autocomplete = 'off';
    titleInput.setAttribute('aria-label', 'New item title');

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'ext-btn ext-composer-submit';
    submitBtn.textContent = 'Add';

    form.append(durationFieldset, titleInput, submitBtn);

    const listEl = document.createElement('ul');
    listEl.className = 'ext-task-list';

    const emptyEl = document.createElement('p');
    emptyEl.className = 'ext-empty';

    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'ext-btn ext-more';
    moreBtn.hidden = true;

    const statusEl = document.createElement('p');
    statusEl.className = 'ext-empty';
    statusEl.hidden = true;
    statusEl.setAttribute('role', 'status');

    host.replaceChildren(header, popover, subTabs, form, emptyEl, listEl, moreBtn, statusEl);

    // Events
    const syncSubmitDisabled = () => {
      const remindersMode = state.mode === 'reminders';
      if (remindersMode) {
        const val = amountInput.valueAsNumber;
        const min = state.unitSeconds === 1 ? 30 : 1;
        submitBtn.disabled = !Number.isFinite(val) || val < min;
      } else {
        submitBtn.disabled = !titleInput.value.trim();
      }
    };

    titleInput.addEventListener('input', syncSubmitDisabled);
    amountInput.addEventListener('input', () => {
      if (Number.isFinite(amountInput.valueAsNumber)) {
        state.amount = Math.max(1, Math.floor(amountInput.valueAsNumber));
      }
      syncSubmitDisabled();
    });

    unitRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        state.unitSeconds = Number(radio.value);
        if (state.unitSeconds === 1 && amountInput.valueAsNumber < 30) {
          state.amount = 30;
          amountInput.value = '30';
        }
        renderAllWorkspaces();
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = titleInput.value.trim();
      const id = 'item-' + Math.random().toString(36).slice(2, 8);
      if (state.mode === 'tasks') {
        if (!text) return;
        state.tasks.unshift({ id, title: text, createdAt: Date.now(), completedAt: null });
      } else {
        const seconds = Math.max(state.unitSeconds === 1 ? 30 : 1, Math.floor(amountInput.valueAsNumber || 5)) * state.unitSeconds;
        state.reminders.unshift({
          id,
          title: text || 'Reminder',
          dueAt: Date.now() + seconds * 1000,
          completedAt: null,
        });
      }
      titleInput.value = '';
      state.showingHistory = false;
      state.statusNote = '';
      renderAllWorkspaces();
      titleInput.focus();
    });

    initTablist(modeTabs, (index) => {
      state.mode = index === 0 ? 'tasks' : 'reminders';
      state.showingHistory = false;
      state.popupExpanded = false;
      state.statusNote = '';
      renderAllWorkspaces();
    });

    initTablist(subTabs, (index) => {
      state.showingHistory = index === 1;
      state.statusNote = '';
      renderAllWorkspaces();
    });

    clearBtn.addEventListener('click', () => {
      if (state.mode === 'tasks') state.tasks = [];
      else state.reminders = [];
      state.statusNote = '';
      renderAllWorkspaces();
    });

    inboxBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      state.noticesOpen = !state.noticesOpen;
      renderAllWorkspaces();
    });

    permBtn.addEventListener('click', () => {
      state.statusNote = 'Notifications remain optional until enabled in Chrome.';
      renderAllWorkspaces();
    });

    dismissAllBtn.addEventListener('click', () => {
      state.notices = [];
      state.noticesOpen = false;
      renderAllWorkspaces();
    });

    moreBtn.addEventListener('click', () => {
      state.popupExpanded = !state.popupExpanded;
      renderAllWorkspaces();
    });

    document.addEventListener('click', (event) => {
      if (state.noticesOpen && !popover.contains(event.target) && !inboxBtn.contains(event.target)) {
        state.noticesOpen = false;
        renderAllWorkspaces();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.noticesOpen) {
        state.noticesOpen = false;
        renderAllWorkspaces();
      }
    });

    function render() {
      const remindersMode = state.mode === 'reminders';
      tasksTab.setAttribute('aria-selected', String(!remindersMode));
      tasksTab.tabIndex = remindersMode ? -1 : 0;
      remindersTab.setAttribute('aria-selected', String(remindersMode));
      remindersTab.tabIndex = remindersMode ? 0 : -1;

      const hasNotices = state.notices.length > 0;
      reminderDot.hidden = !hasNotices;
      inboxBtn.hidden = !hasNotices;
      inboxBtn.setAttribute('aria-expanded', String(state.noticesOpen && hasNotices));
      permBtn.hidden = !remindersMode;

      popover.hidden = !(state.noticesOpen && hasNotices);
      const noticeFrag = document.createDocumentFragment();
      for (const notice of state.notices) {
        const row = document.createElement('div');
        const msg = document.createElement('p');
        msg.textContent = `${notice.title}: ${notice.message}`;
        const dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.className = 'ext-text-action';
        dismiss.textContent = 'Dismiss';
        dismiss.addEventListener('click', (e) => {
          e.stopPropagation();
          state.notices = state.notices.filter((n) => n.id !== notice.id);
          if (!state.notices.length) state.noticesOpen = false;
          renderAllWorkspaces();
        });
        row.append(msg, dismiss);
        noticeFrag.append(row);
      }
      popList.replaceChildren(noticeFrag);

      activeTab.textContent = remindersMode ? 'Pending' : 'Current';
      historyTab.textContent = remindersMode ? 'Fired' : 'Completed';
      activeTab.setAttribute('aria-selected', String(!state.showingHistory));
      activeTab.tabIndex = state.showingHistory ? -1 : 0;
      historyTab.setAttribute('aria-selected', String(state.showingHistory));
      historyTab.tabIndex = state.showingHistory ? 0 : -1;

      form.hidden = state.showingHistory;
      durationFieldset.hidden = durationFieldset.disabled = !remindersMode;
      amountInput.min = state.unitSeconds === 1 ? '30' : '1';
      if (document.activeElement !== amountInput) amountInput.value = String(state.amount);
      unitRadios.forEach((r) => {
        r.checked = Number(r.value) === state.unitSeconds;
      });
      titleInput.placeholder = remindersMode ? 'Message (optional)' : 'Add a task…';
      submitBtn.textContent = remindersMode ? 'Add reminder' : 'Add';

      const source = remindersMode ? state.reminders : state.tasks;
      clearBtn.disabled = source.length === 0;
      const activeItems = remindersMode
        ? source.filter((r) => r.completedAt === null).sort((a, b) => a.dueAt - b.dueAt)
        : source.filter((t) => t.completedAt === null).sort((a, b) => b.createdAt - a.createdAt);
      const historyItems = remindersMode
        ? source.filter((r) => r.completedAt !== null).sort((a, b) => b.completedAt - a.completedAt)
        : source.filter((t) => t.completedAt !== null).sort((a, b) => b.completedAt - a.completedAt);

      const visible = state.showingHistory
        ? historyItems
        : (!isPopup || state.popupExpanded ? activeItems : activeItems.slice(0, 3));

      emptyEl.hidden = visible.length > 0;
      emptyEl.textContent = remindersMode
        ? (state.showingHistory ? 'Completed reminders will appear here.' : 'No pending reminders.')
        : (state.showingHistory ? 'Completed tasks will appear here.' : 'All clear. Add a task when you are ready.');

      listEl.hidden = visible.length === 0;
      const frag = document.createDocumentFragment();
      for (const item of visible) {
        const li = document.createElement('li');
        const completed = item.completedAt !== null;
        const details = document.createElement('div');
        const title = document.createElement('span');
        title.className = 'ext-task-title';
        title.textContent = item.title;
        details.append(title);

        if (completed || remindersMode) {
          const time = document.createElement('time');
          const dateVal = new Date(item.completedAt ?? item.dueAt);
          time.dateTime = dateVal.toISOString();
          time.textContent = remindersMode
            ? `${completed ? 'Fired' : 'Due'} ${dateTimeFmt.format(dateVal)}`
            : dateFmt.format(dateVal);
          details.append(time);
        }

        if (!completed && !remindersMode) {
          const checkBtn = document.createElement('button');
          checkBtn.type = 'button';
          checkBtn.className = 'ext-check';
          checkBtn.setAttribute('aria-label', `Complete ${item.title}`);
          checkBtn.append(createPixelSvg('complete'));
          checkBtn.addEventListener('click', () => {
            const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            const finish = () => {
              item.completedAt = Date.now();
              renderAllWorkspaces();
            };
            if (reduced) {
              finish();
            } else if (!li.classList.contains('completing')) {
              li.classList.add('completing');
              setTimeout(finish, 160);
            }
          });
          li.append(checkBtn, details);
        } else {
          li.append(details);
        }

        const itemActions = document.createElement('div');
        itemActions.className = 'ext-task-actions';
        if (completed && !remindersMode) {
          const restoreBtn = document.createElement('button');
          restoreBtn.type = 'button';
          restoreBtn.className = 'ext-task-icon';
          restoreBtn.title = 'Restore';
          restoreBtn.setAttribute('aria-label', `Restore ${item.title}`);
          restoreBtn.append(createPixelSvg('restore'));
          restoreBtn.addEventListener('click', () => {
            item.completedAt = null;
            renderAllWorkspaces();
          });
          itemActions.append(restoreBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'ext-task-icon ext-task-delete';
        deleteBtn.title = 'Delete';
        deleteBtn.setAttribute('aria-label', `Delete ${item.title}`);
        deleteBtn.append(createPixelSvg('delete'));
        deleteBtn.addEventListener('click', () => {
          if (remindersMode) state.reminders = state.reminders.filter((r) => r.id !== item.id);
          else state.tasks = state.tasks.filter((t) => t.id !== item.id);
          renderAllWorkspaces();
        });

        itemActions.append(deleteBtn);
        li.append(itemActions);
        frag.append(li);
      }
      listEl.replaceChildren(frag);

      moreBtn.hidden = !isPopup || state.showingHistory || activeItems.length <= 3;
      moreBtn.textContent = state.popupExpanded ? 'Show less' : `Show more (${activeItems.length - 3})`;
      moreBtn.setAttribute('aria-expanded', String(state.popupExpanded));

      statusEl.hidden = !state.statusNote;
      statusEl.textContent = state.statusNote;

      syncSubmitDisabled();
    }

    return { render };
  }

  const newTabView = createWorkspaceInstance(newTabHost, { isPopup: false });
  const popupView = createWorkspaceInstance(popupHost, { isPopup: true });

  function renderAllWorkspaces() {
    newTabView.render();
    popupView.render();
  }

  renderAllWorkspaces();
}

// 5. Interactive Scratchpad inside Stage
function initScratchpad() {
  const tabsHost = document.querySelector('#demo-scratchpad-tabs');
  const addBtn = document.querySelector('#demo-scratchpad-add');
  const toggleBtn = document.querySelector('#demo-scratchpad-toggle');
  const textarea = document.querySelector('#demo-scratchpad-note');
  const preview = document.querySelector('#demo-scratchpad-preview');

  const notes = [
    {
      id: 'today',
      title: 'Today',
      text: [
        '# Morning focus',
        '- Review manifest permissions for `storage` and `alarms`',
        '- Test **30s** minimum duration on reminders',
        '- Keep all notes offline in `chrome.storage.local`',
        '',
        'HTML tags like `<script>` stay literal in preview.',
      ].join('\n'),
    },
    {
      id: 'commands',
      title: 'Commands',
      text: [
        '## Keyboard controls',
        '- `Shift+F10` opens pin context menus',
        '- `ArrowLeft` and `ArrowRight` switch workspace tabs',
        '- **Double-click** a note tab inside the extension to rename',
      ].join('\n'),
    },
  ];

  let activeId = notes[0].id;
  let showingPreview = false;

  const renderTabs = () => {
    const frag = document.createDocumentFragment();
    notes.forEach((note, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.id = `demo-sp-tab-${note.id}`;
      btn.textContent = note.title;
      const selected = note.id === activeId;
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
      btn.addEventListener('click', () => selectNote(note.id));
      btn.addEventListener('keydown', (event) => {
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % notes.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + notes.length) % notes.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = notes.length - 1;
        if (nextIndex === undefined) return;
        event.preventDefault();
        selectNote(notes[nextIndex].id, true);
      });
      frag.append(btn);
    });
    tabsHost.replaceChildren(frag);
  };

  const syncEditorAndPreview = () => {
    const active = notes.find((n) => n.id === activeId);
    if (!active) return;
    if (textarea.value !== active.text) textarea.value = active.text;
    preview.hidden = !showingPreview;
    textarea.hidden = showingPreview;
    toggleBtn.setAttribute('aria-pressed', String(showingPreview));
    if (showingPreview) renderFormattedNote(preview, active.text);
  };

  const selectNote = (id, focusTab = false) => {
    activeId = id;
    renderTabs();
    syncEditorAndPreview();
    if (focusTab) document.querySelector(`#demo-sp-tab-${id}`)?.focus();
  };

  textarea.addEventListener('input', () => {
    const active = notes.find((n) => n.id === activeId);
    if (active) active.text = textarea.value;
    if (showingPreview) renderFormattedNote(preview, textarea.value);
  });

  toggleBtn.addEventListener('click', () => {
    showingPreview = !showingPreview;
    syncEditorAndPreview();
  });

  addBtn.addEventListener('click', () => {
    if (notes.length >= 6) return;
    const num = notes.length - 1;
    const id = 'note-' + Date.now().toString(36);
    notes.push({
      id,
      title: num === 1 ? 'Scratch' : `Note ${num}`,
      text: '### New note\n- Write plain text or **Markdown** bullets',
    });
    showingPreview = false;
    selectNote(id);
    textarea.focus();
  });

  renderTabs();
  syncEditorAndPreview();
}

// 6. Interactive Pinned Sites inside Stage (Drag Reorder + Context Menu)
function initPins() {
  const listEl = document.querySelector('#demo-pin-list');
  const menuEl = document.querySelector('#demo-item-menu');

  let pins = [
    { id: 'p1', label: 'GitHub', host: 'github.com' },
    { id: 'p2', label: 'MDN Docs', host: 'developer.mozilla.org' },
    { id: 'p3', label: 'Open-Meteo', host: 'open-meteo.com' },
    { id: 'p4', label: 'Localhost', host: 'localhost:3000' },
    { id: 'p5', label: 'Calendar', host: 'calendar.example' },
  ];

  let draggedId = null;
  let destination = null;

  const clearMarker = () => {
    listEl.removeAttribute('data-drop');
    destination = null;
  };

  const closeMenu = () => {
    menuEl.hidden = true;
    menuEl.replaceChildren();
  };

  const openMenuForPin = (event, trigger, pinIndex) => {
    event.preventDefault();
    const pin = pins[pinIndex];
    const items = [
      {
        label: 'Move earlier',
        disabled: pinIndex === 0,
        run: () => movePin(pinIndex, -1),
      },
      {
        label: 'Move later',
        disabled: pinIndex === pins.length - 1,
        run: () => movePin(pinIndex, 1),
      },
    ];

    menuEl.replaceChildren(...items.map((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ext-btn';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.label;
      btn.disabled = item.disabled;
      btn.addEventListener('click', () => {
        closeMenu();
        item.run();
      });
      return btn;
    }));
    menuEl.hidden = false;
    const rect = trigger.getBoundingClientRect();
    const left = event.type === 'contextmenu' && event.clientX ? event.clientX : rect.left;
    const top = event.type === 'contextmenu' && event.clientY ? event.clientY : rect.bottom + 4;
    menuEl.style.left = `${Math.max(8, Math.min(left, window.innerWidth - 160))}px`;
    menuEl.style.top = `${Math.max(8, Math.min(top, window.innerHeight - 96))}px`;
    menuEl.querySelector('button:enabled')?.focus();
  };

  const movePin = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= pins.length) return;
    const next = [...pins];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    pins = next;
    renderPins();
  };

  function dropPosition(event) {
    const rows = [...listEl.children];
    let closest;
    let vertical = Infinity;
    let horizontal = Infinity;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const dy = Math.max(rect.top - event.clientY, event.clientY - rect.bottom, 0);
      const dx = Math.max(rect.left - event.clientX, event.clientX - rect.right, 0);
      if (dy < vertical || (dy === vertical && dx < horizontal)) {
        closest = row;
        vertical = dy;
        horizontal = dx;
      }
    }
    if (!closest) return;
    const rect = closest.getBoundingClientRect();
    const gap = rows.indexOf(closest) + (event.clientX >= rect.left + rect.width / 2 ? 1 : 0);
    const source = pins.findIndex((p) => p.id === draggedId);
    if (source < 0 || gap === source || gap === source + 1) return;
    const after = gap === rows.length;
    const index = after ? gap - 1 : gap;
    return { index, after, row: rows[index] };
  }

  function renderPins() {
    const frag = document.createDocumentFragment();
    pins.forEach((pin, index) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ext-pin-link';
      btn.draggable = true;
      btn.title = `${pin.label} (${pin.host})`;
      btn.setAttribute('aria-label', `${pin.label}, ${pin.host}. Press Shift+F10 for reorder menu`);
      btn.setAttribute('aria-haspopup', 'menu');

      const mark = document.createElement('span');
      mark.className = 'ext-pin-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = Array.from(pin.label)[0].toUpperCase();

      const label = document.createElement('span');
      label.className = 'ext-pin-label';
      label.textContent = pin.label;

      btn.append(mark, label);
      li.append(btn);

      li.addEventListener('contextmenu', (e) => openMenuForPin(e, btn, index));
      li.addEventListener('keydown', (e) => {
        if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
          openMenuForPin(e, btn, index);
        }
      });
      btn.addEventListener('click', (e) => openMenuForPin(e, btn, index));
      btn.addEventListener('dragstart', (e) => {
        draggedId = pin.id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', pin.id);
      });

      frag.append(li);
    });
    clearMarker();
    listEl.replaceChildren(frag);
  }

  listEl.addEventListener('dragover', (event) => {
    if (!draggedId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const pos = dropPosition(event);
    if (!pos) return clearMarker();
    destination = pos;
    const inset = pos.row.offsetLeft === 0 || pos.after ? 0 : parseFloat(getComputedStyle(listEl).columnGap) / 2;
    listEl.style.setProperty('--drop-x', `${pos.row.offsetLeft + (pos.after ? pos.row.offsetWidth : -inset)}px`);
    listEl.style.setProperty('--drop-y', `${pos.row.offsetTop}px`);
    listEl.style.setProperty('--drop-height', `${pos.row.offsetHeight}px`);
    listEl.setAttribute('data-drop', '');
  });

  listEl.addEventListener('dragleave', (event) => {
    if (!listEl.contains(event.relatedTarget)) clearMarker();
  });

  listEl.addEventListener('drop', (event) => {
    if (!draggedId) return;
    event.preventDefault();
    if (destination) {
      const from = pins.findIndex((p) => p.id === draggedId);
      if (from >= 0) {
        const rest = pins.filter((p) => p.id !== draggedId);
        const neighborIndex = rest.findIndex((p) => p.id === pins[destination.index].id);
        const target = neighborIndex + (destination.after ? 1 : 0);
        rest.splice(target, 0, pins[from]);
        pins = rest;
        renderPins();
      }
    }
    draggedId = null;
    clearMarker();
  });

  document.addEventListener('dragend', () => {
    draggedId = null;
    clearMarker();
  });

  document.addEventListener('click', (event) => {
    if (!menuEl.hidden && !menuEl.contains(event.target) && !listEl.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menuEl.hidden) closeMenu();
  });

  renderPins();
}

// 7. Stage View Switcher (New Tab <-> Toolbar Popup)
function initStageSwitcher() {
  const tablist = document.querySelector('.stage-controls [role="tablist"]');
  const newTabPanel = document.querySelector('#stage-panel-newtab');
  const popupPanel = document.querySelector('#stage-panel-popup');
  const tabLabel = document.querySelector('#browser-tab-label');
  const urlLabel = document.querySelector('#browser-url-label');
  const toolbarBtn = document.querySelector('#chrome-toolbar-action');

  const activate = initTablist(tablist, (index) => {
    const isPopup = index === 1;
    newTabPanel.hidden = isPopup;
    popupPanel.hidden = !isPopup;
    tabLabel.textContent = isPopup ? 'Extensions' : 'New Tab';
    urlLabel.textContent = isPopup ? 'developer.chrome.com/docs/extensions' : 'chrome://newtab';
    toolbarBtn.setAttribute('aria-pressed', String(isPopup));
  });

  toolbarBtn.addEventListener('click', () => {
    const nextIndex = popupPanel.hidden ? 1 : 0;
    activate(nextIndex, false);
  });
}

// 8. Bento Mini Interactive Controls (Tile 2 Reminders + Tile 3 Mini Scratchpad)
function initBentoControls() {
  // Tile 2: unit selector + missed card toggle
  const unitButtons = document.querySelectorAll('[data-bento-unit]');
  const unitReadout = document.querySelector('#bento-unit-readout');
  const missedToggle = document.querySelector('#bento-missed-toggle');
  const missedCard = document.querySelector('#bento-missed-card');

  const labels = {
    S: '30s timer · 30s min',
    M: '5m timer · 30s min',
    H: '5h timer · 30s min',
  };

  unitButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const unit = btn.dataset.bentoUnit;
      unitButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      unitReadout.textContent = labels[unit];
    });
  });

  missedToggle.addEventListener('click', () => {
    const open = missedCard.hidden;
    missedCard.hidden = !open;
    missedToggle.setAttribute('aria-expanded', String(open));
  });

  // Tile 3: Raw / Preview toggle
  const rawBtn = document.querySelector('#bento-md-raw');
  const previewBtn = document.querySelector('#bento-md-preview');
  const rawView = document.querySelector('#bento-md-raw-view');
  const previewView = document.querySelector('#bento-md-preview-view');
  const sampleMd = rawView.textContent;

  const setMode = (previewMode) => {
    rawBtn.setAttribute('aria-pressed', String(!previewMode));
    previewBtn.setAttribute('aria-pressed', String(previewMode));
    rawView.hidden = previewMode;
    previewView.hidden = !previewMode;
    if (previewMode) renderFormattedNote(previewView, sampleMd);
  };

  rawBtn.addEventListener('click', () => setMode(false));
  previewBtn.addEventListener('click', () => setMode(true));
}

// 9. Install Section Toggle + Clipboard Copy
function initInstallSection() {
  const tablist = document.querySelector('.install-header [role="tablist"]');
  const zipPanel = document.querySelector('#install-step-zip');
  const gitPanel = document.querySelector('#install-step-git');
  const copyStatus = document.querySelector('#copy-status');

  initTablist(tablist, (index) => {
    const isGit = index === 1;
    zipPanel.hidden = isGit;
    gitPanel.hidden = !isGit;
  });

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  document.querySelectorAll('[data-copy-text]').forEach((btn) => {
    let timer = null;
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copyText;
      const label = btn.querySelector('.copy-label') ?? btn;
      try {
        await copyText(value);
        label.textContent = 'Copied';
        btn.classList.add('is-copied');
        copyStatus.textContent = `Copied ${value} to clipboard.`;
        clearTimeout(timer);
        timer = setTimeout(() => {
          label.textContent = 'Copy';
          btn.classList.remove('is-copied');
        }, 2000);
      } catch {
        copyStatus.textContent = 'Copy unavailable in this browser.';
      }
    });
  });
}

// 10. Docs Tabbed Reference
function initDocsTabs() {
  const tablist = document.querySelector('.docs-tablist');
  const panels = [
    document.querySelector('#docs-panel-privacy'),
    document.querySelector('#docs-panel-syntax'),
    document.querySelector('#docs-panel-faq'),
  ];

  initTablist(tablist, (index) => {
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
    });
  });
}

// Boot all modules
initNavigation();
initClockAndYear();
initWeather();
initWorkspaces();
initScratchpad();
initPins();
initStageSwitcher();
initBentoControls();
initInstallSection();
initDocsTabs();
