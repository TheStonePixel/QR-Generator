/**
 * @stone-pixel/qr-styled
 * Styled QR code renderer with customizable dots, corners, colors, and center images.
 * Works with the qr-core generator.
 */

// ---------------------------------------------------------------------------
// Dot shape renderers — each returns an SVG path fragment
// ---------------------------------------------------------------------------

const DOT_SHAPES = {
  square(cx, cy, size) {
    return `M${cx},${cy}h${size}v${size}h${-size}z`;
  },
  rounded(cx, cy, size) {
    const r = size * 0.3;
    return `M${cx + r},${cy}`
      + `h${size - 2 * r}`
      + `a${r},${r} 0 0 1 ${r},${r}`
      + `v${size - 2 * r}`
      + `a${r},${r} 0 0 1 ${-r},${r}`
      + `h${-(size - 2 * r)}`
      + `a${r},${r} 0 0 1 ${-r},${-r}`
      + `v${-(size - 2 * r)}`
      + `a${r},${r} 0 0 1 ${r},${-r}z`;
  },
  dots(cx, cy, size) {
    const r = size / 2;
    const centerX = cx + r;
    const centerY = cy + r;
    return `M${centerX},${centerY - r}`
      + `a${r},${r} 0 1 1 0,${size}`
      + `a${r},${r} 0 1 1 0,${-size}z`;
  },
  diamond(cx, cy, size) {
    const half = size / 2;
    const centerX = cx + half;
    const centerY = cy + half;
    return `M${centerX},${centerY - half}`
      + `L${centerX + half},${centerY}`
      + `L${centerX},${centerY + half}`
      + `L${centerX - half},${centerY}z`;
  },
  star(cx, cy, size) {
    const centerX = cx + size / 2;
    const centerY = cy + size / 2;
    const outer = size / 2;
    const inner = size / 4.5;
    let d = '';
    for (let i = 0; i < 5; i++) {
      const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI / 5);
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = centerX + outer * Math.cos(outerAngle);
      const oy = centerY - outer * Math.sin(outerAngle);
      const ix = centerX + inner * Math.cos(innerAngle);
      const iy = centerY - inner * Math.sin(innerAngle);
      if (i === 0) d += `M${ox},${oy}`;
      else d += `L${ox},${oy}`;
      d += `L${ix},${iy}`;
    }
    return d + 'z';
  },
  heart(cx, cy, size) {
    const s = size;
    const x = cx;
    const y = cy + s * 0.15;
    return `M${x + s / 2},${y + s * 0.85}`
      + `C${x + s * 0.15},${y + s * 0.55} ${x},${y + s * 0.25} ${x + s * 0.15},${y + s * 0.1}`
      + `C${x + s * 0.3},${y - s * 0.05} ${x + s / 2},${y + s * 0.05} ${x + s / 2},${y + s * 0.25}`
      + `C${x + s / 2},${y + s * 0.05} ${x + s * 0.7},${y - s * 0.05} ${x + s * 0.85},${y + s * 0.1}`
      + `C${x + s},${y + s * 0.25} ${x + s * 0.85},${y + s * 0.55} ${x + s / 2},${y + s * 0.85}z`;
  },
};

// ---------------------------------------------------------------------------
// Corner square (finder outer) shape renderers
// ---------------------------------------------------------------------------

