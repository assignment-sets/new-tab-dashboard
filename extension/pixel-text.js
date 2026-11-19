// A 3×5 pixel font shared by the clock and the temperature.
const glyphs = {
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

export function drawPixelText(canvas, value, color) {
  const characters = [...value].map(character => glyphs[character]).filter(Boolean);
  canvas.width = Math.max(1, characters.reduce((width, rows) => width + rows[0].length + 1, -1));
  canvas.height = 5; // Resizing also clears the previous drawing.
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
