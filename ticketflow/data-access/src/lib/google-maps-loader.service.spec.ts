import { TestBed } from '@angular/core/testing';
import { GoogleMapsLoaderService } from './google-maps-loader.service';

describe('GoogleMapsLoaderService', () => {
  let service: GoogleMapsLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GoogleMapsLoaderService],
    });
    service = TestBed.inject(GoogleMapsLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isLoaded()).toBe(false);
  });

  it('should allow setting custom API key', () => {
    service.setCustomApiKey('TEST_API_KEY');
    expect(service.getApiKey()).toBe('TEST_API_KEY');
  });

  it('should return null when geocoding empty address', async () => {
    const res = await service.geocodeAddress('');
    expect(res).toBeNull();
  });
});
