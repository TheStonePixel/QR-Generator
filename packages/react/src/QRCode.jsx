import React, { useMemo } from 'react';
import { generate } from '@stone-pixel/qr-core/src/qr-core.js';
import { toStyledSVG } from '@stone-pixel/qr-core/src/qr-styled.js';

/**
 * React QR Code component with full styling customization.
 *
 * @param {object} props
 * @param {string} props.value - Text/URL to encode
 * @param {string} [props.ecLevel='M'] - Error correction: 'L', 'M', 'Q', 'H'
 * @param {number} [props.margin=4] - Quiet zone in modules
 * @param {string} [props.dotShape='square'] - Dot style: square, rounded, dots, diamond, star, heart
 * @param {string} [props.cornerSquareShape='square'] - Corner border: square, rounded, circle, extraRounded
 * @param {string} [props.cornerDotShape='square'] - Corner center: square, rounded, circle, diamond, star
 * @param {string} [props.dotColor='#000000'] - Dot color
 * @param {string} [props.cornerSquareColor] - Corner border color (defaults to dotColor)
 * @param {string} [props.cornerDotColor] - Corner center color (defaults to cornerSquareColor)
 * @param {string} [props.backgroundColor='#ffffff'] - Background color
 * @param {string} [props.gradientType] - 'linear' or 'radial'
 * @param {string[]} [props.gradientColors] - [startColor, endColor]
 * @param {number} [props.gradientRotation=0] - Gradient angle in degrees
 * @param {string} [props.centerImage] - URL or data URL for center logo
 * @param {number} [props.centerImageSize=0.25] - Logo size as fraction of QR
 * @param {number} [props.centerImageMargin=4] - Margin around logo
 * @param {string} [props.className] - CSS class
 * @param {object} [props.style] - Inline styles
 */
function QRCode({
  value,
  ecLevel = 'M',
  margin = 4,
  dotShape = 'square',
  cornerSquareShape = 'square',
  cornerDotShape = 'square',
  dotColor = '#000000',
  cornerSquareColor = null,
  cornerDotColor = null,
  backgroundColor = '#ffffff',
  gradientType = null,
  gradientColors = null,
  gradientRotation = 0,
  centerImage = null,
  centerImageSize = 0.25,
  centerImageMargin = 4,
  className = '',
  style = {},
}) {
  const svgString = useMemo(() => {
    if (!value) return '';

    try {
      const ec = centerImage ? 'H' : ecLevel;
      const qr = generate(value, { ecLevel: ec });

      return toStyledSVG(qr, {
        margin,
        dotShape,
        cornerSquareShape,
        cornerDotShape,
        dotColor,
        cornerSquareColor,
        cornerDotColor,
        backgroundColor,
        gradientType,
        gradientColors,
        gradientRotation,
        centerImage,
        centerImageSize,
        centerImageMargin,
      });
    } catch (err) {
      console.error('QR Code generation error:', err);
      return '';
    }
  }, [
    value, ecLevel, margin,
    dotShape, cornerSquareShape, cornerDotShape,
    dotColor, cornerSquareColor, cornerDotColor,
    backgroundColor,
    gradientType, gradientColors, gradientRotation,
    centerImage, centerImageSize, centerImageMargin,
  ]);

  if (!svgString) return null;

  return (
    <div
      className={className}
      style={{ display: 'inline-block', lineHeight: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}

export default QRCode;
export { QRCode };
