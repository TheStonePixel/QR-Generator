# QR Code Generator

A **free, open-source, zero-dependency** QR code generator with a live customization UI. No sign-up, no expiration, no limits.

Built from scratch — the QR encoding engine is pure vanilla JavaScript with zero npm dependencies. Includes ready-to-use Vue 3 and React components.

## Features

- **Zero dependencies** — Pure JS QR encoder implementing the full QR Code Model 2 spec (ISO/IEC 18004)
- **Live customization UI** — Interactive page to design QR codes in real time
- **Dot styles** — Square, rounded, circle, diamond, star, heart
- **Corner styles** — Customize the finder pattern borders and centers independently
- **Color control** — Set colors for dots, corners, and background individually
- **Gradients** — Linear and radial gradient support with rotation control
- **Center image/logo** — Upload a logo to embed in the center (auto-switches to H error correction)
- **Export** — Download as SVG or PNG, copy to clipboard
- **Framework components** — Drop-in Vue 3 and React components with all styling props
- **Error correction** — L (7%), M (15%), Q (25%), H (30%)

## Quick Start — Demo Page

Open `demo/index.html` in any browser. No build step needed.

```bash
# Just open the file directly
open demo/index.html

# Or serve it locally
npx serve .
```

## Vanilla JS Usage

```js
import { generate } from './packages/core/src/qr-core.js';
import { toStyledSVG } from './packages/core/src/qr-styled.js';

// Generate QR data
const qr = generate('https://example.com', { ecLevel: 'M' });

// Render as styled SVG
const svg = toStyledSVG(qr, {
  dotShape: 'dots',           // square | rounded | dots | diamond | star | heart
  cornerSquareShape: 'rounded', // square | rounded | circle | extraRounded
  cornerDotShape: 'circle',     // square | rounded | circle | diamond | star
  dotColor: '#6c5ce7',
  cornerSquareColor: '#2d3436',
  cornerDotColor: '#2d3436',
  backgroundColor: '#ffffff',
  margin: 4,
});

document.getElementById('qr').innerHTML = svg;

// Or use the basic renderer
const basicSvg = qr.toSVG({ foreground: '#000', background: '#fff' });
const dataUrl = qr.toDataURL({ scale: 8 });
```

## React Usage

```jsx
import QRCode from '@stone-pixel/qr-react';

function App() {
  return (
    <QRCode
      value="https://example.com"
      ecLevel="M"
      dotShape="dots"
      cornerSquareShape="rounded"
      cornerDotShape="circle"
      dotColor="#6c5ce7"
      backgroundColor="#ffffff"
      centerImage="/logo.png"
      centerImageSize={0.25}
    />
  );
}
```

### React Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | *required* | Text or URL to encode |
| `ecLevel` | `string` | `'M'` | Error correction: `L`, `M`, `Q`, `H` |
| `margin` | `number` | `4` | Quiet zone modules |
| `dotShape` | `string` | `'square'` | `square`, `rounded`, `dots`, `diamond`, `star`, `heart` |
| `cornerSquareShape` | `string` | `'square'` | `square`, `rounded`, `circle`, `extraRounded` |
| `cornerDotShape` | `string` | `'square'` | `square`, `rounded`, `circle`, `diamond`, `star` |
| `dotColor` | `string` | `'#000000'` | Dot fill color |
| `cornerSquareColor` | `string` | `null` | Corner border color (falls back to dotColor) |
| `cornerDotColor` | `string` | `null` | Corner center color (falls back to cornerSquareColor) |
| `backgroundColor` | `string` | `'#ffffff'` | Background color |
| `gradientType` | `string` | `null` | `'linear'` or `'radial'` |
| `gradientColors` | `string[]` | `null` | `[startColor, endColor]` |
| `gradientRotation` | `number` | `0` | Gradient angle (degrees, linear only) |
| `centerImage` | `string` | `null` | URL or data URL for center logo |
| `centerImageSize` | `number` | `0.25` | Logo size as fraction of QR |
| `centerImageMargin` | `number` | `4` | Padding around logo |

## Vue 3 Usage

```vue
<template>
  <QRCode
    value="https://example.com"
    dot-shape="rounded"
    corner-square-shape="rounded"
    corner-dot-shape="circle"
    dot-color="#2d3436"
    :center-image="logoUrl"
    :center-image-size="0.25"
  />
</template>

<script setup>
import QRCode from '@stone-pixel/qr-vue';

const logoUrl = '/logo.png';
</script>
```

The Vue component accepts the same props as React (using kebab-case per Vue convention).

## Project Structure

```
QR-Generator/
├── demo/
│   └── index.html          # Interactive customization page
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── qr-core.js   # QR encoding engine (zero deps)
│   │       └── qr-styled.js # Styled SVG renderer
│   ├── vue/
│   │   └── src/
│   │       └── QRCode.vue   # Vue 3 component
│   └── react/
│       └── src/
│           └── QRCode.jsx   # React component
├── LICENSE                  # Apache 2.0
└── README.md
```

## How It Works

The core engine implements the full QR Code specification:

1. **Data analysis** — Detects optimal encoding mode (numeric, alphanumeric, byte)
2. **Version selection** — Picks the smallest QR version that fits the data
3. **Data encoding** — Encodes data with mode indicators and padding
4. **Error correction** — Reed-Solomon error correction using GF(2^8) arithmetic
5. **Matrix construction** — Places finder patterns, alignment patterns, timing patterns
6. **Data placement** — Fills the matrix with encoded data in the zigzag pattern
7. **Masking** — Evaluates all 8 mask patterns, picks the one with lowest penalty score
8. **Rendering** — Generates styled SVG with customizable shapes, colors, and gradients

## License

Apache 2.0 — Use it however you want. Free forever.
