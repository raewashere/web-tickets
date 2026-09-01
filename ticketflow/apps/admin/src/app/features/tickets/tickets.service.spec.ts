import { TestBed } from '@angular/core/testing';
import { TicketsService } from './tickets.service';
import { SupabaseService } from '@ticketflow/data-access';

describe('TicketsService (Unit Logic)', () => {
  let service: TicketsService;

  beforeEach(() => {
    const mockSupabase = {
      client: {
        from: jest.fn(),
        rpc: jest.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        TicketsService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });

    service = TestBed.inject(TicketsService);
  });

  describe('calculateCommission', () => {
    it('should calculate 20% platform commission by default', () => {
      const result = service.calculateCommission(1000);
      expect(result.basePrice).toBe(1000);
      expect(result.commissionAmount).toBe(200);
      expect(result.netToArtist).toBe(800);
    });

    it('should calculate custom commission rate correctly', () => {
      const result = service.calculateCommission(500, 0.15); // 15%
      expect(result.basePrice).toBe(500);
      expect(result.commissionAmount).toBe(75);
      expect(result.netToArtist).toBe(425);
    });

    it('should handle zero price gracefully', () => {
      const result = service.calculateCommission(0);
      expect(result.basePrice).toBe(0);
      expect(result.commissionAmount).toBe(0);
      expect(result.netToArtist).toBe(0);
    });
  });

  describe('suggestSku', () => {
    it('should generate uppercase SKU with prefix from ticket name', () => {
      const sku = service.suggestSku('General Admission');
      expect(sku).toMatch(/^GENERA-\d{3}$/);
    });

    it('should fallback to TCK prefix when name has no alphanumeric chars', () => {
      const sku = service.suggestSku('$$$');
      expect(sku).toMatch(/^TCK-\d{3}$/);
    });
  });
});
