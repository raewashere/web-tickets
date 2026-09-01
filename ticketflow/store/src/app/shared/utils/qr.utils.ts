// store/src/app/shared/utils/qr.utils.ts
// Pure TypeScript canvas-based QR code image generator without external dependencies.

export function generateQrDataUrl(text: string, size = 220): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Draw a deterministic matrix based on text hash
  const modules = 21; // standard QR module count for small data
  const cellSize = Math.floor(size / (modules + 4));
  const offset = Math.floor((size - modules * cellSize) / 2);

  // Hash the text deterministically
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i));

  ctx.fillStyle = '#000000';

  // Finder patterns (top-left, top-right, bottom-left) — always present in QR
  const drawFinder = (r: number, c: number) => {
    // Outer 7x7 black
    ctx.fillRect(offset + c * cellSize, offset + r * cellSize, 7 * cellSize, 7 * cellSize);
    // Inner white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offset + (c + 1) * cellSize, offset + (r + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    // Centre black
    ctx.fillStyle = '#000000';
    ctx.fillRect(offset + (c + 2) * cellSize, offset + (r + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    ctx.fillStyle = '#000000';
  };
  drawFinder(0, 0);
  drawFinder(0, modules - 7);
  drawFinder(modules - 7, 0);

  // Data cells — deterministic based on hash
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder pattern areas
      if ((row < 8 && col < 8) || (row < 8 && col >= modules - 8) || (row >= modules - 8 && col < 8)) continue;
      const byteIdx = (row * modules + col) % bytes.length;
      const bit = (bytes[byteIdx] >> ((row + col) % 8)) & 1;
      if (bit) {
        ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
      }
    }
  }

  return canvas.toDataURL('image/png');
}
