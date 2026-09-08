// store/src/app/shared/utils/qr.utils.ts
// Generates a REAL, camera-scannable QR code using the `qrcode` library.

import QRCode from 'qrcode';

/**
 * Generates a proper QR code as a data URL (PNG).
 *
 * @param text   The content to encode (e.g. "TICKETFLOW-AUTH-<uuid>")
 * @param size   Width/height in pixels (default: 400 for high resolution)
 * @returns      Promise that resolves to a base64 PNG data URL
 */
export async function generateQrDataUrl(text: string, size = 400): Promise<string> {
  if (typeof document === 'undefined') return '';

  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 3, // Quiet zone — critical for camera readers
      errorCorrectionLevel: 'H', // 30% damage resistance
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR generation error:', err);
    return '';
  }
}

/**
 * Synchronous fallback (renders to a canvas element in the DOM).
 */
export function generateQrDataUrlSync(text: string, size = 400): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  try {
    QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 3,
      errorCorrectionLevel: 'H',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('QR sync generation error:', err);
    return '';
  }
}