const CORNER_SQUARE_SHAPES = {
  square(x, y, size) {
    const outer = size;
    const inner = size - 2;
    return `M${x},${y}h${outer}v${outer}h${-outer}z`
      + `M${x + 1},${y + 1}h${inner}v${inner}h${-inner}z`;
  },
  rounded(x, y, size) {
    const r = size * 0.2;
    const ri = (size - 2) * 0.15;
    return `M${x + r},${y}`
      + `h${size - 2 * r}a${r},${r} 0 0 1 ${r},${r}`
      + `v${size - 2 * r}a${r},${r} 0 0 1 ${-r},${r}`
      + `h${-(size - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}`
      + `v${-(size - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}z`
      + `M${x + 1 + ri},${y + 1}`
      + `h${size - 2 - 2 * ri}a${ri},${ri} 0 0 1 ${ri},${ri}`
      + `v${size - 2 - 2 * ri}a${ri},${ri} 0 0 1 ${-ri},${ri}`
      + `h${-(size - 2 - 2 * ri)}a${ri},${ri} 0 0 1 ${-ri},${-ri}`
      + `v${-(size - 2 - 2 * ri)}a${ri},${ri} 0 0 1 ${ri},${-ri}z`;
  },
  circle(x, y, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const outerR = size / 2;
    const innerR = (size - 2) / 2;
    return `M${cx - outerR},${cy}a${outerR},${outerR} 0 1 1 ${size},0a${outerR},${outerR} 0 1 1 ${-size},0z`
      + `M${cx - innerR},${cy}a${innerR},${innerR} 0 1 0 ${size - 2},0a${innerR},${innerR} 0 1 0 ${-(size - 2)},0z`;
  },
  extraRounded(x, y, size) {
    const r = size * 0.4;
    const ri = (size - 2) * 0.35;
    return `M${x + r},${y}`
      + `h${size - 2 * r}a${r},${r} 0 0 1 ${r},${r}`
      + `v${size - 2 * r}a${r},${r} 0 0 1 ${-r},${r}`
      + `h${-(size - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}`
      + `v${-(size - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}z`
      + `M${x + 1 + ri},${y + 1}`
      + `h${size - 2 - 2 * ri}a${ri},${ri} 0 0 1 ${ri},${ri}`
      + `v${size - 2 - 2 * ri}a${ri},${ri} 0 0 1 ${-ri},${ri}`
      + `h${-(size - 2 - 2 * ri)}a${ri},${ri} 0 0 1 ${-ri},${-ri}`
      + `v${-(size - 2 - 2 * ri)}a${ri},${ri} 0 0 1 ${ri},${-ri}z`;
  },
};

// ---------------------------------------------------------------------------
// Corner dot (finder inner) shape renderers
// ---------------------------------------------------------------------------

const CORNER_DOT_SHAPES = {
  square(x, y, size) {
    return `M${x},${y}h${size}v${size}h${-size}z`;
  },
  rounded(x, y, size) {
    const r = size * 0.3;
    return `M${x + r},${y}`
      + `h${size - 2 * r}a${r},${r} 0 0 1 ${r},${r}`
      + `v${size - 2 * r}a${r},${r} 0 0 1 ${-r},${r}`
      + `h${-(size - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}`
      + `v${-(size - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}z`;
  },
  circle(x, y, size) {
    const r = size / 2;
    const cx = x + r;
    const cy = y + r;
    return `M${cx - r},${cy}a${r},${r} 0 1 1 ${size},0a${r},${r} 0 1 1 ${-size},0z`;
  },
  diamond(x, y, size) {
    const half = size / 2;
    const cx = x + half;
    const cy = y + half;
    return `M${cx},${cy - half}L${cx + half},${cy}L${cx},${cy + half}L${cx - half},${cy}z`;
  },
  star(x, y, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const outer = size / 2;
    const inner = size / 4;
    let d = '';
    for (let i = 0; i < 5; i++) {
      const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI / 5);
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = cx + outer * Math.cos(outerAngle);
      const oy = cy - outer * Math.sin(outerAngle);
      const ix = cx + inner * Math.cos(innerAngle);
      const iy = cy - inner * Math.sin(innerAngle);
      if (i === 0) d += `M${ox},${oy}`;
      else d += `L${ox},${oy}`;
      d += `L${ix},${iy}`;
    }
    return d + 'z';
  },
};

// ---------------------------------------------------------------------------
// Styled SVG renderer
// ---------------------------------------------------------------------------

function isDarkModule(matrix, row, col) {
  const v = matrix[row][col];
  return v === 1 || v === 3;
}

function isFinderRegion(row, col, size) {
  // Top-left finder: rows 0-6, cols 0-6
  if (row <= 6 && col <= 6) return true;
  // Top-right finder: rows 0-6, cols (size-7) to (size-1)
  if (row <= 6 && col >= size - 7) return true;
  // Bottom-left finder: rows (size-7) to (size-1), cols 0-6
  if (row >= size - 7 && col <= 6) return true;
  return false;
}

function getFinderPatternCoords(qrSize) {
  return [
    { row: 0, col: 0 },                     // top-left
    { row: 0, col: qrSize - 7 },            // top-right
    { row: qrSize - 7, col: 0 },            // bottom-left
  ];
}

/**
 * Render a styled QR code as an SVG string.
 *
 * @param {object} qr - QR code object from generate()
 * @param {object} options - Styling options
 * @returns {string} SVG markup
 */
