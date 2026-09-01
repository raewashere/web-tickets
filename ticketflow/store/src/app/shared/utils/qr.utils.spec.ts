import { generateQrDataUrl } from './qr.utils';

describe('qr.utils', () => {
  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: jest.fn(),
    } as unknown as CanvasRenderingContext2D);

    jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACXLiNBAAAABlBMVEUAAAD///+l2Z/dAAAACXBIWXMA';
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate a valid data URL containing image/png', () => {
    const url = generateQrDataUrl('TICKETFLOW-AUTH-12345', 220);
    expect(url).toBeTruthy();
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('should call canvas context drawing methods when generating QR', () => {
    const fillRectSpy = jest.fn();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: fillRectSpy,
    } as unknown as CanvasRenderingContext2D);

    generateQrDataUrl('TICKETFLOW-ORDER-XYZ', 200);
    expect(fillRectSpy).toHaveBeenCalled();
  });

  it('should return empty string when canvas 2D context is unavailable', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const res = generateQrDataUrl('TEST');
    expect(res).toBe('');
  });
});
