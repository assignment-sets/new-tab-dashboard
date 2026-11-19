const blockGlyphs = [' ', '▀', '▄', '█'];

function drawWeather(rows) {
  // A half-block glyph fits two rows of the drawing into one line of text.
  const width = Math.max(...rows.map(row => row.length));
  const lines = [];
  for (let row = 0; row < rows.length; row += 2) {
    const top = rows[row];
    const bottom = rows[row + 1] ?? '';
    const line = Array.from({ length: width }, (_, column) => {
      const upperHalf = Number(top[column] === '#');
      const lowerHalf = Number(bottom[column] === '#');
      return blockGlyphs[upperHalf + 2 * lowerHalf];
    });
    lines.push(line.join(''));
  }
  return lines.join('\n');
}

function drawWeatherFrames(frames) {
  const height = Math.max(...frames.map(rows => rows.length));
  const width = Math.max(...frames.flatMap(rows => rows.map(row => row.length)));
  return frames.map(rows => {
    const padded = Array.from({ length: height }, (_, i) => (rows[i] ?? '').padEnd(width, ' '));
    return drawWeather(padded);
  });
}

const lowCloud = [
  '     ####',
  '    ######',
  '  #########',
  ' ###########',
  '#############',
  '#############',
  ' ###########',
];

const art = {
  sun: drawWeatherFrames([
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
  moon: drawWeatherFrames([
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
  partlyCloudy: drawWeatherFrames([
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
  cloud: drawWeatherFrames([
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
  fog: drawWeatherFrames([
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
  rain: drawWeatherFrames([
    [
      ...lowCloud,
      '',
      '   #  #  #',
      '  #  #  #',
      ' #  #  #',
      '',
      '',
    ],
    [
      ...lowCloud,
      '    #  #  #',
      '   #  #  #',
      '  #  #  #',
      '',
      '',
      '',
    ],
    [
      ...lowCloud,
      '',
      '',
      '   #  #  #',
      '  #  #  #',
      ' #  #  #',
      '',
    ],
  ]),
  snow: drawWeatherFrames([
    [
      ...lowCloud,
      '',
      '   #   #',
      '  ### ###',
      '   #   #',
      '',
      '',
    ],
    [
      ...lowCloud,
      '',
      '',
      '    #   #',
      '   ### ###',
      '    #   #',
      '',
    ],
    [
      ...lowCloud,
      '',
      '  #   #',
      ' ### ###',
      '  #   #',
      '',
      '',
    ],
    [
      ...lowCloud,
      '',
      '',
      '   #   #',
      '  ### ###',
      '   #   #',
      '',
    ],
  ]),
  storm: drawWeatherFrames([
    [
      ...lowCloud,
      '     ###',
      '    ###',
      '     ###',
      '      ##',
      '     ##',
      '     #',
    ],
    [
      ...lowCloud,
      '   #     #',
      '  #     #',
      '     ##',
      '    ##',
      '    #',
      '',
    ],
    [
      ...lowCloud,
      '',
      '   #   #',
      '  #   #',
      ' #   #',
      '',
      '',
    ],
    [
      ...lowCloud,
      '     ###',
      '    ###',
      '   # ### #',
      '  #   ##',
      '     ##',
      '     #',
    ],
  ]),
  drizzle: drawWeatherFrames([
    [
      ...lowCloud,
      '',
      '   #   #',
      '',
      '     #   #',
      '',
      '',
    ],
    [
      ...lowCloud,
      '',
      '',
      '   #   #',
      '',
      '     #   #',
      '',
    ],
    [
      ...lowCloud,
      '     #   #',
      '',
      '   #   #',
      '',
      '',
      '',
    ],
  ]),
};

const conditions = [
  [[0], 'Clear', 'sun'],
  [[1], 'Mostly clear', 'sun'],
  [[2], 'Partly cloudy', 'partlyCloudy'],
  [[3], 'Overcast', 'cloud'],
  [[45, 48], 'Fog', 'fog'],
  [[51, 53, 55], 'Drizzle', 'drizzle'],
  [[56, 57], 'Freezing drizzle', 'drizzle'],
  [[61, 63, 65], 'Rain', 'rain'],
  [[66, 67], 'Freezing rain', 'rain'],
  [[71, 73, 75, 77], 'Snow', 'snow'],
  [[80, 81, 82], 'Rain showers', 'rain'],
  [[85, 86], 'Snow showers', 'snow'],
  [[95, 97], 'Thunderstorm', 'storm'],
  [[96, 99], 'Thunderstorm with hail', 'storm'],
];

async function fetchData(endpoint, params, { fetcher = fetch, signal } = {}) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams(params).toString();
  const timeout = AbortSignal.timeout(10000);
  const response = await fetcher(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (!response.ok) throw new Error('Open-Meteo request failed');
  return response.json();
}

export async function searchCities(query, options) {
  const data = await fetchData('https://geocoding-api.open-meteo.com/v1/search', {
    name: query.trim(),
    count: 5,
  }, options);
  return (data.results ?? []).filter(city =>
    city.name && Number.isFinite(city.latitude) && Number.isFinite(city.longitude),
  ).map(({ name, admin1, country, latitude, longitude }) => ({
    name,
    label: [...new Set([name, admin1, country].filter(Boolean))].join(', '),
    latitude,
    longitude,
  }));
}

export async function getCurrentWeather({ latitude, longitude }, options) {
  const { current } = await fetchData('https://api.open-meteo.com/v1/forecast', {
    latitude,
    longitude,
    current: 'temperature_2m,weather_code,is_day',
  }, options);
  if (!Number.isFinite(current?.temperature_2m)) throw new Error('Temperature unavailable');

  const { weather_code: code, is_day: daylight } = current;
  const [, condition, illustration] = conditions.find(([codes]) => codes.includes(code))
    ?? [[], 'Conditions unavailable'];
  const clearAtNight = daylight === 0 && (code === 0 || code === 1);
  const frames = art[clearAtNight ? 'moon' : illustration] ?? [];
  return {
    temperature: Math.round(current.temperature_2m),
    condition,
    icon: frames[0] ?? '',
    frames,
  };
}