function toStyledSVG(qr, options = {}) {
  const {
    margin = 4,
    moduleSize = 1,
    dotShape = 'square',
    cornerSquareShape = 'square',
    cornerDotShape = 'square',
    dotColor = '#000000',
    cornerSquareColor = null,
    cornerDotColor = null,
    backgroundColor = '#ffffff',
    gradientType = null,       // 'linear' or 'radial'
    gradientColors = null,     // [startColor, endColor]
    gradientRotation = 0,      // degrees, for linear gradient
    centerImage = null,        // data URL or URL string
    centerImageSize = 0.25,    // fraction of QR code size
    centerImageMargin = 4,     // px margin around center image
  } = options;

  const size = qr.size;
  const totalSize = (size + margin * 2) * moduleSize;

  const dotRenderer = DOT_SHAPES[dotShape] || DOT_SHAPES.square;
  const cornerSquareRenderer = CORNER_SQUARE_SHAPES[cornerSquareShape] || CORNER_SQUARE_SHAPES.square;
  const cornerDotRenderer = CORNER_DOT_SHAPES[cornerDotShape] || CORNER_DOT_SHAPES.square;

  const actualCornerSquareColor = cornerSquareColor || dotColor;
  const actualCornerDotColor = cornerDotColor || actualCornerSquareColor;

  let defs = '';
  let dotFill = dotColor;

  // Gradient support
  if (gradientType && gradientColors && gradientColors.length >= 2) {
    const gradId = 'qr-gradient';
    if (gradientType === 'linear') {
      const rad = (gradientRotation * Math.PI) / 180;
      const x1 = 50 - Math.cos(rad) * 50;
      const y1 = 50 - Math.sin(rad) * 50;
      const x2 = 50 + Math.cos(rad) * 50;
      const y2 = 50 + Math.sin(rad) * 50;
      defs += `<linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`
        + `<stop offset="0%" stop-color="${gradientColors[0]}"/>`
        + `<stop offset="100%" stop-color="${gradientColors[1]}"/>`
        + `</linearGradient>`;
    } else {
      defs += `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%">`
        + `<stop offset="0%" stop-color="${gradientColors[0]}"/>`
        + `<stop offset="100%" stop-color="${gradientColors[1]}"/>`
        + `</radialGradient>`;
    }
    dotFill = `url(#${gradId})`;
  }

  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" `
    + `xmlns:xlink="http://www.w3.org/1999/xlink" `
    + `viewBox="0 0 ${totalSize} ${totalSize}" `
    + `width="${totalSize * 4}" height="${totalSize * 4}" `
    + `shape-rendering="geometricPrecision">`;

  if (defs) svg += `<defs>${defs}</defs>`;

  // Background
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="${backgroundColor}"/>`;

  // Data dots (excluding finder pattern regions)
  let dotsPath = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFinderRegion(r, c, size)) continue;
      if (!isDarkModule(qr.matrix, r, c)) continue;

      const x = (c + margin) * moduleSize;
      const y = (r + margin) * moduleSize;
      dotsPath += dotRenderer(x, y, moduleSize);
    }
  }
  svg += `<path d="${dotsPath}" fill="${dotFill}"/>`;

  // Finder patterns (corners)
  const finders = getFinderPatternCoords(size);
  for (const finder of finders) {
    const fx = (finder.col + margin) * moduleSize;
    const fy = (finder.row + margin) * moduleSize;

    // Outer square (7x7)
    const outerPath = cornerSquareRenderer(fx, fy, 7 * moduleSize);
    svg += `<path d="${outerPath}" fill="${actualCornerSquareColor}" fill-rule="evenodd"/>`;

    // Inner dot (3x3 centered)
    const innerX = fx + 2 * moduleSize;
    const innerY = fy + 2 * moduleSize;
    const innerPath = cornerDotRenderer(innerX, innerY, 3 * moduleSize);
    svg += `<path d="${innerPath}" fill="${actualCornerDotColor}"/>`;
  }

  // Center image
  if (centerImage) {
    const imgSize = size * moduleSize * centerImageSize;
    const imgX = (totalSize - imgSize) / 2;
    const imgY = (totalSize - imgSize) / 2;

    // White background behind image
    const bgPad = centerImageMargin * moduleSize * 0.25;
    svg += `<rect x="${imgX - bgPad}" y="${imgY - bgPad}" `
      + `width="${imgSize + bgPad * 2}" height="${imgSize + bgPad * 2}" `
      + `rx="${bgPad}" fill="${backgroundColor}"/>`;

    svg += `<image x="${imgX}" y="${imgY}" `
      + `width="${imgSize}" height="${imgSize}" `
      + `href="${centerImage}" preserveAspectRatio="xMidYMid slice"/>`;
  }

  svg += `</svg>`;
  return svg;
}

export { toStyledSVG, DOT_SHAPES, CORNER_SQUARE_SHAPES, CORNER_DOT_SHAPES };
export default toStyledSVG;
